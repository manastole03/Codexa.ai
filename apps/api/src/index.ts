import "dotenv/config";
import http from "node:http";
import express from "express";
import { Queue, QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { Server } from "socket.io";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { z } from "zod";
import { getProblem, listProblems, supportedLanguages } from "@codexa/problems";
import { prisma } from "@codexa/db";
import {
  roomCreateSchema,
  submissionCreateSchema,
  type ActiveRoomUser,
  type BattleParticipant,
  type BattleParticipantStatus,
  type BattlePhase,
  type BattleState,
  type CollabFileMeta,
  type Language,
  type ProductKind,
  type Submission
} from "@codexa/types";
import { config, isOriginAllowed } from "./config.js";
import { applySecurity, asyncRoute, errorHandler, limiters } from "./security.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin ?? undefined)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin ?? "(none)"} not allowed by CORS policy`), false);
    },
    credentials: true
  },
  maxHttpBufferSize: 5e6
});

const redisConnection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
const submissionsQueue = new Queue("submissions", { connection: redisConnection });
const submissionsEvents = new QueueEvents("submissions", { connection: redisConnection });
const roomDocs = new Map<string, Y.Doc>();
const roomStates = new Map<
  string,
  {
    product: ProductKind;
    activeUsers: Map<string, ActiveRoomUser>;
    invitedEmails: Set<string>;
    selectedProblemSlug?: string;
    language: Language;
    excalidrawScene?: ExcalidrawScene;
    systemDesignScene?: SystemDesignScene;
    ended: boolean;
  }
>();

type RoomCollabState = {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  socketClients: Map<string, Set<number>>;
  persistTimer?: NodeJS.Timeout;
  hydrated: boolean;
};

const roomCollabStates = new Map<string, RoomCollabState>();

type RoomBattleState = {
  phase: BattlePhase;
  problemSlug?: string;
  durationMs: number;
  startedAt?: number;
  endsAt?: number;
  countdownEndsAt?: number;
  hostSocketId?: string;
  revealCode: boolean;
  participants: Map<string, BattleParticipant>;
  excluded: Set<string>;
  tickInterval?: NodeJS.Timeout;
  endTimeout?: NodeJS.Timeout;
  countdownTimeout?: NodeJS.Timeout;
};

const roomBattles = new Map<string, RoomBattleState>();
const DEFAULT_BATTLE_DURATION_MS = 30 * 60 * 1000;
const COUNTDOWN_MS = 3000;

const PRISMA_LANGUAGE_TO_TYPES: Record<string, Language> = {
  JAVASCRIPT: "javascript",
  TYPESCRIPT: "typescript",
  PYTHON: "python",
  CPP: "cpp",
  JAVA: "java",
  GO: "go",
  RUST: "rust",
  CSHARP: "csharp",
  RUBY: "ruby",
  PHP: "php",
  SWIFT: "swift",
  KOTLIN: "kotlin",
  DART: "dart"
};

function languageToPrisma(language: Language): string {
  return language.toUpperCase();
}

function languageFromPrisma(value: string): Language {
  return PRISMA_LANGUAGE_TO_TYPES[value] ?? "javascript";
}

/**
 * Map a wire-format ProductKind (kebab-case) to the Prisma enum value
 * (SCREAMING_SNAKE_CASE). The straight .toUpperCase() that the older code used
 * silently produced "SYSTEM-DESIGN" which Prisma rejected.
 */
function productToPrisma(product: ProductKind): string {
  return product.toUpperCase().replace(/-/g, "_");
}

type ExcalidrawScene = {
  elements: unknown[];
  files?: Record<string, unknown>;
};

type SystemDesignScene = {
  nodes: unknown[];
  edges: unknown[];
  templateId?: string;
  templateName?: string;
  workload?: unknown;
  simulationRunning?: boolean;
  chaosEvents?: unknown[];
  notes?: string;
  challenge?: unknown;
  updatedAt?: number;
};

type McpToolCall = {
  name: string;
  output: string;
};

const mcpChatSchema = z.object({
  message: z.string().min(1).max(4000),
  roomId: z.string().max(128).optional(),
  problemSlug: z.string().max(200).optional(),
  code: z.string().max(20_000).optional(),
  language: z.string().max(40).optional()
});

const mcpInvokeSchema = z.object({
  name: z.string().min(1).max(120),
  arguments: z.record(z.unknown()).optional()
});

const collabAiChatSchema = z.object({
  message: z.string().min(1).max(8000),
  roomId: z.string().max(128).optional(),
  currentFileId: z.string().max(128).optional(),
  fileName: z.string().max(255).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000)
      })
    )
    .max(20)
    .optional()
});

applySecurity(app);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    services: {
      products: ["collaborative", "arena", "system-design"],
      realtime: "socket.io+yjs",
      queue: "bullmq",
      executor: "dockerode"
    }
  });
});

app.get("/products", (_request, response) => {
  response.json({
    products: [
      {
        key: "collaborative",
        name: "Collaborative Platform",
        route: "/collaborative"
      },
      {
        key: "arena",
        name: "LeetCode Arena",
        route: "/arena"
      },
      {
        key: "system-design",
        name: "System Design",
        route: "/system-design"
      }
    ]
  });
});

app.post(
  "/rooms",
  limiters.write,
  asyncRoute(async (request, response) => {
    const input = roomCreateSchema.parse(request.body);
    const room = await prisma.room.create({
      data: {
        product: productToPrisma(input.product) as never,
        name: input.name,
        language: input.language.toUpperCase() as never,
        problemSlug: input.problemSlug
      }
    });
    response.status(201).json(room);
  })
);

app.post(
  "/collab/rooms",
  limiters.write,
  asyncRoute(async (request, response) => {
    const input = roomCreateSchema.parse({ ...request.body, product: "collaborative" });
    const room = await prisma.room.create({
      data: {
        product: "COLLABORATIVE",
        name: input.name,
        language: input.language.toUpperCase() as never
      }
    });
    response.status(201).json(room);
  })
);

app.get("/arena/languages", (_request, response) => {
  response.json({ languages: supportedLanguages });
});

app.get("/arena/problems", (request, response) => {
  response.json({
    problems: listProblems({
      difficulty: String(request.query.difficulty ?? ""),
      tag: String(request.query.tag ?? ""),
      query: String(request.query.query ?? "")
    })
  });
});

app.get("/arena/problems/:slug", (request, response) => {
  const problem = getProblem(request.params.slug);
  if (!problem) {
    response.status(404).json({ error: "Problem not found" });
    return;
  }
  response.json({ problem });
});

type LeetcodeListItem = {
  id: string;
  frontend_id: string;
  title: string;
  title_slug: string;
  url: string;
  difficulty: "Easy" | "Medium" | "Hard";
  paid_only: boolean;
  has_solution: boolean;
  has_video_solution: boolean;
};

type NormalizedLeetcodeProblem = {
  slug: string;
  frontendId: string;
  source: "leetcode";
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  tags: string[];
  summary: string;
  statement: string;
  constraints: string[];
  hints: string[];
  editorial: string;
  url: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  tests: Array<{ id: string; input: string; expected: string; hidden: boolean }>;
  starters: Record<string, string>;
  solutions: Record<string, string>;
};

const LEETCODE_API = "https://leetcode-api-pied.vercel.app";
const leetcodeListCache: { data: LeetcodeListItem[]; fetchedAt: number } = {
  data: [],
  fetchedAt: 0
};
const leetcodeDetailCache = new Map<string, { data: NormalizedLeetcodeProblem; fetchedAt: number }>();
const LEETCODE_LIST_TTL = 6 * 60 * 60 * 1000;
const LEETCODE_DETAIL_TTL = 24 * 60 * 60 * 1000;

function stripHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<\/li\s*>/gi, "\n")
    .replace(/<\/pre\s*>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<sup>(.*?)<\/sup>/gi, "^$1")
    .replace(/<sub>(.*?)<\/sub>/gi, "_$1")
    .replace(/<code>(.*?)<\/code>/gi, "`$1`")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractExamplesFromContent(content: string): Array<{ input: string; output: string; explanation?: string }> {
  if (!content) return [];
  const text = stripHtml(content);
  const examples: Array<{ input: string; output: string; explanation?: string }> = [];
  const exampleRegex = /Example\s*\d+\s*:?([\s\S]*?)(?=Example\s*\d+\s*:?|Constraints\s*:?|$)/gi;
  for (const match of text.matchAll(exampleRegex)) {
    const block = match[1] ?? "";
    const inputMatch = block.match(/Input\s*:?\s*([\s\S]*?)(?=Output\s*:|Explanation\s*:|$)/i);
    const outputMatch = block.match(/Output\s*:?\s*([\s\S]*?)(?=Explanation\s*:|Example\s*\d+|Constraints|$)/i);
    const explanationMatch = block.match(/Explanation\s*:?\s*([\s\S]*?)(?=Example\s*\d+|Constraints|$)/i);
    const input = inputMatch?.[1]?.trim() ?? "";
    const output = outputMatch?.[1]?.trim() ?? "";
    if (!input && !output) continue;
    const example: { input: string; output: string; explanation?: string } = { input, output };
    if (explanationMatch) example.explanation = explanationMatch[1]?.trim();
    examples.push(example);
  }
  return examples;
}

function extractConstraints(content: string): string[] {
  const text = stripHtml(content);
  const idx = text.search(/Constraints\s*:?/i);
  if (idx === -1) return [];
  const block = text.slice(idx).replace(/^Constraints\s*:?/i, "").trim();
  return block
    .split(/\n/)
    .map((line) => line.replace(/^[-•·]\s*/, "").trim())
    .filter((line) => line.length > 0 && line.length < 200)
    .slice(0, 8);
}

function extractStatement(content: string): string {
  const text = stripHtml(content);
  const idx = text.search(/Example\s*\d+\s*:?/i);
  return (idx === -1 ? text : text.slice(0, idx)).trim();
}

function leetcodeStarters(): Record<string, string> {
  return {
    javascript: `// Read input from stdin, write answer to stdout.
const input = require("fs").readFileSync("/dev/stdin", "utf8").trim();

function solve(raw) {
  // Parse \`raw\` and return the answer. Example: "nums = [2,7,11,15], target = 9"
  return "";
}

console.log(solve(input));`,
    typescript: `import { readFileSync } from "fs";
const input = readFileSync("/dev/stdin", "utf8").trim();

function solve(raw: string): string | number {
  return "";
}

console.log(solve(input));`,
    python: `import sys

def solve(raw: str):
    # Parse \`raw\` and return the answer
    return ""

print(solve(sys.stdin.read().strip()))`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    string line, all;
    while (getline(cin, line)) { all += line + "\\n"; }
    // Parse \`all\` and print the answer.
    return 0;
}`,
    java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) sb.append(line).append("\\n");
        String raw = sb.toString().trim();
        // Parse \`raw\` and print the answer.
    }
}`,
    go: `package main

import (
    "bufio"
    "fmt"
    "os"
    "strings"
)

func main() {
    reader := bufio.NewReader(os.Stdin)
    var sb strings.Builder
    for {
        line, err := reader.ReadString('\\n')
        sb.WriteString(line)
        if err != nil { break }
    }
    raw := strings.TrimSpace(sb.String())
    _ = raw
    fmt.Println("")
}`,
    rust: `use std::io::{self, Read};

fn main() {
    let mut raw = String::new();
    io::stdin().read_to_string(&mut raw).unwrap();
    let _ = raw.trim();
    println!("");
}`
  };
}

async function fetchLeetcodeList(): Promise<LeetcodeListItem[]> {
  const now = Date.now();
  if (leetcodeListCache.data.length > 0 && now - leetcodeListCache.fetchedAt < LEETCODE_LIST_TTL) {
    return leetcodeListCache.data;
  }
  const res = await fetch(`${LEETCODE_API}/problems`);
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  const data = (await res.json()) as LeetcodeListItem[];
  leetcodeListCache.data = data;
  leetcodeListCache.fetchedAt = now;
  return data;
}

async function fetchLeetcodeDetail(slug: string): Promise<NormalizedLeetcodeProblem | null> {
  const now = Date.now();
  const cached = leetcodeDetailCache.get(slug);
  if (cached && now - cached.fetchedAt < LEETCODE_DETAIL_TTL) return cached.data;
  const res = await fetch(`${LEETCODE_API}/problem/${encodeURIComponent(slug)}`);
  if (!res.ok) return null;
  const raw = (await res.json()) as {
    questionId?: string;
    questionFrontendId?: string;
    title?: string;
    titleSlug?: string;
    content?: string;
    difficulty?: string;
    hints?: string[];
    topicTags?: Array<{ name: string; slug?: string }>;
    similarQuestions?: string;
    url?: string;
  };

  const content = raw.content ?? "";
  const examples = extractExamplesFromContent(content);
  const constraints = extractConstraints(content);
  const statement = extractStatement(content);
  const difficulty = (raw.difficulty ?? "Medium").toUpperCase() as "EASY" | "MEDIUM" | "HARD";

  const normalized: NormalizedLeetcodeProblem = {
    slug,
    frontendId: raw.questionFrontendId ?? raw.questionId ?? slug,
    source: "leetcode",
    title: raw.title ?? slug,
    difficulty: difficulty === "EASY" || difficulty === "MEDIUM" || difficulty === "HARD" ? difficulty : "MEDIUM",
    tags: (raw.topicTags ?? []).map((t) => t.name).filter(Boolean),
    summary: statement.slice(0, 200).split("\n")[0] ?? "",
    statement,
    constraints,
    hints: raw.hints ?? [],
    editorial: "",
    url: raw.url ?? `https://leetcode.com/problems/${slug}/`,
    examples,
    tests: examples.map((ex, idx) => ({
      id: `example-${idx + 1}`,
      input: ex.input,
      expected: ex.output,
      hidden: false
    })),
    starters: leetcodeStarters(),
    solutions: {}
  };

  leetcodeDetailCache.set(slug, { data: normalized, fetchedAt: now });
  return normalized;
}

app.get("/arena/leetcode/problems", limiters.upstream, async (request, response) => {
  try {
    const list = await fetchLeetcodeList();
    const query = String(request.query.query ?? "").trim().toLowerCase();
    const difficulty = String(request.query.difficulty ?? "").trim();
    const filtered = list
      .filter((item) => !item.paid_only)
      .filter((item) => (difficulty ? item.difficulty.toUpperCase() === difficulty.toUpperCase() : true))
      .filter((item) => (query ? item.title.toLowerCase().includes(query) || item.title_slug.includes(query) : true));
    response.json({
      total: filtered.length,
      problems: filtered.slice(0, 200).map((item) => ({
        slug: item.title_slug,
        frontendId: item.frontend_id,
        title: item.title,
        difficulty: item.difficulty.toUpperCase(),
        url: item.url,
        hasSolution: item.has_solution
      }))
    });
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : "Failed to fetch LeetCode problems"
    });
  }
});

