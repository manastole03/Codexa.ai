"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { io, type Socket } from "socket.io-client";
import { Button } from "@codexa/ui";
import { problems, supportedLanguages } from "@codexa/problems";
import { fetchLeetcodeList, fetchLeetcodeProblem, getCachedLeetcodeProblem, type LeetcodeListEntry, type LeetcodeProblem } from "@/lib/leetcode";
import type { ActiveRoomUser, ArenaRoomState, BattleState, Language, Problem, RoomRole, Submission } from "@codexa/types";
import { apiBaseUrl } from "@/lib/api";
import { ExcalidrawBoard } from "@/components/excalidraw-board";
import { BattleModeShell } from "@/components/battle-mode";
import { TerminalOutput, type TerminalEntry } from "@/components/terminal-output";

const CollaborativeEditor = dynamic(
  () => import("@/components/collaborative-editor").then((mod) => mod.CollaborativeEditor),
  { ssr: false }
);
import { FileExplorer } from "@/components/file-explorer";
import { FileSearch } from "@/components/file-search";
import { ActivityBar, type SidebarView } from "@/components/activity-bar";
import { StatusBar } from "@/components/status-bar";
import { BookOpen, Bot, ChevronDown, ChevronRight, Copy, FlaskConical, Loader2, LogIn, MailPlus, MessageSquare, PencilRuler, Play, Plug, Play as PlayIcon, Search, Send, ServerCog, Shield, Sparkles, Swords, Trash2, UserRoundX } from "lucide-react";
import type { CollabFileMeta } from "@codexa/types";

type CollabPanel = "chat" | "ai" | "mcp";

type McpTool = {
  name: string;
  description?: string;
  inputSchema?: { type?: string; properties?: Record<string, unknown>; required?: string[] };
};

type McpResource = {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
};

type McpResourceTemplate = {
  uriTemplate: string;
  name?: string;
  description?: string;
  mimeType?: string;
};

type McpStatus = {
  online: boolean;
  url?: string;
  serverInfo?: { name?: string; version?: string } | null;
  protocolVersion?: string | null;
  error?: string;
};

type ArenaPanel = "problems" | "chat" | "mcp" | "board";

type McpToolCall = {
  name: string;
  output: string;
};

type McpMessage = {
  role: "assistant" | "user";
  content: string;
  toolCalls?: McpToolCall[];
};

const languageLabels: Record<Language, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  cpp: "C++",
  java: "Java",
  go: "Go",
  rust: "Rust",
  csharp: "C#",
  ruby: "Ruby",
  php: "PHP",
  swift: "Swift",
  kotlin: "Kotlin",
  dart: "Dart"
};

