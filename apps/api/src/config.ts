import { z } from "zod";

/**
 * Parse and validate process.env once at boot. Anything that should be required
 * in production but tolerable in development belongs here — fail fast on misconfig.
 */

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  DATABASE_URL: z.string().url().optional(),

  // CORS — comma-separated origin allowlist. Wildcard "*" is rejected in prod.
  CORS_ORIGINS: z.string().optional(),

  // Set when behind a reverse proxy / load balancer (Vercel, Fly, Render, Nginx).
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),

  MCP_HTTP_URL: z.string().url().optional(),
  MCP_HTTP_PORT: z.coerce.number().int().positive().default(5050),

  OPENROUTER_API_KEY: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  OPENROUTER_SITE_URL: z.string().optional(),
  OPENROUTER_SITE_NAME: z.string().optional()
});

type RawEnv = z.infer<typeof envSchema>;

function parseEnv(): RawEnv {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}

const env = parseEnv();

const defaultDevOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

function resolveOrigins(): string[] {
  const raw = env.CORS_ORIGINS?.trim();
  if (!raw) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "CORS_ORIGINS must be set in production. Provide a comma-separated allowlist (e.g. CORS_ORIGINS=https://app.example.com)."
      );
    }
    return defaultDevOrigins;
  }
  const origins = raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (env.NODE_ENV === "production" && origins.includes("*")) {
    throw new Error('CORS_ORIGINS="*" is not allowed in production. List explicit origins.');
  }
  return origins;
}

const corsOrigins = resolveOrigins();

export const config = {
  nodeEnv: env.NODE_ENV,
  isProd: env.NODE_ENV === "production",
  port: env.API_PORT,
  redisUrl: env.REDIS_URL,
  databaseUrl: env.DATABASE_URL,
  corsOrigins,
  trustProxy: env.TRUST_PROXY,
  mcp: {
    url: env.MCP_HTTP_URL ?? `http://localhost:${env.MCP_HTTP_PORT}`
  },
  ai: {
    apiKey: env.OPENROUTER_API_KEY ?? env.AI_API_KEY,
    baseUrl: env.AI_BASE_URL ?? "https://openrouter.ai/api/v1",
    model: env.OPENROUTER_MODEL ?? "openrouter/auto",
    siteUrl: env.OPENROUTER_SITE_URL,
    siteName: env.OPENROUTER_SITE_NAME
  }
} as const;

/**
 * Returns true if `origin` should be allowed by CORS. Both HTTP middleware and
 * Socket.IO use this so the policy is consistent.
 *
 * - Wildcard "*" allows anything (dev only — enforced by resolveOrigins).
 * - "null" / undefined origins are allowed only in non-production so server-to-server
 *   tools (curl, Postman) keep working locally.
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return !config.isProd;
  if (corsOrigins.includes("*")) return true;
  return corsOrigins.includes(origin);
}