app.get("/arena/leetcode/problem/:slug", limiters.upstream, async (request, response) => {
  try {
    const slug = String(request.params.slug ?? "");
    const normalized = await fetchLeetcodeDetail(slug);
    if (!normalized) {
      response.status(404).json({ error: "Problem not found" });
      return;
    }
    response.json({ problem: normalized });
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : "Failed to fetch problem"
    });
  }
});

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && supportedLanguages.includes(value as Language);
}

function summarizeCode(code: string) {
  if (!code.trim()) return "No code attached.";
  const lines = code.split(/\r?\n/).length;
  return `${lines} lines, ${code.length} characters`;
}

app.post("/mcp/chat", limiters.ai, (request, response) => {
  const input = mcpChatSchema.parse(request.body);
  const message = input.message.trim();
  const roomId = input.roomId?.trim() ?? "";
  const problemSlug = input.problemSlug?.trim() ?? "";
  const code = input.code ?? "";
  const language: Language = isLanguage(input.language) ? input.language : "javascript";
  const problem = problemSlug ? getProblem(problemSlug) : undefined;
  const lowerMessage = message.toLowerCase();
  const toolCalls: McpToolCall[] = [];

  if (!problem) {
    const suggestions = listProblems().slice(0, 5);
    toolCalls.push({
      name: "list_problems",
      output: `${suggestions.length} room-ready problems: ${suggestions.map((item) => item.title).join(", ")}.`
    });
    response.json({
      reply: [
        "Attach a room problem for full MCP context.",
        "",
        ...suggestions.map((item) => `- ${item.title} (${item.difficulty}): ${item.summary}`)
      ].join("\n"),
      toolCalls,
      context: { roomId, problemSlug: undefined, language }
    });
    return;
  }

  toolCalls.push({
    name: "get_problem",
    output: `${problem.title} (${problem.difficulty}) has ${problem.examples.length} visible examples and ${problem.tests.length} tests.`
  });

  let reply: string;

  if (lowerMessage.includes("hint")) {
    toolCalls.push({
      name: "get_hints",
      output: `${problem.hints.length} progressive hints loaded.`
    });
    reply = [
      `Hints for ${problem.title}:`,
      "",
      ...problem.hints.map((hint, index) => `${index + 1}. ${hint}`)
    ].join("\n");
  } else if (lowerMessage.includes("edge") || lowerMessage.includes("test case") || lowerMessage.includes("cases")) {
    const visibleTests = problem.tests.filter((test) => !test.hidden).slice(0, 3);
    toolCalls.push({
      name: "get_test_context",
      output: `${visibleTests.length} public tests and ${problem.tests.filter((test) => test.hidden).length} hidden tests referenced.`
    });
    reply = [
      `Edge-case checklist for ${problem.title}:`,
      "",
      ...problem.constraints.slice(0, 4).map((constraint) => `- Constraint boundary: ${constraint}`),
      ...problem.examples.slice(0, 2).map((example) => `- Example shape: input ${example.input.replace(/\n/g, " | ")} -> ${example.output}`),
      ...visibleTests.map((test) => `- Public test ${test.id}: ${test.input.replace(/\n/g, " | ")} -> ${test.expected}`)
    ].join("\n");
  } else if (lowerMessage.includes("review") || lowerMessage.includes("bug") || lowerMessage.includes("fix") || lowerMessage.includes("validate") || lowerMessage.includes("run")) {
    toolCalls.push({
      name: "validate_solution_context",
      output: `${language} solution context attached; ${summarizeCode(code)}.`
    });
    reply = [
      `Code review context for ${problem.title}:`,
      "",
      `- Language: ${language}`,
      `- Code size: ${summarizeCode(code)}`,
      `- Expected input shape: ${problem.statement}`,
      `- Main correctness target: ${problem.summary}`,
      "- Compare output formatting exactly with the examples.",
      "- Re-check boundary constraints before submitting."
    ].join("\n");
  } else if (lowerMessage.includes("approach") || lowerMessage.includes("explain") || lowerMessage.includes("editorial") || lowerMessage.includes("solution")) {
    toolCalls.push({
      name: "get_editorial",
      output: problem.editorial
    });
    reply = [
      `${problem.title} approach:`,
      "",
      problem.editorial,
      "",
      `Problem target: ${problem.summary}`,
      `Constraints: ${problem.constraints.slice(0, 3).join("; ")}`
    ].join("\n");
  } else {
    toolCalls.push({
      name: "get_solution_context",
      output: `${language} starter ${problem.starters[language] ? "available" : "falls back to room code"}.`
    });
    reply = [
      `${problem.title} is active in this room.`,
      "",
      `Difficulty: ${problem.difficulty}`,
      `Tags: ${problem.tags.join(", ")}`,
      `Goal: ${problem.summary}`,
      "",
      "Ask for hints, approach, edge cases, or a code review."
    ].join("\n");
  }

  response.json({
    reply,
    toolCalls,
    context: {
      roomId,
      problemSlug: problem.slug,
      language,
      codeSummary: summarizeCode(code)
    }
  });
});

const mcpHttpUrl = config.mcp.url;

