import type { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { ZodError } from "zod";
import { config, isOriginAllowed } from "./config.js";

/**
 * Mount baseline security middleware. Order matters: helmet first (headers on
 * every response, including errors), then CORS (so preflights see the headers),
 * then rate limits, then route handlers, and finally the error handler.
 */
export function applySecurity(app: Express): void {
  // trust proxy: required for accurate req.ip behind a load balancer, and for
  // express-rate-limit / secure cookies to work correctly.
  if (config.trustProxy > 0) {
    app.set("trust proxy", config.trustProxy);
  }

  // helmet — sensible defaults. We disable CSP here because this server only
  // serves JSON and a Socket.IO upgrade; CSP belongs on the web app's headers.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );

  // CORS — explicit allowlist driven by config.
  app.use(
    cors({
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin ${origin ?? "(none)"} is not allowed by CORS policy`));
      },
      credentials: true,
      maxAge: 86_400
    })
  );

  // Standard tier: every request. Generous to avoid breaking the polling fallback
  // for socket.io. Specific tiers below clamp expensive routes harder.
  const globalLimiter = rateLimit({
    windowMs: 60_000,
    limit: config.isProd ? 240 : 1_000,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // Health checks shouldn't burn the rate budget.
    skip: (req) => req.path === "/health"
  });
  app.use(globalLimiter);
}

/**
 * Per-route limiters — mount onto specific endpoints rather than globally so
 * cheap routes aren't penalized for expensive neighbors.
 */
export const limiters = {
  // Real Docker work happens here. Strict.
  submissions: rateLimit({
    windowMs: 60_000,
    limit: config.isProd ? 10 : 60,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: keyByUserOrIp
  }),
  // Hits upstream AI provider — costs money + token budget.
  ai: rateLimit({
    windowMs: 5 * 60_000,
    limit: config.isProd ? 30 : 200,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: keyByUserOrIp
  }),
  // Hits the (free) LeetCode mirror — be polite.
  upstream: rateLimit({
    windowMs: 5 * 60_000,
    limit: config.isProd ? 60 : 300,
    standardHeaders: "draft-7",
    legacyHeaders: false
  }),
  // Auth-ish surfaces (room creation, MCP invocation) — moderate.
  write: rateLimit({
    windowMs: 60_000,
    limit: config.isProd ? 60 : 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: keyByUserOrIp
  })
} as const;

/**
 * If an authenticated user header is present, key by user; otherwise by IP.
 * Defends against shared NATs without exposing rate-limit state to anonymity.
 *
 * Note: this server doesn't yet propagate the NextAuth session — when it does,
 * read it here instead of the x-user-id hint.
 */
function keyByUserOrIp(req: Request) {
  const userId = req.header("x-user-id")?.trim();
  if (userId) return `u:${userId}`;
  return ipKeyGenerator(req.ip ?? "unknown");
}

/**
 * Centralized error handler. Mount last with `app.use(errorHandler)`.
 *
 * - ZodError → 400 with a stable shape so the client can highlight fields.
 * - SyntaxError (body-parser) → 400.
 * - CORS rejections → 403 (helmet/cors throws sync; this catches the async path).
 * - Anything else → 500 with a sanitized message in production.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Invalid request",
      issues: err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
        code: i.code
      }))
    });
    return;
  }

  if (err instanceof SyntaxError && "body" in (err as object)) {
    res.status(400).json({ error: "Malformed JSON body" });
    return;
  }

  if (err instanceof Error && /CORS/i.test(err.message)) {
    res.status(403).json({ error: err.message });
    return;
  }

  // Unknown — log server-side, return sanitized message client-side.
  const message = err instanceof Error ? err.message : "Internal server error";
  if (!config.isProd) {
    // eslint-disable-next-line no-console
    console.error(`[api] ${req.method} ${req.path} →`, err);
  } else {
    // eslint-disable-next-line no-console
    console.error(`[api] ${req.method} ${req.path} → ${message}`);
  }
  res.status(500).json({ error: config.isProd ? "Internal server error" : message });
}

/**
 * Helper that wraps an async route handler so thrown errors propagate to
 * the central error handler instead of crashing Node.
 *
 * Usage: app.post("/route", asyncRoute(async (req, res) => { ... }));
 */
export function asyncRoute<R extends Request = Request, S extends Response = Response>(
  handler: (req: R, res: S, next: NextFunction) => Promise<unknown>
) {
  return (req: R, res: S, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}
