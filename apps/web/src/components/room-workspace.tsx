"use client";

import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@codexa/ui";
import { problems, supportedLanguages } from "@codexa/problems";
import type { ActiveRoomUser, ArenaRoomState, Language, Problem, RoomRole, Submission } from "@codexa/types";
import { apiBaseUrl } from "@/lib/api";
import { ExcalidrawBoard } from "@/components/excalidraw-board";
import { CollaborativeEditor } from "@/components/collaborative-editor";
import { BookOpen, Bot, Copy, FlaskConical, Loader2, LogIn, MailPlus, MessageSquare, PencilRuler, Play, Plug, Search, Send, ServerCog, Shield, Sparkles, Trash2, UserRoundX } from "lucide-react";

type CollabPanel = "chat" | "ai" | "mcp";

const collabMcpTools = [
  { name: "list_products", description: "List Codexa products (Collaborative + Arena)." },
  { name: "list_problems", description: "Browse Arena problems with optional filters." },
  { name: "get_problem", description: "Fetch full JSON for a problem by slug." },
  { name: "get_solution", description: "Get a reference solution in a given language." },
  { name: "get_editorial", description: "Get the editorial markdown for a problem." },
  { name: "get_hints", description: "Get progressive hints for a problem." },
  { name: "validate_solution", description: "Submit code to the executor and return results." }
];

const collabMcpResources = [
  { uri: "problem://{slug}", description: "Problem JSON" },
  { uri: "solution://{slug}/{language}", description: "Reference solution" },
  { uri: "editorial://{slug}", description: "Editorial markdown" }
];

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
  const [activeCollabFile, setActiveCollabFile] = useState<{ id: string; name: string } | null>(null);
  const socket = useMemo<Socket>(() => io(apiBaseUrl, { autoConnect: false }), []);
  const hasJoined = Boolean(joinedName.trim());
  const currentUser = activeUsers.find((user) => user.socketId === socket.id);
  const currentRole = currentUser?.role ?? role;
  const isAdmin = currentRole === "admin";
  const selectedProblem = useMemo(
    () => problems.find((problem) => problem.slug === selectedProblemSlug),
    [selectedProblemSlug]
  );
  const filteredProblems = useMemo(() => {
    const needle = problemQuery.trim().toLowerCase();
    return problems.filter((problem) => {
      const matchesQuery = needle
        ? [problem.title, problem.summary, ...problem.tags].join(" ").toLowerCase().includes(needle)
        : true;
      const matchesDifficulty = problemDifficulty ? problem.difficulty === problemDifficulty : true;
      return matchesQuery && matchesDifficulty;
    });
  }, [problemDifficulty, problemQuery]);

  useEffect(() => {
    if (!hasJoined) return;

    socket.connect();
    socket.emit("room:join", {
      roomId,
      product,
      name: joinedName,
      email: joinedEmail || undefined
    });

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

    return () => {
      socket.off("room:joined");
      socket.off("room:state");
      socket.off("arena:state");
      socket.off("room:error");
      socket.off("room:removed");
      socket.off("room:ended");
      socket.off("code:update");
      socket.off("chat:message");
      socket.disconnect();
    };
  }, [hasJoined, joinedEmail, joinedName, product, roomId, socket]);

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

  function selectProblem(problem: Problem) {
    const starter = problem.starters[language] ?? problem.starters.javascript ?? "";
    setSelectedProblemSlug(problem.slug);
    setCode(starter);
    setSubmission(null);
    socket.emit("arena:select-problem", { roomId, slug: problem.slug });
    socket.emit("code:update", { roomId, code: starter });
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
          mode
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

  return (
    <div className="arena-room-grid border-t border-white/10">
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
          <CollaborativeEditor socket={socket} roomId={roomId} displayName={joinedName} joined={hasJoined} onActiveFileChange={setActiveCollabFile} />
        )}
        {product === "arena" && (
          <div className="border-t border-white/10 bg-ink-950 p-4">
            <div className="text-sm font-semibold text-white">Results</div>
            {!submission && <div className="mt-2 text-sm text-white/46">No submission yet.</div>}
            {submission && (
              <div className="mt-3 grid gap-2">
                <div className="text-sm text-white/72">{submission.status} in {submission.runtimeMs}ms</div>
                {submission.results.map((result) => (
                  <div key={result.testCaseId} className="rounded-md border border-white/10 bg-white/[0.04] p-3 font-mono text-xs text-white/68">
                    <div>{result.testCaseId}: {result.status}</div>
                    {result.stdout && <pre className="mt-2 whitespace-pre-wrap text-white/58">{result.stdout}</pre>}
                    {result.stderr && <pre className="mt-2 whitespace-pre-wrap text-signal-rose">{result.stderr}</pre>}
                  </div>
                ))}
              </div>
            )}
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
                <div className="flex h-10 items-center gap-2 border-b border-white/10 px-3 text-sm font-semibold text-white/72">
                  <BookOpen size={15} />
                  Room Problems
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
                <div className="max-h-80 divide-y divide-white/10 overflow-auto">
                  {filteredProblems.map((problem) => (
                    <button
                      key={problem.slug}
                      type="button"
                      className={`w-full p-3 text-left transition hover:bg-white/[0.06] ${selectedProblemSlug === problem.slug ? "bg-white/[0.08]" : ""}`}
                      onClick={() => selectProblem(problem)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-semibold text-white">{problem.title}</span>
                        <span className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-white/56">{problem.difficulty}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-white/50">{problem.summary}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                {selectedProblem ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-lg font-semibold text-white">{selectedProblem.title}</h2>
                      <span className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/60">{selectedProblem.difficulty}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/64">{selectedProblem.statement}</p>
                    <div className="mt-4 space-y-3">
                      {selectedProblem.examples.map((example, index) => (
                        <div key={`${selectedProblem.slug}-${index}`} className="rounded-md border border-white/10 bg-ink-950 p-3">
                          <div className="text-xs font-semibold text-white/54">Example {index + 1}</div>
                          <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-white/68">Input: {example.input}</pre>
                          <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-white/68">Output: {example.output}</pre>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-white/54">Select a room problem to load the collaborative starter code.</div>
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