async function callMcp(method: string, params: Record<string, unknown> = {}) {
  const id = Math.floor(Math.random() * 1e9);
  const res = await fetch(mcpHttpUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream"
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params })
  });
  if (!res.ok) {
    throw new Error(`MCP ${method} failed: HTTP ${res.status}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  let payload: { result?: unknown; error?: { message: string } };
  if (contentType.includes("text/event-stream")) {
    const text = await res.text();
    const dataLine = text.split(/\r?\n/).find((line) => line.startsWith("data: "));
    if (!dataLine) throw new Error(`MCP ${method} returned empty SSE`);
    payload = JSON.parse(dataLine.slice(6));
  } else {
    payload = await res.json();
  }
  if (payload.error) throw new Error(payload.error.message);
  return payload.result;
}

app.get("/mcp/status", async (_request, response) => {
  try {
    const initResult = (await callMcp("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "codexa-api", version: "1.0.0" }
    })) as { serverInfo?: { name?: string; version?: string }; protocolVersion?: string };
    response.json({
      online: true,
      url: mcpHttpUrl,
      serverInfo: initResult?.serverInfo ?? null,
      protocolVersion: initResult?.protocolVersion ?? null
    });
  } catch (error) {
    response.json({
      online: false,
      url: mcpHttpUrl,
      error: error instanceof Error ? error.message : "unreachable"
    });
  }
});

app.get("/mcp/tools", async (_request, response) => {
  try {
    const result = (await callMcp("tools/list")) as { tools: unknown[] };
    response.json({ tools: result.tools ?? [] });
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : "MCP tools/list failed"
    });
  }
});

app.get("/mcp/resources", async (_request, response) => {
  try {
    const [resources, templates] = await Promise.all([
      callMcp("resources/list").catch(() => ({ resources: [] })),
      callMcp("resources/templates/list").catch(() => ({ resourceTemplates: [] }))
    ]);
    response.json({
      resources: (resources as { resources: unknown[] }).resources ?? [],
      templates: (templates as { resourceTemplates: unknown[] }).resourceTemplates ?? []
    });
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : "MCP resources/list failed"
    });
  }
});

app.post(
  "/mcp/invoke",
  limiters.write,
  asyncRoute(async (request, response) => {
    const input = mcpInvokeSchema.parse(request.body);
    try {
      const result = await callMcp("tools/call", { name: input.name, arguments: input.arguments ?? {} });
      response.json({ ok: true, result });
    } catch (error) {
      response.status(502).json({
        ok: false,
        error: error instanceof Error ? error.message : "MCP tool call failed"
      });
    }
  })
);

app.post(
  "/collab/ai-chat",
  limiters.ai,
  asyncRoute(async (request, response) => {
    const input = collabAiChatSchema.parse(request.body);
    const message = input.message.trim();
    const roomId = input.roomId?.trim() ?? "";
    const currentFileId = input.currentFileId?.trim() ?? "";
    let fileName = input.fileName?.trim() ?? "";
    let code = "";
    if (roomId && currentFileId) {
      const collab = roomCollabStates.get(roomId);
      if (collab) {
        const meta = collab.doc.getMap("fileMeta").get(currentFileId) as { name?: string } | undefined;
        if (meta?.name) fileName = meta.name;
        code = collab.doc.getText(`file:${currentFileId}`).toString();
      }
    }
    const history = (input.history ?? []).slice(-8);

    const apiKey = config.ai.apiKey;
    const baseUrl = config.ai.baseUrl;
    const model = config.ai.model;

    if (!apiKey) {
      response.json({
        reply: [
          "AI chat is unconfigured.",
          "",
          "Set OPENROUTER_API_KEY (or AI_API_KEY + AI_BASE_URL) in your .env to enable real responses.",
          "",
          `Echo: ${message}`,
          fileName ? `Current file: ${fileName} (${summarizeCode(code)})` : ""
        ]
          .filter(Boolean)
          .join("\n"),
        model: null,
        context: { roomId, fileName }
      });
      return;
    }

    try {
      const systemPrompt = [
        "You are an AI pair programmer embedded in a collaborative VS Code-like room called Codexa.",
        "Keep replies concise and practical. Prefer code diffs when explaining changes.",
        fileName ? `The user is currently editing ${fileName}.` : "",
        code ? `Current file contents:\n\n${code.slice(0, 4000)}` : ""
      ]
        .filter(Boolean)
        .join("\n\n");

      const upstream = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...(config.ai.siteUrl ? { "HTTP-Referer": config.ai.siteUrl } : {}),
          ...(config.ai.siteName ? { "X-Title": config.ai.siteName } : {})
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            ...history.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: message }
          ],
          temperature: 0.3,
          max_tokens: 800
        })
      });

      if (!upstream.ok) {
        const detail = await upstream.text().catch(() => "");
        response.status(502).json({ error: `Upstream AI error (${upstream.status}): ${detail.slice(0, 200)}` });
        return;
      }

      const payload = (await upstream.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = payload.choices?.[0]?.message?.content ?? "(empty response)";
      response.json({ reply, model, context: { roomId, fileName } });
    } catch (error) {
      response.status(500).json({
        error: error instanceof Error ? error.message : "AI chat failed."
      });
    }
  })
);

app.post("/submissions", limiters.submissions, asyncRoute(async (request, response) => {
  const input = submissionCreateSchema.parse(request.body);
  const problem = input.problemSlug ? getProblem(input.problemSlug) : undefined;

  let tests: Array<{ id: string; input: string; expected: string; hidden?: boolean }> = [];
  if (input.tests && input.tests.length > 0) {
    tests = input.tests.map((t, idx) => ({
      id: t.id || `test-${idx + 1}`,
      input: t.input,
      expected: t.expected,
      hidden: Boolean(t.hidden)
    }));
  } else if (problem) {
    tests = problem.tests;
  } else if (input.stdin) {
    tests = [{ id: "custom", input: input.stdin, expected: "", hidden: false }];
  }

  const job = await submissionsQueue.add(
    "submission",
    {
      ...input,
      tests
    },
    {
      removeOnComplete: 100,
      removeOnFail: 100
    }
  );

  try {
    const result = (await job.waitUntilFinished(submissionsEvents, 20_000)) as Submission;

    await prisma.submission
      .create({
        data: {
          product: productToPrisma(input.product) as never,
          problem: problem ? { connect: { slug: problem.slug } } : undefined,
          room: input.roomId ? { connect: { id: input.roomId } } : undefined,
          language: input.language.toUpperCase() as never,
          status: result.status,
          code: input.code,
          stdin: input.stdin,
          results: result.results,
          runtimeMs: result.runtimeMs
        }
      })
      .catch(() => undefined);

    response.json(result);
  } catch (error) {
    response.status(504).json({
      id: job.id,
      status: "SYSTEM_ERROR",
      results: [],
      runtimeMs: 0,
      createdAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Executor timed out"
    });
  }
}));

function roomStatePayload(roomId: string) {
  const state = roomStates.get(roomId);
  return {
    roomId,
    product: state?.product,
    activeUsers: Array.from(state?.activeUsers.values() ?? []),
    invitedEmails: Array.from(state?.invitedEmails.values() ?? []),
    selectedProblemSlug: state?.selectedProblemSlug,
    language: state?.language ?? "javascript",
    ended: Boolean(state?.ended)
  };
}

function emitRoomState(roomId: string) {
  io.to(roomId).emit("room:state", roomStatePayload(roomId));
}

function getRoomUser(roomId: string, socketId: string) {
  return roomStates.get(roomId)?.activeUsers.get(socketId);
}

function isRoomAdmin(roomId: string, socketId: string) {
  return getRoomUser(roomId, socketId)?.role === "admin";
}

function promoteNextAdmin(roomId: string) {
  const state = roomStates.get(roomId);
  if (!state) return;
  const hasAdmin = Array.from(state.activeUsers.values()).some((user) => user.role === "admin");
  if (hasAdmin) return;
  const nextUser = state.activeUsers.values().next().value as ActiveRoomUser | undefined;
  if (nextUser) {
    state.activeUsers.set(nextUser.socketId, { ...nextUser, role: "admin" });
  }
}

function getRoomCode(roomId: string) {
  const doc = roomDocs.get(roomId);
  if (!doc) return "";
  return doc.getText("code").toString();
}

function emitArenaState(roomId: string) {
  const state = roomStates.get(roomId);
  if (!state || state.product !== "arena") return;
  io.to(roomId).emit("arena:state", {
    selectedProblemSlug: state.selectedProblemSlug,
    language: state.language
  });
}

function fileTextKey(fileId: string) {
  return `file:${fileId}`;
}

function readFileMetas(doc: Y.Doc): CollabFileMeta[] {
  const tabs = doc.getArray<string>("tabs").toArray();
  const meta = doc.getMap("fileMeta");
  const result: CollabFileMeta[] = [];
  tabs.forEach((fileId, order) => {
    const raw = meta.get(fileId) as
      | { name?: string; language?: Language; lockedBy?: string }
      | undefined;
    if (!raw) return;
    const item: CollabFileMeta = {
      id: fileId,
      name: raw.name ?? "untitled",
      language: (raw.language ?? "javascript") as Language,
      order
    };
    if (raw.lockedBy) item.lockedBy = raw.lockedBy;
    result.push(item);
  });
  return result;
}

async function hydrateCollabFromDb(roomId: string, state: RoomCollabState) {
  if (state.hydrated) return;
  state.hydrated = true;
  let files: Array<{ id: string; name: string; language: string; content: string; order: number; lockedBy: string | null }> = [];
  try {
    files = await prisma.roomFile.findMany({
      where: { roomId },
      orderBy: { order: "asc" }
    });
  } catch {
    files = [];
  }

  if (files.length === 0) {
    const defaultFileId = `f_${Math.random().toString(36).slice(2, 10)}`;
    state.doc.transact(() => {
      const meta = state.doc.getMap("fileMeta");
      const tabs = state.doc.getArray<string>("tabs");
      meta.set(defaultFileId, { name: "main.js", language: "javascript" });
      tabs.insert(0, [defaultFileId]);
      state.doc.getText(fileTextKey(defaultFileId)).insert(0, "// Welcome to the Codexa collaborative workspace.\n");
    }, "hydrate");
    try {
      await prisma.roomFile.create({
        data: {
          id: defaultFileId,
          roomId,
          name: "main.js",
          language: "JAVASCRIPT" as never,
          content: "// Welcome to the Codexa collaborative workspace.\n",
          order: 0
        }
      });
    } catch {
      // DB unavailable; tolerate in-memory only
    }
    return;
  }

  state.doc.transact(() => {
    const meta = state.doc.getMap("fileMeta");
    const tabs = state.doc.getArray<string>("tabs");
    for (const file of files) {
      meta.set(file.id, {
        name: file.name,
        language: languageFromPrisma(file.language),
        ...(file.lockedBy ? { lockedBy: file.lockedBy } : {})
      });
      tabs.push([file.id]);
      const text = state.doc.getText(fileTextKey(file.id));
      if (file.content) text.insert(0, file.content);
    }
  }, "hydrate");
}

function ensureCollabState(roomId: string): RoomCollabState {
  const existing = roomCollabStates.get(roomId);
  if (existing) return existing;
  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);
  awareness.setLocalState(null);
  const state: RoomCollabState = {
    doc,
    awareness,
    socketClients: new Map(),
    hydrated: false
  };
  roomCollabStates.set(roomId, state);

  doc.on("update", (update: Uint8Array, origin: unknown) => {
    if (origin !== "remote") {
      io.to(roomId).emit("yjs:sync:update", { update });
    }
    schedulePersist(roomId);
  });

  awareness.on(
    "update",
    (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown
    ) => {
      const changed = added.concat(updated, removed);
      if (changed.length === 0) return;
      const update = awarenessProtocol.encodeAwarenessUpdate(awareness, changed);
      if (origin && typeof origin === "object" && "socketId" in origin) {
        io.to(roomId).except((origin as { socketId: string }).socketId).emit("yjs:awareness:update", { update });
      } else {
        io.to(roomId).emit("yjs:awareness:update", { update });
      }
    }
  );

  return state;
}

function schedulePersist(roomId: string) {
  const state = roomCollabStates.get(roomId);
  if (!state) return;
  if (state.persistTimer) clearTimeout(state.persistTimer);
  state.persistTimer = setTimeout(() => {
    state.persistTimer = undefined;
    persistRoomFiles(roomId).catch(() => undefined);
  }, 2500);
}

async function persistRoomFiles(roomId: string) {
  const state = roomCollabStates.get(roomId);
  if (!state) return;
  const metas = readFileMetas(state.doc);
  const presentIds = new Set(metas.map((meta) => meta.id));
  try {
    const existing = await prisma.roomFile.findMany({
      where: { roomId },
      select: { id: true }
    });
    const orphanIds = existing.filter((row) => !presentIds.has(row.id)).map((row) => row.id);
    if (orphanIds.length > 0) {
      await prisma.roomFile.deleteMany({ where: { id: { in: orphanIds } } });
    }
    for (const meta of metas) {
      const content = state.doc.getText(fileTextKey(meta.id)).toString();
      await prisma.roomFile.upsert({
        where: { id: meta.id },
        create: {
          id: meta.id,
          roomId,
          name: meta.name,
          language: languageToPrisma(meta.language) as never,
          content,
          order: meta.order,
          lockedBy: meta.lockedBy ?? null
        },
        update: {
          name: meta.name,
          language: languageToPrisma(meta.language) as never,
          content,
          order: meta.order,
          lockedBy: meta.lockedBy ?? null
        }
      });
    }
  } catch {
    // DB unreachable — keep in-memory state and retry on next change
  }
}

function tearDownCollabState(roomId: string) {
  const state = roomCollabStates.get(roomId);
  if (!state) return;
  if (state.persistTimer) clearTimeout(state.persistTimer);
  void persistRoomFiles(roomId);
  state.awareness.destroy();
  state.doc.destroy();
  roomCollabStates.delete(roomId);
}

function removeSocketAwareness(socketId: string, roomId: string) {
  const state = roomCollabStates.get(roomId);
  if (!state) return;
  const clientIDs = state.socketClients.get(socketId);
  if (!clientIDs || clientIDs.size === 0) return;
  awarenessProtocol.removeAwarenessStates(state.awareness, Array.from(clientIDs), { socketId });
  state.socketClients.delete(socketId);
}

function snapshotBattle(state: RoomBattleState): BattleState {
  const snapshot: BattleState = {
    phase: state.phase,
    durationMs: state.durationMs,
    participants: Array.from(state.participants.values()),
    revealCode: state.revealCode
  };
  if (state.problemSlug) snapshot.problemSlug = state.problemSlug;
  if (state.startedAt !== undefined) snapshot.startedAt = state.startedAt;
  if (state.endsAt !== undefined) snapshot.endsAt = state.endsAt;
  if (state.countdownEndsAt !== undefined) snapshot.countdownEndsAt = state.countdownEndsAt;
  if (state.hostSocketId) snapshot.hostSocketId = state.hostSocketId;
  return snapshot;
}

function emitBattleState(roomId: string) {
  const state = roomBattles.get(roomId);
  if (!state) return;
  io.to(roomId).emit("battle:state", snapshotBattle(state));
}

function ensureBattle(roomId: string): RoomBattleState {
  const existing = roomBattles.get(roomId);
  if (existing) return existing;
  const state: RoomBattleState = {
    phase: "idle",
    durationMs: DEFAULT_BATTLE_DURATION_MS,
    participants: new Map(),
    excluded: new Set(),
    revealCode: false
  };
  roomBattles.set(roomId, state);
  return state;
}

function teardownBattleTimers(state: RoomBattleState) {
  if (state.tickInterval) clearInterval(state.tickInterval);
  if (state.endTimeout) clearTimeout(state.endTimeout);
  if (state.countdownTimeout) clearTimeout(state.countdownTimeout);
  state.tickInterval = undefined;
  state.endTimeout = undefined;
  state.countdownTimeout = undefined;
}

function endBattle(roomId: string, reason: "timer" | "host" | "system") {
  const state = roomBattles.get(roomId);
  if (!state) return;
  if (state.phase === "ended" || state.phase === "idle") return;
  teardownBattleTimers(state);
  state.phase = "ended";
  state.endsAt = Date.now();
  for (const participant of state.participants.values()) {
    if (participant.status !== "submitted" && participant.status !== "disconnected") {
      participant.status = "submitted";
    }
  }
  emitBattleState(roomId);
  io.to(roomId).emit("battle:ended", { reason });
}

function startBattleTimers(roomId: string) {
  const state = roomBattles.get(roomId);
  if (!state || !state.endsAt) return;
  teardownBattleTimers(state);
  state.tickInterval = setInterval(() => {
    const battle = roomBattles.get(roomId);
    if (!battle || battle.phase !== "running") return;
    io.to(roomId).emit("battle:tick", {
      now: Date.now(),
      endsAt: battle.endsAt,
      participants: Array.from(battle.participants.values())
    });
  }, 1000);
  state.endTimeout = setTimeout(() => endBattle(roomId, "timer"), state.endsAt - Date.now());
}

function syncBattleParticipants(roomId: string) {
  const room = roomStates.get(roomId);
  const battle = roomBattles.get(roomId);
  if (!room || !battle) return;
  const activeIds = new Set(room.activeUsers.keys());

  for (const [socketId, user] of room.activeUsers.entries()) {
    if (battle.excluded.has(socketId)) continue;
    if (battle.phase === "running" || battle.phase === "countdown") {
      if (!battle.participants.has(socketId)) continue;
      const existing = battle.participants.get(socketId)!;
      existing.name = user.name;
      existing.role = user.role;
      if (existing.status === "disconnected") existing.status = "joined";
    } else if (battle.phase === "lobby") {
      const existing = battle.participants.get(socketId);
      if (existing) {
        existing.name = user.name;
        existing.role = user.role;
      } else {
        battle.participants.set(socketId, {
          socketId,
          name: user.name,
          role: user.role,
          status: "joined"
        });
      }
    } else if (battle.phase === "ended" || battle.phase === "idle") {
      // nothing — ended is frozen; idle has no participants
    }
  }

  for (const [socketId, participant] of Array.from(battle.participants.entries())) {
    if (!activeIds.has(socketId)) {
      if (battle.phase === "lobby") {
        battle.participants.delete(socketId);
      } else if (battle.phase === "running" || battle.phase === "countdown") {
        participant.status = "disconnected";
      }
    }
  }

  if (!battle.hostSocketId || !activeIds.has(battle.hostSocketId)) {
    const nextHost = Array.from(room.activeUsers.values()).find((u) => u.role === "admin");
    battle.hostSocketId = nextHost?.socketId;
  }
}

io.on("connection", (socket) => {
  socket.on("room:join", async ({ roomId, product, name, email }: { roomId: string; product: ProductKind; name: string; email?: string }) => {
    const displayName = String(name ?? "").trim();
    if (!roomId || !displayName) {
      socket.emit("room:error", { message: "Display name is required to join a room." });
      return;
    }

    const normalizedEmail = email ? String(email).trim().toLowerCase() : undefined;
    const state =
      roomStates.get(roomId) ??
      {
        product,
        activeUsers: new Map<string, ActiveRoomUser>(),
        invitedEmails: new Set<string>(),
        language: "javascript" as Language,
        ended: false
      };

    if (state.ended) {
      socket.emit("room:ended", { roomId });
      return;
    }

    const role = state.activeUsers.size === 0 ? "admin" : "user";
    state.activeUsers.set(socket.id, {
      socketId: socket.id,
      name: displayName,
      email: normalizedEmail,
      role,
      joinedAt: new Date().toISOString()
    });
    roomStates.set(roomId, state);
    socket.join(roomId);

    if (!roomDocs.has(roomId)) {
      roomDocs.set(roomId, new Y.Doc());
    }

    socket.emit("room:joined", { roomId, role });
    emitRoomState(roomId);
    const existingCode = getRoomCode(roomId);
    if (existingCode) {
      socket.emit("code:update", { code: existingCode });
    }
    if (state.product === "arena") {
      socket.emit("arena:state", {
        selectedProblemSlug: state.selectedProblemSlug,
        language: state.language
      });
    }
    if (state.excalidrawScene) {
      socket.emit("excalidraw:update", state.excalidrawScene);
    }
    if (state.systemDesignScene) {
      socket.emit("system-design:update", { scene: state.systemDesignScene });
    }

    if (state.product === "collaborative") {
      const collab = ensureCollabState(roomId);
      await hydrateCollabFromDb(roomId, collab);
      socket.emit("yjs:sync:init", {
        update: Y.encodeStateAsUpdate(collab.doc),
        files: readFileMetas(collab.doc)
      });
      const awarenessClients = Array.from(collab.awareness.getStates().keys());
      if (awarenessClients.length > 0) {
        socket.emit("yjs:awareness:update", {
          update: awarenessProtocol.encodeAwarenessUpdate(collab.awareness, awarenessClients)
        });
      }
    }

    if (state.product === "arena") {
      const battle = roomBattles.get(roomId);
      if (battle && battle.phase !== "idle") {
        if (!battle.excluded.has(socket.id)) {
          if (battle.phase === "lobby") {
            syncBattleParticipants(roomId);
          } else if (battle.participants.has(socket.id)) {
            const existing = battle.participants.get(socket.id)!;
            existing.status = existing.status === "disconnected" ? "coding" : existing.status;
          }
        }
        socket.emit("battle:state", snapshotBattle(battle));
        emitBattleState(roomId);
      }
    }
  });

  socket.on("code:update", ({ roomId, code }) => {
    const doc = roomDocs.get(roomId) ?? new Y.Doc();
    roomDocs.set(roomId, doc);
    const text = doc.getText("code");
    text.delete(0, text.length);
    text.insert(0, code);
    socket.to(roomId).emit("code:update", { code });
  });

  socket.on("yjs:sync:update", ({ roomId, update }: { roomId: string; update: ArrayBuffer | Uint8Array }) => {
    const state = roomCollabStates.get(roomId);
    if (!state || !getRoomUser(roomId, socket.id)) return;
    const bytes = update instanceof Uint8Array ? update : new Uint8Array(update);
    Y.applyUpdate(state.doc, bytes, "remote");
    socket.to(roomId).emit("yjs:sync:update", { update: bytes });
  });

  socket.on(
    "yjs:awareness:update",
    ({ roomId, update }: { roomId: string; update: ArrayBuffer | Uint8Array }) => {
      const state = roomCollabStates.get(roomId);
      if (!state || !getRoomUser(roomId, socket.id)) return;
      const bytes = update instanceof Uint8Array ? update : new Uint8Array(update);
      const before = new Set(state.awareness.getStates().keys());
      awarenessProtocol.applyAwarenessUpdate(state.awareness, bytes, { socketId: socket.id });
      const after = state.awareness.getStates();
      const trackedSet = state.socketClients.get(socket.id) ?? new Set<number>();
      for (const clientId of after.keys()) {
        if (!before.has(clientId)) trackedSet.add(clientId);
      }
      state.socketClients.set(socket.id, trackedSet);
    }
  );

  socket.on(
    "file:create",
    async ({ roomId, name, language }: { roomId: string; name: string; language?: Language }) => {
      const state = roomCollabStates.get(roomId);
      if (!state || !getRoomUser(roomId, socket.id)) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const fileLanguage: Language = isLanguage(language) ? language : "javascript";
      const fileId = `f_${Math.random().toString(36).slice(2, 10)}`;
      state.doc.transact(() => {
        state.doc.getMap("fileMeta").set(fileId, { name: trimmed, language: fileLanguage });
        state.doc.getArray<string>("tabs").push([fileId]);
      });
      io.to(roomId).emit("file:list", { files: readFileMetas(state.doc) });
    }
  );

  socket.on("file:close", ({ roomId, fileId }: { roomId: string; fileId: string }) => {
    const state = roomCollabStates.get(roomId);
    if (!state || !getRoomUser(roomId, socket.id)) return;
    const tabs = state.doc.getArray<string>("tabs");
    const index = tabs.toArray().indexOf(fileId);
    if (index === -1) return;
    if (tabs.length === 1) {
      socket.emit("room:error", { message: "Cannot close the last tab." });
      return;
    }
    state.doc.transact(() => {
      tabs.delete(index, 1);
      state.doc.getMap("fileMeta").delete(fileId);
      const text = state.doc.getText(fileTextKey(fileId));
      text.delete(0, text.length);
    });
    io.to(roomId).emit("file:list", { files: readFileMetas(state.doc) });
  });

  socket.on(
    "file:rename",
    ({ roomId, fileId, name }: { roomId: string; fileId: string; name: string }) => {
      const state = roomCollabStates.get(roomId);
      if (!state || !getRoomUser(roomId, socket.id)) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const meta = state.doc.getMap("fileMeta");
      const current = meta.get(fileId) as
        | { name?: string; language?: Language; lockedBy?: string }
        | undefined;
      if (!current) return;
      meta.set(fileId, { ...current, name: trimmed });
      io.to(roomId).emit("file:list", { files: readFileMetas(state.doc) });
    }
  );

  socket.on(
    "collab:search",
    ({ roomId, query, caseSensitive }: { roomId: string; query: string; caseSensitive?: boolean }) => {
      const state = roomCollabStates.get(roomId);
      if (!state || !getRoomUser(roomId, socket.id)) {
        socket.emit("collab:search:result", { query, matches: [] });
        return;
      }
      const trimmed = query.trim();
      if (!trimmed) {
        socket.emit("collab:search:result", { query, matches: [] });
        return;
      }
      const needle = caseSensitive ? trimmed : trimmed.toLowerCase();
      const metas = readFileMetas(state.doc);
      type Match = { fileId: string; fileName: string; lineNumber: number; column: number; preview: string };
      const matches: Match[] = [];
      let total = 0;
      for (const meta of metas) {
        const content = state.doc.getText(`file:${meta.id}`).toString();
        const lines = content.split(/\r?\n/);
        for (let i = 0; i < lines.length; i += 1) {
          const line = lines[i] ?? "";
          const hay = caseSensitive ? line : line.toLowerCase();
          const idx = hay.indexOf(needle);
          if (idx === -1) continue;
          total += 1;
          if (matches.length < 200) {
            matches.push({
              fileId: meta.id,
              fileName: meta.name,
              lineNumber: i + 1,
              column: idx + 1,
              preview: line.length > 200 ? `${line.slice(0, 100)}…${line.slice(idx)}` : line
            });
          }
        }
      }
      socket.emit("collab:search:result", { query, matches, total });
    }
  );

  socket.on("file:lock", ({ roomId, fileId }: { roomId: string; fileId: string }) => {
    const state = roomCollabStates.get(roomId);
    const user = getRoomUser(roomId, socket.id);
    if (!state || !user) return;
    const meta = state.doc.getMap("fileMeta");
    const current = meta.get(fileId) as
      | { name?: string; language?: Language; lockedBy?: string }
      | undefined;
    if (!current) return;
    if (current.lockedBy && current.lockedBy !== user.name) {
      socket.emit("room:error", { message: `${current.lockedBy} already has this file locked.` });
      return;
    }
    meta.set(fileId, { ...current, lockedBy: user.name });
    io.to(roomId).emit("file:list", { files: readFileMetas(state.doc) });
  });

  socket.on("battle:setup", ({ roomId }: { roomId: string }) => {
    if (!isRoomAdmin(roomId, socket.id)) {
      socket.emit("room:error", { message: "Only the room admin can start Battle Mode." });
      return;
    }
    const room = roomStates.get(roomId);
    if (!room || room.product !== "arena") {
      socket.emit("room:error", { message: "Battle Mode is only available in Arena rooms." });
      return;
    }
    const battle = ensureBattle(roomId);
    if (battle.phase === "running" || battle.phase === "countdown") return;
    battle.phase = "lobby";
    battle.hostSocketId = socket.id;
    battle.revealCode = false;
    battle.excluded.clear();
    battle.participants.clear();
    syncBattleParticipants(roomId);
    emitBattleState(roomId);
  });

  socket.on("battle:cancel", ({ roomId }: { roomId: string }) => {
    if (!isRoomAdmin(roomId, socket.id)) return;
    const battle = roomBattles.get(roomId);
    if (!battle) return;
    if (battle.phase !== "lobby" && battle.phase !== "ended") {
      socket.emit("room:error", { message: "Use End Battle to stop a running battle." });
      return;
    }
    teardownBattleTimers(battle);
    battle.phase = "idle";
    battle.participants.clear();
    battle.excluded.clear();
    battle.problemSlug = undefined;
    battle.startedAt = undefined;
    battle.endsAt = undefined;
    battle.countdownEndsAt = undefined;
    emitBattleState(roomId);
  });

  socket.on(
    "battle:select-problem",
    ({ roomId, slug }: { roomId: string; slug: string }) => {
      if (!isRoomAdmin(roomId, socket.id)) return;
      const battle = roomBattles.get(roomId);
      if (!battle || battle.phase !== "lobby") return;
      const problem = getProblem(slug);
      if (!problem) return;
      battle.problemSlug = slug;
      emitBattleState(roomId);
    }
  );

  socket.on(
    "battle:set-duration",
    ({ roomId, durationMs }: { roomId: string; durationMs: number }) => {
      if (!isRoomAdmin(roomId, socket.id)) return;
      const battle = roomBattles.get(roomId);
      if (!battle || battle.phase !== "lobby") return;
      const ms = Math.max(60_000, Math.min(4 * 60 * 60 * 1000, Math.floor(durationMs)));
      battle.durationMs = ms;
      emitBattleState(roomId);
    }
  );

  socket.on("battle:kick", ({ roomId, targetSocketId }: { roomId: string; targetSocketId: string }) => {
    if (!isRoomAdmin(roomId, socket.id)) return;
    const battle = roomBattles.get(roomId);
    if (!battle || battle.phase !== "lobby") return;
    if (targetSocketId === battle.hostSocketId) return;
    battle.excluded.add(targetSocketId);
    battle.participants.delete(targetSocketId);
    io.to(targetSocketId).emit("battle:kicked", { roomId });
    emitBattleState(roomId);
  });

  socket.on("battle:unkick", ({ roomId, targetSocketId }: { roomId: string; targetSocketId: string }) => {
    if (!isRoomAdmin(roomId, socket.id)) return;
    const battle = roomBattles.get(roomId);
    if (!battle || battle.phase !== "lobby") return;
    battle.excluded.delete(targetSocketId);
    syncBattleParticipants(roomId);
    emitBattleState(roomId);
  });

  socket.on("battle:start", ({ roomId }: { roomId: string }) => {
    if (!isRoomAdmin(roomId, socket.id)) return;
    const battle = roomBattles.get(roomId);
    if (!battle || battle.phase !== "lobby") return;
    if (!battle.problemSlug) {
      socket.emit("room:error", { message: "Select a problem before starting." });
      return;
    }
    if (battle.participants.size === 0) {
      socket.emit("room:error", { message: "Need at least one participant to start." });
      return;
    }
    const now = Date.now();
    battle.phase = "countdown";
    battle.countdownEndsAt = now + COUNTDOWN_MS;
    battle.startedAt = now + COUNTDOWN_MS;
    battle.endsAt = battle.startedAt + battle.durationMs;
    for (const participant of battle.participants.values()) {
      participant.status = "coding";
      participant.result = undefined;
    }
    emitBattleState(roomId);
    battle.countdownTimeout = setTimeout(() => {
      const live = roomBattles.get(roomId);
      if (!live || live.phase !== "countdown") return;
      live.phase = "running";
      emitBattleState(roomId);
      startBattleTimers(roomId);
    }, COUNTDOWN_MS);
  });

  socket.on("battle:end", ({ roomId }: { roomId: string }) => {
    if (!isRoomAdmin(roomId, socket.id)) return;
    endBattle(roomId, "host");
  });

  socket.on(
    "battle:reveal",
    ({ roomId, reveal }: { roomId: string; reveal: boolean }) => {
      if (!isRoomAdmin(roomId, socket.id)) return;
      const battle = roomBattles.get(roomId);
      if (!battle || battle.phase !== "ended") return;
      battle.revealCode = Boolean(reveal);
      emitBattleState(roomId);
    }
  );

  socket.on(
    "battle:status",
    ({ roomId, status }: { roomId: string; status: BattleParticipantStatus }) => {
      const battle = roomBattles.get(roomId);
      if (!battle) return;
      const participant = battle.participants.get(socket.id);
      if (!participant) return;
      if (battle.phase !== "running") return;
      if (participant.status === "submitted") return;
      participant.status = status;
      emitBattleState(roomId);
    }
  );

  socket.on(
    "battle:submit",
    ({
      roomId,
      passed,
      total,
      status,
      runtimeMs
    }: {
      roomId: string;
      passed: number;
      total: number;
      status: string;
      runtimeMs: number;
    }) => {
      const battle = roomBattles.get(roomId);
      if (!battle) return;
      const participant = battle.participants.get(socket.id);
      if (!participant) return;
      if (battle.phase !== "running") return;
      const next = {
        passed,
        total,
        status,
        runtimeMs,
        submittedAt: new Date().toISOString()
      };
      const previous = participant.result;
      const isBetter =
        !previous ||
        passed > previous.passed ||
        (passed === previous.passed && runtimeMs < previous.runtimeMs);
      if (isBetter) participant.result = next;
      participant.status = "submitted";
      emitBattleState(roomId);

      const allDone = Array.from(battle.participants.values()).every(
        (p) => p.status === "submitted" || p.status === "disconnected"
      );
      if (allDone) endBattle(roomId, "system");
    }
  );

  socket.on("file:unlock", ({ roomId, fileId }: { roomId: string; fileId: string }) => {
    const state = roomCollabStates.get(roomId);
    const user = getRoomUser(roomId, socket.id);
    if (!state || !user) return;
    const meta = state.doc.getMap("fileMeta");
    const current = meta.get(fileId) as
      | { name?: string; language?: Language; lockedBy?: string }
      | undefined;
    if (!current?.lockedBy) return;
    if (current.lockedBy !== user.name && user.role !== "admin") {
      socket.emit("room:error", { message: "Only the lock owner (or admin) can unlock." });
      return;
    }
    const { lockedBy: _, ...rest } = current;
    void _;
    meta.set(fileId, rest);
    io.to(roomId).emit("file:list", { files: readFileMetas(state.doc) });
  });

  socket.on("chat:message", ({ roomId, author, body }) => {
    io.to(roomId).emit("chat:message", { author, body, createdAt: new Date().toISOString() });
  });

  socket.on("arena:select-problem", ({ roomId, slug }: { roomId: string; slug: string }) => {
    const state = roomStates.get(roomId);
    if (!state || state.product !== "arena" || !getRoomUser(roomId, socket.id)) return;
    state.selectedProblemSlug = slug;
    emitRoomState(roomId);
    emitArenaState(roomId);
  });

  socket.on("arena:language:update", ({ roomId, language }: { roomId: string; language: Language }) => {
    const state = roomStates.get(roomId);
    if (!state || state.product !== "arena" || !getRoomUser(roomId, socket.id)) return;
    state.language = language;
    emitRoomState(roomId);
    emitArenaState(roomId);
  });

  socket.on("excalidraw:update", ({ roomId, elements, files }: { roomId: string; elements: unknown; files?: Record<string, unknown> }) => {
    const state = roomStates.get(roomId);
    if (!state || !getRoomUser(roomId, socket.id) || !Array.isArray(elements)) return;

    state.excalidrawScene = {
      elements,
      files
    };
    socket.to(roomId).emit("excalidraw:update", state.excalidrawScene);
  });

  socket.on("system-design:update", ({ roomId, scene }: { roomId: string; scene: unknown }) => {
    const state = roomStates.get(roomId);
    if (!state || state.product !== "system-design" || !getRoomUser(roomId, socket.id)) return;
    if (!scene || typeof scene !== "object") return;
    const nextScene = scene as Partial<SystemDesignScene>;
    if (!Array.isArray(nextScene.nodes) || !Array.isArray(nextScene.edges)) return;

    state.systemDesignScene = {
      nodes: nextScene.nodes,
      edges: nextScene.edges,
      templateId: typeof nextScene.templateId === "string" ? nextScene.templateId : undefined,
      templateName: typeof nextScene.templateName === "string" ? nextScene.templateName : undefined,
      workload: nextScene.workload,
      simulationRunning: Boolean(nextScene.simulationRunning),
      chaosEvents: Array.isArray(nextScene.chaosEvents) ? nextScene.chaosEvents : [],
      notes: typeof nextScene.notes === "string" ? nextScene.notes : "",
      challenge: nextScene.challenge,
      updatedAt: typeof nextScene.updatedAt === "number" ? nextScene.updatedAt : Date.now()
    };
    socket.to(roomId).emit("system-design:update", { scene: state.systemDesignScene });
  });

  socket.on("room:invite", ({ roomId, email }: { roomId: string; email: string }) => {
    if (!isRoomAdmin(roomId, socket.id)) {
      socket.emit("room:error", { message: "Only the room admin can invite users." });
      return;
    }

    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      socket.emit("room:error", { message: "Enter a valid email address." });
      return;
    }

    roomStates.get(roomId)?.invitedEmails.add(normalizedEmail);
    emitRoomState(roomId);
  });

  socket.on("room:remove-user", ({ roomId, socketId }: { roomId: string; socketId: string }) => {
    if (!isRoomAdmin(roomId, socket.id)) {
      socket.emit("room:error", { message: "Only the room admin can remove users." });
      return;
    }

    const targetUser = getRoomUser(roomId, socketId);
    if (!targetUser || targetUser.role === "admin") return;

    roomStates.get(roomId)?.activeUsers.delete(socketId);
    io.to(socketId).emit("room:removed", { roomId });
    io.sockets.sockets.get(socketId)?.leave(roomId);
    emitRoomState(roomId);
  });

  socket.on("room:end", ({ roomId }: { roomId: string }) => {
    const state = roomStates.get(roomId);
    if (!state || !getRoomUser(roomId, socket.id)) return;

    state.ended = true;
    const battle = roomBattles.get(roomId);
    if (battle) {
      teardownBattleTimers(battle);
      roomBattles.delete(roomId);
    }
    io.to(roomId).emit("room:ended", { roomId });
    for (const socketId of state.activeUsers.keys()) {
      io.sockets.sockets.get(socketId)?.leave(roomId);
    }
    roomStates.delete(roomId);
    roomDocs.delete(roomId);
    tearDownCollabState(roomId);
  });

  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      removeSocketAwareness(socket.id, roomId);
      const state = roomStates.get(roomId);
      if (!state) continue;
      state.activeUsers.delete(socket.id);
      promoteNextAdmin(roomId);

      const battle = roomBattles.get(roomId);
      if (battle) {
        const participant = battle.participants.get(socket.id);
        if (participant) {
          if (battle.phase === "running" || battle.phase === "countdown") {
            participant.status = "disconnected";
          } else if (battle.phase === "lobby") {
            battle.participants.delete(socket.id);
          }
        }
        if (battle.hostSocketId === socket.id) {
          const nextAdmin = Array.from(state.activeUsers.values()).find((u) => u.role === "admin");
          battle.hostSocketId = nextAdmin?.socketId;
        }
        if (battle.phase !== "idle") emitBattleState(roomId);
      }

      if (state.activeUsers.size === 0) {
        if (battle) {
          teardownBattleTimers(battle);
          roomBattles.delete(roomId);
        }
        roomStates.delete(roomId);
        roomDocs.delete(roomId);
        tearDownCollabState(roomId);
      } else {
        emitRoomState(roomId);
      }
    }
  });
});

// Central error handler — must be the LAST middleware mounted. Sync throws
// from any route (e.g. ZodError from `.parse()`) and any error forwarded via
// `next(err)` in asyncRoute() end up here.
app.use(errorHandler);

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `API + realtime listening on http://localhost:${config.port} ` +
      `[${config.nodeEnv}] cors=${config.corsOrigins.join(",")}`
  );
});