export function RoomWorkspace({
  roomId,
  product,
  displayName,
  email = ""
}: {
  roomId: string;
  product: "collaborative" | "arena";
  displayName: string;
  email?: string;
}) {
  const [code, setCode] = useState(() => (product === "arena" ? "// Select a problem from the Arena panel." : "console.log('Hello from Codexa.ai');"));
  const [chat, setChat] = useState<Array<{ author: string; body: string }>>([]);
  const [message, setMessage] = useState("");
  const [joinName, setJoinName] = useState(displayName);
  const [joinEmail, setJoinEmail] = useState(email);
  const [joinedName, setJoinedName] = useState(displayName.trim());
  const [joinedEmail, setJoinedEmail] = useState(email.trim());
  const [joinError, setJoinError] = useState("");
  const [role, setRole] = useState<RoomRole | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveRoomUser[]>([]);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [closedMessage, setClosedMessage] = useState("");
  const [selectedProblemSlug, setSelectedProblemSlug] = useState<string | undefined>();
  const [language, setLanguage] = useState<Language>("javascript");
  const [problemQuery, setProblemQuery] = useState("");
  const [problemDifficulty, setProblemDifficulty] = useState("");
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [running, setRunning] = useState(false);
  const [arenaPanel, setArenaPanel] = useState<ArenaPanel>("problems");
  const [mcpInput, setMcpInput] = useState("");
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpMessages, setMcpMessages] = useState<McpMessage[]>([
    {
      role: "assistant",
      content: "MCP AI is online. Current room context is attached."
    }
  ]);
  const [collabPanel, setCollabPanel] = useState<CollabPanel>("chat");
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: "AI pair programmer ready. Ask about your current file, request a refactor, or get a code review."
    }
  ]);
  const [activeCollabFile, setActiveCollabFile] = useState<{ id: string; name: string; language: Language; lockedBy?: string } | null>(null);
  const [collabFiles, setCollabFiles] = useState<CollabFileMeta[]>([]);
  const [openFileRequest, setOpenFileRequest] = useState<{ id: string; nonce: number } | null>(null);
  const [sidebarView, setSidebarView] = useState<SidebarView>("explorer");
  const [connected, setConnected] = useState(false);
  const [mcpStatus, setMcpStatus] = useState<McpStatus | null>(null);
  const [mcpTools, setMcpTools] = useState<McpTool[]>([]);
  const [mcpResources, setMcpResources] = useState<McpResource[]>([]);
  const [mcpResourceTemplates, setMcpResourceTemplates] = useState<McpResourceTemplate[]>([]);
  const [mcpLoadError, setMcpLoadError] = useState<string>("");
  const [mcpToolResult, setMcpToolResult] = useState<{ name: string; output: string } | null>(null);
  const [mcpInvoking, setMcpInvoking] = useState<string | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [battleKicked, setBattleKicked] = useState(false);
  const [leetcodeProblems, setLeetcodeProblems] = useState<LeetcodeListEntry[]>([]);
  const [leetcodeLoading, setLeetcodeLoading] = useState(false);
  const [leetcodeError, setLeetcodeError] = useState<string>("");
  const [leetcodeSelected, setLeetcodeSelected] = useState<LeetcodeProblem | null>(null);
  const [leetcodeFetching, setLeetcodeFetching] = useState(false);
  const socket = useMemo<Socket>(() => io(apiBaseUrl, { autoConnect: false }), []);
  const hasJoined = Boolean(joinedName.trim());
  const currentUser = activeUsers.find((user) => user.socketId === socket.id);
  const currentRole = currentUser?.role ?? role;
  const isAdmin = currentRole === "admin";
  const selectedProblem = useMemo<Problem | LeetcodeProblem | undefined>(() => {
    if (!selectedProblemSlug) return undefined;
    const curated = problems.find((p) => p.slug === selectedProblemSlug);
    if (curated) return curated;
    if (leetcodeSelected && leetcodeSelected.slug === selectedProblemSlug) return leetcodeSelected;
    return getCachedLeetcodeProblem(selectedProblemSlug) ?? undefined;
  }, [selectedProblemSlug, leetcodeSelected]);

  const arenaTerminalEntries: TerminalEntry[] = useMemo(() => {
    if (!submission || !submission.results) return [];
    const tests = selectedProblem?.tests ?? [];
    return submission.results.map((result, idx) => {
      const matchingTest = tests.find((t) => t.id === result.testCaseId) ?? tests[idx];
      const entry: TerminalEntry = {
        id: result.testCaseId || `test-${idx + 1}`,
        label: `test ${idx + 1}`,
        command: `${language} test ${result.testCaseId || idx + 1}`,
        status: result.status,
        runtimeMs: result.runtimeMs
      };
      if (matchingTest && !matchingTest.hidden) {
        if (matchingTest.input) entry.stdin = matchingTest.input;
        if (matchingTest.expected) entry.expected = matchingTest.expected;
      } else if (matchingTest?.hidden) {
        entry.hidden = true;
        if (matchingTest.input) entry.stdin = matchingTest.input;
        if (matchingTest.expected) entry.expected = matchingTest.expected;
      }
      if (result.stdout) entry.stdout = result.stdout;
      if (result.stderr) entry.stderr = result.stderr;
      return entry;
    });
  }, [submission, selectedProblem, language]);

  const filteredProblems = useMemo(() => {
    const needle = problemQuery.trim().toLowerCase();
    return leetcodeProblems.filter((problem) => {
      const matchesQuery = needle
        ? [problem.title, problem.slug, problem.frontendId].join(" ").toLowerCase().includes(needle)
        : true;
      const matchesDifficulty = problemDifficulty ? problem.difficulty === problemDifficulty : true;
      return matchesQuery && matchesDifficulty;
    });
  }, [problemDifficulty, problemQuery, leetcodeProblems]);

  useEffect(() => {
    if (!hasJoined) return;

    socket.connect();
    socket.emit("room:join", {
      roomId,
      product,
      name: joinedName,
      email: joinedEmail || undefined
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("room:joined", ({ role: nextRole }: { role: RoomRole }) => {
      setRole(nextRole);
      setNotice(nextRole === "admin" ? "You are the room admin." : "You joined as a room user.");
    });
    socket.on(
      "room:state",
      ({
        activeUsers: nextUsers,
        invitedEmails: nextInvites
      }: {
        activeUsers: ActiveRoomUser[];
        invitedEmails: string[];
      }) => {
        setActiveUsers(nextUsers);
        setInvitedEmails(nextInvites);
      }
    );
    socket.on("arena:state", (nextState: ArenaRoomState) => {
      setSelectedProblemSlug(nextState.selectedProblemSlug);
      setLanguage(nextState.language);
    });
    socket.on("room:error", ({ message: nextMessage }: { message: string }) => setNotice(nextMessage));
    socket.on("room:removed", () => {
      setClosedMessage("You were removed from this room by the admin.");
      socket.disconnect();
    });
    socket.on("room:ended", () => {
      setClosedMessage("This room has ended.");
      socket.disconnect();
    });
    socket.on("code:update", ({ code: nextCode }: { code: string }) => setCode(nextCode));
    socket.on("chat:message", (nextMessage: { author: string; body: string }) => {
      setChat((current) => [...current, nextMessage]);
    });

    socket.on("battle:state", (nextBattle: BattleState) => {
      setBattle(nextBattle.phase === "idle" ? null : nextBattle);
    });
    socket.on("battle:tick", ({ participants }: { participants: BattleState["participants"] }) => {
      setBattle((current) => (current ? { ...current, participants } : current));
    });
    socket.on("battle:kicked", () => {
      setBattleKicked(true);
      setBattle(null);
    });
    socket.on("battle:ended", () => undefined);

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room:joined");
      socket.off("room:state");
      socket.off("arena:state");
      socket.off("room:error");
      socket.off("room:removed");
      socket.off("room:ended");
      socket.off("code:update");
      socket.off("chat:message");
      socket.off("battle:state");
      socket.off("battle:tick");
      socket.off("battle:kicked");
      socket.off("battle:ended");
      socket.disconnect();
    };
  }, [hasJoined, joinedEmail, joinedName, product, roomId, socket]);

  useEffect(() => {
    if (leetcodeProblems.length > 0) return;
    if (leetcodeLoading) return;
    setLeetcodeLoading(true);
    setLeetcodeError("");
    fetchLeetcodeList()
      .then((list) => setLeetcodeProblems(list))
      .catch((error: unknown) => setLeetcodeError(error instanceof Error ? error.message : "Failed to load LeetCode"))
      .finally(() => setLeetcodeLoading(false));
  }, [leetcodeProblems.length, leetcodeLoading]);

  useEffect(() => {
    if (!selectedProblemSlug) return;
    if (problems.find((p) => p.slug === selectedProblemSlug)) return;
    if (leetcodeSelected?.slug === selectedProblemSlug) return;
    const cached = getCachedLeetcodeProblem(selectedProblemSlug);
    if (cached) {
      setLeetcodeSelected(cached);
      return;
    }
    setLeetcodeFetching(true);
    fetchLeetcodeProblem(selectedProblemSlug)
      .then((problem) => {
        if (problem) setLeetcodeSelected(problem);
      })
      .finally(() => setLeetcodeFetching(false));
  }, [selectedProblemSlug, leetcodeSelected]);

  function joinRoom() {
    const nextName = joinName.trim();
    if (!nextName) {
      setJoinError("Display name is required.");
      return;
    }
    setJoinError("");
    setJoinedName(nextName);
    setJoinedEmail(joinEmail.trim().toLowerCase());
  }

  function updateCode(value: string) {
    setCode(value);
    socket.emit("code:update", { roomId, code: value });
  }

  async function selectProblem(input: Problem | LeetcodeListEntry) {
    const slug = "slug" in input ? input.slug : "";
    setSelectedProblemSlug(slug);
    setSubmission(null);

    let detail: Problem | LeetcodeProblem | null = null;
    const curated = problems.find((p) => p.slug === slug);
    if (curated) {
      detail = curated;
    } else {
      const cached = getCachedLeetcodeProblem(slug);
      if (cached) {
        detail = cached;
      } else {
        setLeetcodeFetching(true);
        detail = await fetchLeetcodeProblem(slug);
        setLeetcodeFetching(false);
        if (detail) setLeetcodeSelected(detail);
      }
    }

    if (detail) {
      const starter = detail.starters[language] ?? detail.starters.javascript ?? "";
      setCode(starter);
      socket.emit("code:update", { roomId, code: starter });
    }
    socket.emit("arena:select-problem", { roomId, slug });
  }

  function selectLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    socket.emit("arena:language:update", { roomId, language: nextLanguage });
    if (selectedProblem) {
      const starter = selectedProblem.starters[nextLanguage] ?? "";
      setCode(starter);
      socket.emit("code:update", { roomId, code: starter });
    }
  }

  async function runArena(mode: "run" | "submit") {
    if (!selectedProblem) {
      setNotice("Select a problem before running code.");
      return;
    }

    setRunning(true);
    setSubmission(null);
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: "arena",
          roomId,
          problemSlug: selectedProblem.slug,
          language,
          code,
          mode,
          tests: selectedProblem.tests
        })
      });
      setSubmission(await response.json());
    } catch {
      setNotice("Submission service is not available.");
    } finally {
      setRunning(false);
    }
  }

  function sendMessage() {
    if (!message.trim()) return;
    const payload = { roomId, author: joinedName, body: message.trim() };
    socket.emit("chat:message", payload);
    setMessage("");
  }

  const reloadMcp = useCallback(async () => {
    setMcpLoadError("");
    try {
      const [statusRes, toolsRes, resourcesRes] = await Promise.all([
        fetch(`${apiBaseUrl}/mcp/status`).then((r) => r.json()),
        fetch(`${apiBaseUrl}/mcp/tools`).then((r) => r.json()),
        fetch(`${apiBaseUrl}/mcp/resources`).then((r) => r.json())
      ]);
      setMcpStatus(statusRes);
      if (Array.isArray(toolsRes.tools)) setMcpTools(toolsRes.tools);
      if (Array.isArray(resourcesRes.resources)) setMcpResources(resourcesRes.resources);
      if (Array.isArray(resourcesRes.templates)) setMcpResourceTemplates(resourcesRes.templates);
      if (statusRes.error) setMcpLoadError(statusRes.error);
    } catch (error) {
      setMcpLoadError(error instanceof Error ? error.message : "Failed to reach MCP");
      setMcpStatus({ online: false, error: "fetch failed" });
    }
  }, []);

  useEffect(() => {
    if (product !== "collaborative") return;
    if (collabPanel !== "mcp") return;
    void reloadMcp();
  }, [product, collabPanel, reloadMcp]);

  async function invokeMcpTool(name: string, args: Record<string, unknown> = {}) {
    setMcpInvoking(name);
    setMcpToolResult(null);
    try {
      const res = await fetch(`${apiBaseUrl}/mcp/invoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, arguments: args })
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        result?: { content?: Array<{ type?: string; text?: string }> };
        error?: string;
      };
      const text = payload.result?.content?.map((part) => part.text ?? "").filter(Boolean).join("\n\n") ?? payload.error ?? "(no output)";
      setMcpToolResult({ name, output: text });
    } catch (error) {
      setMcpToolResult({ name, output: error instanceof Error ? error.message : "Invocation failed" });
    } finally {
      setMcpInvoking(null);
    }
  }

  async function sendAiMessage(prompt?: string) {
    const content = (prompt ?? aiInput).trim();
    if (!content || aiLoading) return;

    setAiInput("");
    const nextMessages = [...aiMessages, { role: "user" as const, content }];
    setAiMessages(nextMessages);
    setAiLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/collab/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          roomId,
          currentFileId: activeCollabFile?.id,
          fileName: activeCollabFile?.name,
          history: nextMessages.slice(-8)
        })
      });
      const payload = (await res.json()) as { reply?: string; error?: string };
      setAiMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: payload.reply ?? payload.error ?? "AI returned an empty response."
        }
      ]);
    } catch {
      setAiMessages((current) => [
        ...current,
        { role: "assistant", content: "AI service unreachable. Check that the API is running on port 4000." }
      ]);
    } finally {
      setAiLoading(false);
    }
  }

  async function sendMcpMessage(prompt?: string) {
    const content = (prompt ?? mcpInput).trim();
    if (!content || mcpLoading) return;

    setMcpInput("");
    setMcpMessages((current) => [...current, { role: "user", content }]);
    setMcpLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/mcp/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          roomId,
          problemSlug: selectedProblem?.slug,
          language,
          code
        })
      });
      const payload = (await response.json()) as { reply?: string; toolCalls?: McpToolCall[] };
      setMcpMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: payload.reply ?? "MCP AI returned an empty response.",
          toolCalls: payload.toolCalls ?? []
        }
      ]);
    } catch {
      setMcpMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "MCP AI server is unreachable. Check the API service on port 4000."
        }
      ]);
    } finally {
      setMcpLoading(false);
    }
  }

  async function shareRoom() {
    const url = `${window.location.origin}/rooms/${roomId}?product=${product}`;
    await navigator.clipboard.writeText(url);
    setNotice("Room link copied. New users will enter their display name before joining.");
  }

  function inviteUser() {
    const nextEmail = inviteEmail.trim().toLowerCase();
    if (!nextEmail) return;
    socket.emit("room:invite", { roomId, email: nextEmail });
    setInviteEmail("");
  }

  function removeUser(socketId: string) {
    socket.emit("room:remove-user", { roomId, socketId });
  }

  function endRoom() {
    socket.emit("room:end", { roomId });
  }

  if (closedMessage) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center border-t border-white/10 bg-ink-950 px-5">
        <div className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.04] p-5 text-center shadow-glow">
          <h1 className="text-xl font-semibold text-white">{closedMessage}</h1>
          <a className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-white/15 px-4 text-sm font-semibold text-white/76 hover:bg-white/10" href={product === "arena" ? "/arena" : "/collaborative"}>
            Back to {product === "arena" ? "Arena" : "Collaborative Platform"}
          </a>
        </div>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center border-t border-white/10 bg-ink-950 px-5">
        <div className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-glow">
          <h1 className="text-xl font-semibold text-white">Join {product === "arena" ? "Arena" : "Collaborative"} Room</h1>
          <p className="mt-2 font-mono text-xs text-white/44">{roomId}</p>
          <div className="mt-5 grid gap-3">
            <input
              className="h-11 rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-white/32 focus:border-signal-cyan"
              placeholder="Display name required"
              value={joinName}
              onChange={(event) => {
                setJoinName(event.target.value);
                if (joinError) setJoinError("");
              }}
            />
            <input
              className="h-11 rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-white/32 focus:border-signal-cyan"
              placeholder="Email optional"
              type="email"
              value={joinEmail}
              onChange={(event) => setJoinEmail(event.target.value)}
            />
            <Button type="button" icon={<LogIn size={16} />} onClick={joinRoom}>Join Room</Button>
            {joinError && <p className="text-sm font-medium text-signal-rose">{joinError}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (product === "collaborative") {
    return (
      <div className="flex min-h-[calc(100vh-72px)] flex-col border-t border-white/10 bg-ink-950 text-white">
        <div className="flex min-h-0 flex-1">
          <ActivityBar view={sidebarView} onChange={setSidebarView} online={activeUsers.length} />
          <div className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-ink-950/95">
            <div className="shrink-0 border-b border-white/10 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-bold uppercase tracking-wider text-white/80">Codexa · Collab</div>
                  <div className="truncate font-mono text-[10px] text-white/40">{roomId}</div>
                </div>
                <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white/72">
                  <Shield size={10} />
                  {currentRole ?? "joining"}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={shareRoom}
                  className="flex h-7 items-center justify-center gap-1 rounded border border-white/10 bg-white/[0.03] text-[11px] font-semibold text-white/72 transition hover:bg-white/10"
                >
                  <Copy size={11} /> Share
                </button>
                <button
                  type="button"
                  onClick={endRoom}
                  className="flex h-7 items-center justify-center gap-1 rounded border border-signal-rose/20 bg-signal-rose/10 text-[11px] font-semibold text-signal-rose transition hover:bg-signal-rose/20"
                >
                  <Trash2 size={11} /> End
                </button>
              </div>
              {notice && <div className="mt-2 rounded border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[11px] leading-4 text-white/60">{notice}</div>}
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {sidebarView === "explorer" && (
                <FileExplorer
                  files={collabFiles}
                  activeFileId={activeCollabFile?.id}
                  displayName={joinedName}
                  onOpen={(fileId) => setOpenFileRequest({ id: fileId, nonce: Date.now() })}
                  onCreate={(name) => socket.emit("file:create", { roomId, name })}
                  onRename={(fileId, name) => socket.emit("file:rename", { roomId, fileId, name })}
                  onClose={(fileId) => socket.emit("file:close", { roomId, fileId })}
                />
              )}

              {sidebarView === "search" && (
                <FileSearch
                  socket={socket}
                  roomId={roomId}
                  onOpen={(fileId) => {
                    setOpenFileRequest({ id: fileId, nonce: Date.now() });
                    setSidebarView("explorer");
                  }}
                />
              )}

              {sidebarView === "members" && (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex h-9 items-center justify-between border-b border-white/10 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/64">
                    <span>Members</span>
                    <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] text-white/56">{activeUsers.length}</span>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto p-2">
                    {activeUsers.map((user) => (
                      <div key={user.socketId} className="group mb-1 flex items-center gap-2 rounded px-2 py-1.5 text-xs text-white/80 transition hover:bg-white/[0.05]">
                        <span className={`size-2 shrink-0 rounded-full ${user.role === "admin" ? "bg-signal-cyan" : "bg-white/40"}`} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">{user.name}</div>
                          {user.email && <div className="truncate text-[10px] text-white/40">{user.email}</div>}
                        </div>
                        <span className="text-[10px] uppercase tracking-wide text-white/40">{user.role}</span>
                        {isAdmin && user.role !== "admin" && (
                          <button
                            type="button"
                            className="size-5 text-white/30 opacity-0 transition group-hover:opacity-100 hover:text-signal-rose"
                            onClick={() => removeUser(user.socketId)}
                            aria-label={`Remove ${user.name}`}
                            title={`Remove ${user.name}`}
                          >
                            <UserRoundX size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {isAdmin && (
                    <div className="shrink-0 border-t border-white/10 p-2">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/52">Invite by email</div>
                      <div className="grid grid-cols-[1fr_auto] gap-1">
                        <input
                          className="h-7 rounded border border-white/10 bg-ink-950 px-2 text-[11px] outline-none placeholder:text-white/32 focus:border-signal-cyan"
                          placeholder="teammate@example.com"
                          type="email"
                          value={inviteEmail}
                          onChange={(event) => setInviteEmail(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") inviteUser();
                          }}
                        />
                        <button
                          type="button"
                          className="flex size-7 items-center justify-center rounded border border-white/10 text-white/64 transition hover:border-signal-cyan/40 hover:text-white"
                          onClick={inviteUser}
                          aria-label="Invite"
                        >
                          <MailPlus size={12} />
                        </button>
                      </div>
                      {invitedEmails.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {invitedEmails.map((item) => (
                            <span key={item} className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/56">{item}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col bg-[#0b0d13]">
            <CollaborativeEditor
              socket={socket}
              roomId={roomId}
              displayName={joinedName}
              joined={hasJoined}
              onActiveFileChange={setActiveCollabFile}
              onFilesChange={setCollabFiles}
              openFileRequest={openFileRequest}
            />
          </div>

          <aside className="flex w-[380px] shrink-0 flex-col overflow-hidden border-l border-white/10 bg-ink-950/80">
            <div className="grid shrink-0 grid-cols-3 gap-1 border-b border-white/10 bg-ink-950 p-1">
              {[
                { key: "chat", label: "Room Chat", icon: MessageSquare },
                { key: "ai", label: "AI Chat", icon: Bot },
                { key: "mcp", label: "MCP Server", icon: ServerCog }
              ].map((item) => {
                const Icon = item.icon;
                const active = collabPanel === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`flex h-9 items-center justify-center gap-1.5 rounded text-xs font-semibold transition ${
                      active ? "bg-white text-ink-950" : "text-white/58 hover:bg-white/[0.08] hover:text-white"
                    }`}
                    onClick={() => setCollabPanel(item.key as CollabPanel)}
                  >
                    <Icon size={13} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              {collabPanel === "chat" && (
                <div className="flex h-full flex-col rounded-lg border border-white/10 bg-white/[0.03]">
                  <div className="flex h-10 items-center gap-2 border-b border-white/10 px-3 text-sm font-semibold text-white/72">
                    <MessageSquare size={15} />
                    Room Chat
                  </div>
                  <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
                    {chat.length === 0 && <div className="rounded-md border border-white/10 p-3 text-sm text-white/46">No messages yet. Say hi.</div>}
                    {chat.map((item, index) => (
                      <div key={`${item.author}-${index}`} className="rounded-md bg-white/[0.05] p-3">
                        <div className="text-xs font-semibold text-signal-cyan">{item.author}</div>
                        <div className="mt-1 text-sm text-white/76">{item.body}</div>
                      </div>
                    ))}
                  </div>
                  <div className="grid shrink-0 grid-cols-[1fr_auto] gap-2 border-t border-white/10 p-3">
                    <input
                      className="h-10 rounded-md border border-white/10 bg-ink-950 px-3 text-sm outline-none focus:border-signal-cyan"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") sendMessage();
                      }}
                      placeholder="Message your room"
                    />
                    <Button variant="secondary" icon={<Send size={16} />} onClick={sendMessage} aria-label="Send" />
                  </div>
                </div>
              )}

              {collabPanel === "ai" && (
                <div className="flex h-full flex-col rounded-lg border border-white/10 bg-white/[0.03]">
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                      <Bot size={16} />
                      AI Pair Programmer
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-signal-cyan/30 bg-signal-cyan/10 px-2 py-1 text-[11px] font-semibold text-signal-cyan">
                      <Sparkles size={12} />
                      {activeCollabFile?.name ?? "no file"}
                    </span>
                  </div>

                  <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-white/10 p-3">
                    {["Explain this file", "Review the code", "Suggest a refactor", "Write tests"].map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        disabled={aiLoading}
                        className="h-9 rounded-md border border-white/10 bg-white/[0.04] px-2 text-xs font-semibold text-white/66 transition hover:border-signal-cyan/40 hover:text-white disabled:opacity-40"
                        onClick={() => sendAiMessage(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
                    {aiMessages.map((item, index) => (
                      <div
                        key={`${item.role}-${index}`}
                        className={`rounded-lg border p-3 ${
                          item.role === "user" ? "border-signal-cyan/20 bg-signal-cyan/10" : "border-white/10 bg-white/[0.045]"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs font-semibold text-white/54">
                          {item.role === "assistant" ? <Bot size={13} /> : <MessageSquare size={13} />}
                          {item.role === "assistant" ? "AI" : joinedName}
                        </div>
                        <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/76">{item.content}</div>
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/58">
                        <Loader2 className="animate-spin" size={15} />
                        Thinking…
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 border-t border-white/10 p-3">
                    <textarea
                      className="h-20 w-full resize-none rounded-md border border-white/10 bg-ink-950 p-3 text-sm leading-5 text-white outline-none placeholder:text-white/32 focus:border-signal-cyan"
                      placeholder="Ask the AI about your code…"
                      value={aiInput}
                      onChange={(event) => setAiInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          sendAiMessage();
                        }
                      }}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button type="button" icon={<Send size={16} />} disabled={aiLoading} onClick={() => sendAiMessage()}>Send</Button>
                    </div>
                  </div>
                </div>
              )}

              {collabPanel === "mcp" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                        <ServerCog size={16} />
                        MCP Server
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold ${
                          mcpStatus?.online ? "border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan" : "border-signal-rose/30 bg-signal-rose/10 text-signal-rose"
                        }`}
                      >
                        <Plug size={12} />
                        {mcpStatus?.online ? mcpStatus.serverInfo?.name ?? "online" : "offline"}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-1 rounded-md bg-ink-950 p-2 font-mono text-[11px] leading-4 text-white/56">
                      <div>endpoint: {mcpStatus?.url ?? "(unknown)"}</div>
                      <div>version: {mcpStatus?.serverInfo?.version ?? "?"} · protocol {mcpStatus?.protocolVersion ?? "?"}</div>
                      <div className="mt-1 text-white/40">stdio: pnpm --filter @codexa/mcp dev</div>
                      <div className="text-white/40">http: pnpm --filter @codexa/mcp dev:http</div>
                    </div>
                    {mcpLoadError && (
                      <div className="mt-2 rounded-md border border-signal-rose/30 bg-signal-rose/5 px-3 py-2 text-xs text-signal-rose">{mcpLoadError}</div>
                    )}
                    <div className="mt-3">
                      <button
                        type="button"
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-white/10 px-2 text-xs text-white/64 transition hover:border-signal-cyan/40 hover:text-white"
                        onClick={() => void reloadMcp()}
                      >
                        <Loader2 size={12} className={mcpInvoking ? "animate-spin" : ""} />
                        Refresh
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.03]">
                    <div className="flex h-10 items-center gap-2 border-b border-white/10 px-3 text-sm font-semibold text-white/72">
                      <FlaskConical size={15} />
                      Tools ({mcpTools.length})
                    </div>
                    <div className="divide-y divide-white/10">
                      {mcpTools.length === 0 && (
                        <div className="px-3 py-4 text-xs text-white/40">
                          {mcpStatus?.online ? "No tools reported." : "Server offline — start with pnpm --filter @codexa/mcp dev:http"}
                        </div>
                      )}
                      {mcpTools.map((tool) => {
                        const isInvoking = mcpInvoking === tool.name;
                        const requiresArgs = (tool.inputSchema?.required?.length ?? 0) > 0;
                        return (
                          <div key={tool.name} className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-mono text-xs font-semibold text-signal-cyan">{tool.name}</div>
                                {tool.description && <div className="mt-1 text-xs leading-5 text-white/56">{tool.description}</div>}
                                {tool.inputSchema?.properties && (
                                  <div className="mt-2 flex flex-wrap gap-1 font-mono text-[10px] text-white/40">
                                    {Object.keys(tool.inputSchema.properties).map((arg) => (
                                      <span key={arg} className="rounded bg-ink-950 px-1.5 py-0.5">
                                        {arg}
                                        {tool.inputSchema?.required?.includes(arg) ? "*" : ""}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                disabled={Boolean(mcpInvoking) || requiresArgs}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-white/10 px-2 text-xs text-white/64 transition hover:border-signal-cyan/40 hover:text-white disabled:opacity-30"
                                onClick={() => invokeMcpTool(tool.name)}
                                title={requiresArgs ? "Requires arguments — invoke from code or MCP client" : "Invoke tool"}
                              >
                                {isInvoking ? <Loader2 size={12} className="animate-spin" /> : <PlayIcon size={12} />}
                                Run
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/[0.03]">
                    <div className="flex h-10 items-center gap-2 border-b border-white/10 px-3 text-sm font-semibold text-white/72">
                      <BookOpen size={15} />
                      Resources ({mcpResources.length + mcpResourceTemplates.length})
                    </div>
                    <div className="divide-y divide-white/10">
                      {mcpResources.length === 0 && mcpResourceTemplates.length === 0 && (
                        <div className="px-3 py-4 text-xs text-white/40">No resources reported.</div>
                      )}
                      {mcpResources.map((res) => (
                        <div key={res.uri} className="p-3">
                          <div className="font-mono text-xs font-semibold text-signal-cyan">{res.uri}</div>
                          {res.description && <div className="mt-1 text-xs leading-5 text-white/56">{res.description}</div>}
                          {res.mimeType && <div className="mt-1 text-[10px] uppercase tracking-wide text-white/36">{res.mimeType}</div>}
                        </div>
                      ))}
                      {mcpResourceTemplates.map((tmpl) => (
                        <div key={tmpl.uriTemplate} className="p-3">
                          <div className="font-mono text-xs font-semibold text-signal-cyan">{tmpl.uriTemplate}</div>
                          {tmpl.description && <div className="mt-1 text-xs leading-5 text-white/56">{tmpl.description}</div>}
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-white/36">
                            template{tmpl.mimeType ? ` · ${tmpl.mimeType}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {mcpToolResult && (
                    <div className="rounded-lg border border-white/10 bg-white/[0.03]">
                      <div className="flex h-10 items-center gap-2 border-b border-white/10 px-3 text-sm font-semibold text-white/72">
                        <Sparkles size={15} />
                        Last result · {mcpToolResult.name}
                      </div>
                      <pre className="max-h-80 overflow-auto whitespace-pre-wrap p-3 font-mono text-[11px] leading-5 text-white/72">{mcpToolResult.output}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
        <StatusBar
          roomId={roomId}
          displayName={joinedName}
          online={activeUsers.length}
          activeFileName={activeCollabFile?.name}
          language={activeCollabFile?.language}
          lockedBy={activeCollabFile?.lockedBy}
          connected={connected}
        />
      </div>
    );
  }

  return (
    <div className="arena-room-grid relative border-t border-white/10">
      {battleKicked && !battle && (
        <div className="absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-md border border-signal-rose/40 bg-signal-rose/10 px-4 py-2 text-sm font-semibold text-signal-rose shadow-lg">
          The host removed you from the Battle Mode lobby.
        </div>
      )}
      {battle && (
        <BattleModeShell
          socket={socket}
          roomId={roomId}
          battle={battle}
          isAdmin={isAdmin}
          displayName={joinedName}
          apiBaseUrl={apiBaseUrl}
          selfSocketId={socket.id}
        />
      )}
      <section className="border-r border-white/10 bg-ink-950/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">{product === "arena" ? "Arena Room" : "Collaborative Room"}</h1>
            <p className="mt-1 font-mono text-xs text-white/44">{roomId}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-white/72">
            <Shield size={14} />
            {currentRole ?? "joining"}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="secondary" icon={<Copy size={16} />} onClick={shareRoom}>Share Room</Button>
          <Button type="button" variant="secondary" icon={<Trash2 size={16} />} onClick={endRoom}>End Room</Button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isAdmin) socket.emit("battle:setup", { roomId });
          }}
          disabled={!isAdmin || Boolean(battle)}
          title={isAdmin ? "Open Battle Mode lobby" : "Only the host can start Battle Mode"}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-fuchsia-300/40 bg-gradient-to-r from-fuchsia-300/20 via-signal-cyan/20 to-amber-300/20 px-3 py-2.5 text-sm font-bold text-white transition hover:from-fuchsia-300/30 hover:via-signal-cyan/30 hover:to-amber-300/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Swords size={15} />
          {battle ? "Battle in progress" : isAdmin ? "Start Battle Mode" : "Battle Mode (host only)"}
        </button>

        {notice && <div className="mt-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/64">{notice}</div>}

        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03]">
          <div className="flex h-10 items-center justify-between border-b border-white/10 px-3">
            <span className="text-sm font-semibold text-white/72">Active Users</span>
            <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-xs text-white/56">{activeUsers.length}</span>
          </div>
          <div className="max-h-60 space-y-2 overflow-auto p-3">
            {activeUsers.map((user) => (
              <div key={user.socketId} className="flex items-center justify-between gap-3 rounded-md bg-white/[0.05] p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">{user.name}</div>
                  <div className="mt-1 truncate text-xs text-white/44">{user.email || "No email"}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/60">{user.role}</span>
                  {isAdmin && user.role !== "admin" && (
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-md border border-white/10 text-white/60 transition hover:border-signal-rose hover:text-signal-rose"
                      onClick={() => removeUser(user.socketId)}
                      aria-label={`Remove ${user.name}`}
                      title={`Remove ${user.name}`}
                    >
                      <UserRoundX size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {isAdmin && (
          <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="text-sm font-semibold text-white/72">Add User By Email</div>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <input
                className="h-10 rounded-md border border-white/10 bg-ink-950 px-3 text-sm outline-none placeholder:text-white/32 focus:border-signal-cyan"
                placeholder="teammate@example.com"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") inviteUser();
                }}
              />
              <Button type="button" variant="secondary" icon={<MailPlus size={16} />} onClick={inviteUser} aria-label="Add user by email" />
            </div>
            {invitedEmails.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {invitedEmails.map((item) => (
                  <span key={item} className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/56">{item}</span>
                ))}
              </div>
            )}
          </div>
        )}

      </section>
      <section className="flex min-h-[560px] flex-col bg-[#0b0d13]">
        {product === "arena" ? (
          <>
            <div className="grid gap-3 border-b border-white/10 p-3 sm:grid-cols-[190px_1fr_auto_auto]">
              <select
                className="h-10 rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-signal-cyan"
                value={language}
                onChange={(event) => selectLanguage(event.target.value as Language)}
                aria-label="Language"
              >
                {supportedLanguages.map((item) => (
                  <option key={item} value={item}>{languageLabels[item]}</option>
                ))}
              </select>
              <div className="flex min-w-0 items-center truncate font-mono text-xs text-white/52">
                {selectedProblem?.title ?? "No problem selected"}
              </div>
              <Button type="button" variant="secondary" icon={<Play size={16} />} disabled={running} onClick={() => runArena("run")}>Run</Button>
              <Button type="button" icon={<Send size={16} />} disabled={running} onClick={() => runArena("submit")}>Submit</Button>
            </div>
            <textarea
              className="min-h-0 flex-1 resize-none bg-transparent p-5 font-mono text-sm leading-6 text-white outline-none"
              value={code}
              spellCheck={false}
              onChange={(event) => updateCode(event.target.value)}
            />
          </>
        ) : (
          <CollaborativeEditor
            socket={socket}
            roomId={roomId}
            displayName={joinedName}
            joined={hasJoined}
            onActiveFileChange={setActiveCollabFile}
            onFilesChange={setCollabFiles}
            openFileRequest={openFileRequest}
          />
        )}
        {product === "arena" && (
          <div className="h-64 shrink-0 border-t border-white/10">
            <TerminalOutput
              title="TERMINAL · TEST RESULTS"
              entries={arenaTerminalEntries}
              loading={running}
              onClear={() => setSubmission(null)}
              footer={
                <div className="flex items-center justify-between text-[11px] text-white/56">
                  <span>
                    {submission
                      ? `${submission.status} · ${submission.runtimeMs}ms · ${submission.results.length} test${submission.results.length === 1 ? "" : "s"}`
                      : selectedProblem
                      ? `${selectedProblem.tests.length} test case${selectedProblem.tests.length === 1 ? "" : "s"} ready · ${languageLabels[language]}`
                      : "Select a problem to load test cases"}
                  </span>
                  {submission && (
                    <span className="text-white/40">
                      Passed {submission.results.filter((r) => r.status === "ACCEPTED").length}/{submission.results.length}
                    </span>
                  )}
                </div>
              }
            />
          </div>
        )}
      </section>
      {product === "arena" && (
        <aside className="overflow-auto border-l border-white/10 bg-ink-950/80 p-4">
          <div className="mb-4 grid grid-cols-4 gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
            {[
              { key: "problems", label: "Problems", icon: BookOpen },
              { key: "chat", label: "Chat", icon: MessageSquare },
              { key: "mcp", label: "MCP AI", icon: Bot },
              { key: "board", label: "Board", icon: PencilRuler }
            ].map((item) => {
              const Icon = item.icon;
              const active = arenaPanel === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`flex h-10 items-center justify-center gap-2 rounded-md text-xs font-semibold transition ${
                    active ? "bg-white text-ink-950" : "text-white/58 hover:bg-white/[0.08] hover:text-white"
                  }`}
                  onClick={() => setArenaPanel(item.key as ArenaPanel)}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {arenaPanel === "problems" && (
            <>
              <div className="rounded-lg border border-white/10 bg-white/[0.03]">
                <div className="flex h-10 items-center justify-between gap-2 border-b border-white/10 px-3 text-sm font-semibold text-white/72">
                  <span className="inline-flex items-center gap-2">
                    <BookOpen size={15} />
                    LeetCode Catalog
                  </span>
                  <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-[10px] font-normal text-white/56">
                    {leetcodeLoading ? "…" : `${leetcodeProblems.length} problems`}
                  </span>
                </div>
                <div className="grid gap-2 border-b border-white/10 p-3">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/32" size={15} />
                      <input
                        className="h-10 w-full rounded-md border border-white/10 bg-ink-950 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/32 focus:border-signal-cyan"
                        placeholder="Search problems"
                        value={problemQuery}
                        onChange={(event) => setProblemQuery(event.target.value)}
                      />
                    </div>
                    <select
                      className="h-10 rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-signal-cyan"
                      value={problemDifficulty}
                      onChange={(event) => setProblemDifficulty(event.target.value)}
                      aria-label="Difficulty"
                    >
                      <option value="">All</option>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                </div>
                {leetcodeError && (
                  <div className="border-b border-signal-rose/30 bg-signal-rose/10 px-3 py-2 text-xs text-signal-rose">{leetcodeError}</div>
                )}
                <div className="max-h-80 divide-y divide-white/10 overflow-auto">
                  {leetcodeLoading && filteredProblems.length === 0 && (
                    <div className="flex items-center gap-2 px-3 py-4 text-xs text-white/40">
                      <Loader2 size={12} className="animate-spin" />
                      Loading LeetCode catalog…
                    </div>
                  )}
                  {filteredProblems.slice(0, 100).map((problem) => (
                    <button
                      key={problem.slug}
                      type="button"
                      className={`w-full p-3 text-left transition hover:bg-white/[0.06] ${selectedProblemSlug === problem.slug ? "bg-white/[0.08]" : ""}`}
                      onClick={() => void selectProblem(problem)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-semibold text-white">
                          <span className="text-white/40">#{problem.frontendId}</span> {problem.title}
                        </span>
                        <span
                          className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] ${
                            problem.difficulty === "EASY"
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                              : problem.difficulty === "MEDIUM"
                              ? "border-amber-300/30 bg-amber-300/10 text-amber-300"
                              : "border-signal-rose/30 bg-signal-rose/10 text-signal-rose"
                          }`}
                        >
                          {problem.difficulty}
                        </span>
                      </div>
                    </button>
                  ))}
                  {filteredProblems.length > 100 && (
                    <div className="px-3 py-2 text-[11px] text-white/40">Showing first 100 — refine your search to narrow.</div>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                {leetcodeFetching && !selectedProblem ? (
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Loader2 size={14} className="animate-spin" />
                    Loading problem…
                  </div>
                ) : selectedProblem ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold text-white">{selectedProblem.title}</h2>
                      <span
                        className={`shrink-0 rounded-md border px-2 py-1 text-xs ${
                          selectedProblem.difficulty === "EASY"
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : selectedProblem.difficulty === "MEDIUM"
                            ? "border-amber-300/30 bg-amber-300/10 text-amber-300"
                            : "border-signal-rose/30 bg-signal-rose/10 text-signal-rose"
                        }`}
                      >
                        {selectedProblem.difficulty}
                      </span>
                    </div>
                    {selectedProblem.tags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedProblem.tags.slice(0, 6).map((tag) => (
                          <span key={tag} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/52">{tag}</span>
                        ))}
                      </div>
                    )}
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/64">{selectedProblem.statement}</p>

                    {selectedProblem.examples.length > 0 && (
                      <div className="mt-4">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Examples</div>
                        <div className="mt-2 space-y-2">
                          {selectedProblem.examples.map((example, index) => (
                            <div key={`${selectedProblem.slug}-ex-${index}`} className="rounded-md border border-white/10 bg-ink-950 p-3">
                              <div className="text-xs font-semibold text-white/54">Example {index + 1}</div>
                              <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-white/68">Input: {example.input}</pre>
                              <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-white/68">Output: {example.output}</pre>
                              {example.explanation && (
                                <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-white/48">Note: {example.explanation}</pre>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedProblem.tests.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                            Test Cases ({selectedProblem.tests.length})
                          </div>
                          <span className="text-[10px] text-white/40">
                            {selectedProblem.tests.filter((t) => !t.hidden).length} visible · {selectedProblem.tests.filter((t) => t.hidden).length} hidden
                          </span>
                        </div>
                        <div className="mt-2 space-y-2">
                          {selectedProblem.tests.map((test, idx) => (
                            <div
                              key={test.id || idx}
                              className={`rounded-md border bg-ink-950 p-3 ${test.hidden ? "border-white/10" : "border-signal-cyan/15"}`}
                            >
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-semibold text-white/64">Test {idx + 1} — {test.id}</span>
                                {test.hidden && <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-white/40">hidden</span>}
                              </div>
                              {!test.hidden ? (
                                <>
                                  <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-white/68">stdin: {test.input}</pre>
                                  <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-white/68">expected: {test.expected}</pre>
                                </>
                              ) : (
                                <div className="mt-2 font-mono text-[11px] text-white/40">Input and expected output are hidden until submission.</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedProblem.constraints?.length > 0 && (
                      <div className="mt-4">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Constraints</div>
                        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-white/64">
                          {selectedProblem.constraints.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-white/54">Pick a problem from the catalog to load test cases and starter code.</div>
                )}
              </div>
            </>
          )}

          {arenaPanel === "chat" && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03]">
              <div className="flex h-10 items-center gap-2 border-b border-white/10 px-3 text-sm font-semibold text-white/72">
                <MessageSquare size={15} />
                Room Chat
              </div>
              <div className="h-[calc(100vh-230px)] min-h-80 space-y-3 overflow-auto p-3">
                {chat.length === 0 && <div className="rounded-md border border-white/10 p-3 text-sm text-white/46">No messages yet.</div>}
                {chat.map((item, index) => (
                  <div key={`${item.author}-${index}`} className="rounded-md bg-white/[0.05] p-3">
                    <div className="text-xs font-semibold text-signal-cyan">{item.author}</div>
                    <div className="mt-1 text-sm text-white/76">{item.body}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-white/10 p-3">
                <input
                  className="h-10 rounded-md border border-white/10 bg-ink-950 px-3 text-sm outline-none focus:border-signal-cyan"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") sendMessage();
                  }}
                />
                <Button variant="secondary" onClick={sendMessage}>Send</Button>
              </div>
            </div>
          )}

          {arenaPanel === "mcp" && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03]">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                  <Bot size={16} />
                  MCP AI Server
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-signal-cyan/30 bg-signal-cyan/10 px-2 py-1 text-[11px] font-semibold text-signal-cyan">
                  <Sparkles size={12} />
                  Online
                </span>
              </div>

              <div className="grid gap-3 border-b border-white/10 p-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md border border-white/10 bg-ink-950 p-2">
                    <div className="text-[11px] uppercase tracking-wide text-white/36">Problem</div>
                    <div className="mt-1 truncate text-xs font-semibold text-white/72">{selectedProblem?.title ?? "None"}</div>
                  </div>
                  <div className="rounded-md border border-white/10 bg-ink-950 p-2">
                    <div className="text-[11px] uppercase tracking-wide text-white/36">Language</div>
                    <div className="mt-1 truncate text-xs font-semibold text-white/72">{languageLabels[language]}</div>
                  </div>
                  <div className="rounded-md border border-white/10 bg-ink-950 p-2">
                    <div className="text-[11px] uppercase tracking-wide text-white/36">Room</div>
                    <div className="mt-1 truncate font-mono text-xs font-semibold text-white/72">{roomId}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {["Give me hints", "Explain approach", "Review current code", "Generate edge cases"].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="h-9 rounded-md border border-white/10 bg-white/[0.04] px-2 text-xs font-semibold text-white/66 transition hover:border-signal-cyan/40 hover:text-white"
                      onClick={() => sendMcpMessage(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[calc(100vh-380px)] min-h-80 space-y-3 overflow-auto p-3">
                {mcpMessages.map((item, index) => (
                  <div
                    key={`${item.role}-${index}`}
                    className={`rounded-lg border p-3 ${
                      item.role === "user"
                        ? "border-signal-cyan/20 bg-signal-cyan/10"
                        : "border-white/10 bg-white/[0.045]"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-white/54">
                      {item.role === "assistant" ? <ServerCog size={13} /> : <MessageSquare size={13} />}
                      {item.role === "assistant" ? "MCP AI" : joinedName}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/76">{item.content}</div>
                    {item.toolCalls && item.toolCalls.length > 0 && (
                      <div className="mt-3 grid gap-2">
                        {item.toolCalls.map((tool, toolIndex) => (
                          <div key={`${tool.name}-${toolIndex}`} className="rounded-md border border-white/10 bg-ink-950 p-2">
                            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-signal-cyan">
                              <FlaskConical size={12} />
                              {tool.name}
                            </div>
                            <div className="mt-1 text-xs leading-5 text-white/54">{tool.output}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {mcpLoading && (
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-white/58">
                    <Loader2 className="animate-spin" size={15} />
                    Thinking through room context
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 p-3">
                <textarea
                  className="h-24 w-full resize-none rounded-md border border-white/10 bg-ink-950 p-3 text-sm leading-5 text-white outline-none placeholder:text-white/32 focus:border-signal-cyan"
                  placeholder="Ask MCP AI"
                  value={mcpInput}
                  onChange={(event) => setMcpInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMcpMessage();
                    }
                  }}
                />
                <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                  <div className="rounded-md bg-ink-950 p-2 font-mono text-[11px] leading-4 text-white/46">
                    <div>pnpm --filter @codexa/mcp dev:http</div>
                    <div>POST http://localhost:5050</div>
                  </div>
                  <Button type="button" icon={<Send size={16} />} disabled={mcpLoading} onClick={() => sendMcpMessage()} aria-label="Send MCP message" />
                </div>
              </div>
            </div>
          )}

          {arenaPanel === "board" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-white/78">
                    <PencilRuler size={16} />
                    Solution Board
                  </div>
                  <span className="truncate rounded-md border border-white/10 px-2 py-1 text-xs text-white/52">
                    {selectedProblem?.title ?? "Room"}
                  </span>
                </div>
              </div>
              <ExcalidrawBoard roomId={roomId} socket={socket} title={selectedProblem?.title} />
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
