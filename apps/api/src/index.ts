import "dotenv/config";
import http from "node:http";
import cors from "cors";
import express from "express";
import { Queue, QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { Server } from "socket.io";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { getProblem, listProblems, supportedLanguages } from "@codexa/problems";
import { prisma } from "@codexa/db";
import { roomCreateSchema, submissionCreateSchema, type ActiveRoomUser, type CollabFileMeta, type Language, type ProductKind, type Submission } from "@codexa/types";

const port = Number(process.env.API_PORT ?? 4000);
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true
  },
  maxHttpBufferSize: 5e6
});

const redisConnection = new Redis(redisUrl, { maxRetriesPerRequest: null });
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

type ExcalidrawScene = {
  elements: unknown[];
  files?: Record<string, unknown>;
};

type McpToolCall = {
  name: string;
  output: string;
};

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    services: {
      products: ["collaborative", "arena"],
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
      }
    ]
  });
});

app.post("/rooms", async (request, response) => {
  const input = roomCreateSchema.parse(request.body);
  const room = await prisma.room.create({
    data: {
      product: input.product.toUpperCase() as never,
      name: input.name,
      language: input.language.toUpperCase() as never,
      problemSlug: input.problemSlug
    }
  });
  response.status(201).json(room);
});

app.post("/collab/rooms", async (request, response) => {
  const input = roomCreateSchema.parse({ ...request.body, product: "collaborative" });
  const room = await prisma.room.create({
    data: {
      product: "COLLABORATIVE",
      name: input.name,
      language: input.language.toUpperCase() as never
    }
  });
  response.status(201).json(room);
});

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

app.post("/mcp/chat", (request, response) => {
  const message = cleanString(request.body?.message);
  const roomId = cleanString(request.body?.roomId);
  const problemSlug = cleanString(request.body?.problemSlug);
  const code = cleanString(request.body?.code);
  const requestedLanguage = request.body?.language as unknown;
  const language: Language = isLanguage(requestedLanguage) ? requestedLanguage : "javascript";
  const problem = problemSlug ? getProblem(problemSlug) : undefined;
  const lowerMessage = message.toLowerCase();
  const toolCalls: McpToolCall[] = [];

  if (!message) {
    response.status(400).json({ error: "Message is required." });
    return;
  }

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

app.post("/collab/ai-chat", async (request, response) => {
  const message = cleanString(request.body?.message);
  const roomId = cleanString(request.body?.roomId);
  const currentFileId = cleanString(request.body?.currentFileId);
  let fileName = cleanString(request.body?.fileName);
  let code = "";
  if (roomId && currentFileId) {
    const collab = roomCollabStates.get(roomId);
    if (collab) {
      const meta = collab.doc.getMap("fileMeta").get(currentFileId) as { name?: string } | undefined;
      if (meta?.name) fileName = meta.name;
      code = collab.doc.getText(`file:${currentFileId}`).toString();
    }
  }
  const history = Array.isArray(request.body?.history)
    ? (request.body.history as Array<{ role: "user" | "assistant"; content: string }>)
        .slice(-8)
        .filter((m) => m && typeof m.content === "string")
    : [];

  if (!message) {
    response.status(400).json({ error: "Message is required." });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY ?? process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL ?? "https://openrouter.ai/api/v1";
  const model = process.env.OPENROUTER_MODEL ?? "openrouter/auto";

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
        ...(process.env.OPENROUTER_SITE_URL ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL } : {}),
        ...(process.env.OPENROUTER_SITE_NAME ? { "X-Title": process.env.OPENROUTER_SITE_NAME } : {})
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
});

app.post("/submissions", async (request, response) => {
  const input = submissionCreateSchema.parse(request.body);
  const problem = input.problemSlug ? getProblem(input.problemSlug) : undefined;

  const job = await submissionsQueue.add(
    "submission",
    {
      ...input,
      tests: input.mode === "submit" && problem ? problem.tests : input.stdin ? [{ id: "custom", input: input.stdin, expected: "", hidden: false }] : problem?.tests.slice(0, 2)
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
          product: input.product.toUpperCase() as never,
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
});

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
      if (state.activeUsers.size === 0) {
        roomStates.delete(roomId);
        roomDocs.delete(roomId);
        tearDownCollabState(roomId);
      } else {
        emitRoomState(roomId);
      }
    }
  });
});

server.listen(port, () => {
  console.log(`API + realtime listening on http://localhost:${port}`);
});
