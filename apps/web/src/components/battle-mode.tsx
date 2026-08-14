"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Socket } from "socket.io-client";
import type {
  BattleParticipant,
  BattleParticipantStatus,
  BattleState,
  Language,
  Submission
} from "@codexa/types";
import { problems, supportedLanguages } from "@codexa/problems";
import { TerminalOutput, type TerminalEntry } from "@/components/terminal-output";
import {
  fetchLeetcodeList,
  fetchLeetcodeProblem,
  getCachedLeetcodeProblem,
  type LeetcodeListEntry,
  type LeetcodeProblem
} from "@/lib/leetcode";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Crown,
  Flag,
  Loader2,
  Play,
  Send,
  Shield,
  Swords,
  Timer,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  XCircle,
  Zap
} from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), { ssr: false });

const DURATION_PRESETS = [
  { label: "15 min", ms: 15 * 60_000 },
  { label: "30 min", ms: 30 * 60_000 },
  { label: "45 min", ms: 45 * 60_000 },
  { label: "60 min", ms: 60 * 60_000 }
];

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

function formatDuration(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(totalSec / 60).toString().padStart(2, "0");
  const ss = (totalSec % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function statusBadge(status: BattleParticipantStatus) {
  switch (status) {
    case "coding":
      return { label: "Coding", cls: "border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan" };
    case "running":
      return { label: "Running tests", cls: "border-amber-300/30 bg-amber-300/10 text-amber-300" };
    case "submitted":
      return { label: "Submitted", cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" };
    case "disconnected":
      return { label: "Disconnected", cls: "border-signal-rose/30 bg-signal-rose/10 text-signal-rose" };
    case "joined":
    default:
      return { label: "Ready", cls: "border-white/15 bg-white/[0.05] text-white/72" };
  }
}

type Props = {
  socket: Socket;
  roomId: string;
  battle: BattleState;
  isAdmin: boolean;
  displayName: string;
  apiBaseUrl: string;
  selfSocketId?: string;
};

export function BattleModeShell(props: Props) {
  const { battle } = props;
  if (battle.phase === "lobby") return <BattleLobby {...props} />;
  if (battle.phase === "countdown") return <BattleCountdown {...props} />;
  if (battle.phase === "running") return <BattleArena {...props} />;
  if (battle.phase === "ended") return <BattleResults {...props} />;
  return null;
}

function useBattleProblem(slug?: string) {
  const [problem, setProblem] = useState<LeetcodeProblem | null>(() => {
    if (!slug) return null;
    const curated = problems.find((p) => p.slug === slug);
    if (curated) return curated as LeetcodeProblem;
    return getCachedLeetcodeProblem(slug);
  });
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!slug) {
      setProblem(null);
      return;
    }
    const curated = problems.find((p) => p.slug === slug);
    if (curated) {
      setProblem(curated as LeetcodeProblem);
      return;
    }
    const cached = getCachedLeetcodeProblem(slug);
    if (cached) {
      setProblem(cached);
      return;
    }
    setLoading(true);
    fetchLeetcodeProblem(slug)
      .then((value) => {
        if (value) setProblem(value);
      })
      .finally(() => setLoading(false));
  }, [slug]);
  return { problem, loading };
}

function BattleLobby({ socket, roomId, battle, isAdmin, displayName }: Props) {
  const { problem: selectedProblem, loading: problemLoading } = useBattleProblem(battle.problemSlug);
  const [showProblems, setShowProblems] = useState(false);
  const [customDuration, setCustomDuration] = useState("");
  const [catalog, setCatalog] = useState<LeetcodeListEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogDifficulty, setCatalogDifficulty] = useState("");
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!showProblems) return;
    if (catalog.length > 0) return;
    setCatalogLoading(true);
    fetchLeetcodeList()
      .then(setCatalog)
      .finally(() => setCatalogLoading(false));
  }, [showProblems, catalog.length]);

  const filteredCatalog = useMemo(() => {
    const needle = catalogQuery.trim().toLowerCase();
    return catalog.filter((p) => {
      const matchesQuery = needle ? p.title.toLowerCase().includes(needle) || p.slug.includes(needle) : true;
      const matchesDifficulty = catalogDifficulty ? p.difficulty === catalogDifficulty : true;
      return matchesQuery && matchesDifficulty;
    });
  }, [catalog, catalogQuery, catalogDifficulty]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-30 overflow-auto bg-ink-950/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex items-center justify-between">
          <div>
            <motion.div
              initial={reduce ? undefined : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/30 bg-fuchsia-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-fuchsia-200"
            >
              <Swords size={12} />
              Battle Mode · Lobby
            </motion.div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {isAdmin ? "Set the rules. Start the fight." : "Waiting for the host to start…"}
            </h1>
            <p className="mt-2 text-sm text-white/56">
              {isAdmin
                ? "Pick a problem, set a timer, kick anyone who shouldn't be here, then hit Start Battle."
                : "The host will pick a problem and a duration. You'll get a private editor when it starts."}
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => socket.emit("battle:cancel", { roomId })}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 px-3 text-xs font-semibold text-white/70 transition hover:border-signal-rose/40 hover:text-signal-rose"
            >
              <Flag size={13} />
              Cancel
            </button>
          )}
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Problem picker */}
          <motion.section
            initial={reduce ? undefined : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/64">Problem</h2>
              {isAdmin && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-white/70 hover:border-signal-cyan/40 hover:text-white"
                  onClick={() => setShowProblems((v) => !v)}
                >
                  {showProblems ? "Hide" : "Browse"}
                  <ChevronDown size={12} className={showProblems ? "rotate-180 transition" : "transition"} />
                </button>
              )}
            </div>

            {selectedProblem ? (
              <div className="mt-4 rounded-xl border border-signal-cyan/20 bg-signal-cyan/5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-base font-semibold text-white">{selectedProblem.title}</div>
                    <p className="mt-1 text-sm leading-6 text-white/64">{selectedProblem.summary}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      selectedProblem.difficulty === "EASY"
                        ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                        : selectedProblem.difficulty === "MEDIUM"
                        ? "border border-amber-300/30 bg-amber-300/10 text-amber-300"
                        : "border border-signal-rose/30 bg-signal-rose/10 text-signal-rose"
                    }`}
                  >
                    {selectedProblem.difficulty}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedProblem.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/56">
                      {tag}
                    </span>
                  ))}
                  <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-white/56">
                    <Clock size={11} /> ~{Math.round(battle.durationMs / 60_000)} min
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/52">
                {isAdmin ? "Browse and pick a problem to lock in." : "Host hasn't chosen a problem yet."}
              </div>
            )}

            <AnimatePresence>
              {showProblems && isAdmin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="mb-2 grid grid-cols-[1fr_auto] gap-2">
                    <input
                      placeholder="Search LeetCode problems"
                      value={catalogQuery}
                      onChange={(event) => setCatalogQuery(event.target.value)}
                      className="h-9 rounded-md border border-white/10 bg-ink-950 px-3 text-xs text-white outline-none focus:border-signal-cyan"
                    />
                    <select
                      value={catalogDifficulty}
                      onChange={(event) => setCatalogDifficulty(event.target.value)}
                      className="h-9 rounded-md border border-white/10 bg-ink-950 px-2 text-xs text-white outline-none focus:border-signal-cyan"
                    >
                      <option value="">All</option>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                  <div className="max-h-72 space-y-1.5 overflow-auto pr-1">
                    {catalogLoading && (
                      <div className="flex items-center gap-2 px-1 py-2 text-xs text-white/40">
                        <Loader2 size={12} className="animate-spin" />
                        Loading LeetCode catalog…
                      </div>
                    )}
                    {filteredCatalog.slice(0, 80).map((problem) => {
                      const active = problem.slug === battle.problemSlug;
                      return (
                        <button
                          key={problem.slug}
                          type="button"
                          onClick={() => socket.emit("battle:select-problem", { roomId, slug: problem.slug })}
                          className={`flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left transition ${
                            active ? "border-signal-cyan/40 bg-signal-cyan/10" : "border-white/10 hover:border-signal-cyan/30 hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white">
                              <span className="text-white/40">#{problem.frontendId}</span> {problem.title}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              problem.difficulty === "EASY"
                                ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                                : problem.difficulty === "MEDIUM"
                                ? "border border-amber-300/30 bg-amber-300/10 text-amber-300"
                                : "border border-signal-rose/30 bg-signal-rose/10 text-signal-rose"
                            }`}
                          >
                            {problem.difficulty}
                          </span>
                        </button>
                      );
                    })}
                    {!catalogLoading && filteredCatalog.length === 0 && (
                      <div className="px-1 py-2 text-xs text-white/40">No matches.</div>
                    )}
                    {filteredCatalog.length > 80 && (
                      <div className="px-1 py-2 text-[11px] text-white/40">Showing first 80 — refine to narrow.</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          {/* Right column: duration + participants */}
          <div className="flex flex-col gap-4">
            <motion.section
              initial={reduce ? undefined : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/64">Duration</h2>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {DURATION_PRESETS.map((preset) => {
                  const active = battle.durationMs === preset.ms;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => socket.emit("battle:set-duration", { roomId, durationMs: preset.ms })}
                      className={`h-10 rounded-lg border text-xs font-semibold transition ${
                        active ? "border-signal-cyan/50 bg-signal-cyan/15 text-white" : "border-white/10 text-white/64 hover:border-signal-cyan/30 hover:text-white"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              {isAdmin && (
                <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                  <input
                    placeholder="Custom (minutes)"
                    type="number"
                    min={1}
                    max={240}
                    value={customDuration}
                    onChange={(event) => setCustomDuration(event.target.value)}
                    className="h-10 rounded-md border border-white/10 bg-ink-950 px-3 text-xs text-white outline-none placeholder:text-white/32 focus:border-signal-cyan"
                  />
                  <button
                    type="button"
                    className="rounded-md border border-white/10 px-3 text-xs font-semibold text-white/72 transition hover:border-signal-cyan/40 hover:text-white"
                    onClick={() => {
                      const minutes = Number(customDuration);
                      if (!Number.isFinite(minutes) || minutes <= 0) return;
                      socket.emit("battle:set-duration", { roomId, durationMs: minutes * 60_000 });
                      setCustomDuration("");
                    }}
                  >
                    Set
                  </button>
                </div>
              )}
            </motion.section>

            <motion.section
              initial={reduce ? undefined : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white/64">
                  Participants
                  <span className="ml-2 rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] text-white/64">{battle.participants.length}</span>
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] text-white/56">
                  <Users size={11} />
                  Live
                </span>
              </div>

              <div className="mt-3 space-y-1.5 overflow-auto">
                {battle.participants.length === 0 && (
                  <div className="rounded-md border border-dashed border-white/10 p-4 text-center text-xs text-white/40">
                    Waiting for participants…
                  </div>
                )}
                {battle.participants.map((participant) => {
                  const isHost = participant.socketId === battle.hostSocketId;
                  return (
                    <motion.div
                      key={participant.socketId}
                      layout
                      className="flex items-center gap-3 rounded-lg border border-white/10 bg-ink-950/40 p-2.5"
                    >
                      <span
                        className={`flex size-8 items-center justify-center rounded-md font-bold text-ink-950 ${
                          isHost ? "bg-amber-300" : "bg-signal-cyan"
                        }`}
                      >
                        {participant.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                          {participant.name}
                          {isHost && <Crown size={12} className="text-amber-300" />}
                          {participant.name === displayName && <span className="text-[10px] text-white/40">(you)</span>}
                        </div>
                        <div className="text-[11px] uppercase tracking-wider text-white/40">{participant.role}</div>
                      </div>
                      {isAdmin && !isHost && (
                        <button
                          type="button"
                          onClick={() =>
                            socket.emit("battle:kick", { roomId, targetSocketId: participant.socketId })
                          }
                          className="flex size-7 items-center justify-center rounded-md text-white/40 transition hover:bg-signal-rose/10 hover:text-signal-rose"
                          title="Remove from battle"
                        >
                          <UserMinus size={13} />
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          </div>
        </div>

        {isAdmin && (
          <motion.div
            initial={reduce ? undefined : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-signal-cyan/20 bg-signal-cyan/[0.07] p-5"
          >
            <div>
              <div className="text-sm font-semibold text-white">Ready when you are.</div>
              <div className="mt-1 text-xs text-white/56">
                {selectedProblem ? `${selectedProblem.title} · ${Math.round(battle.durationMs / 60_000)} min · ${battle.participants.length} fighters` : "Select a problem first."}
              </div>
            </div>
            <button
              type="button"
              onClick={() => socket.emit("battle:start", { roomId })}
              disabled={!selectedProblem || battle.participants.length === 0}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-signal-cyan px-6 text-sm font-bold text-ink-950 transition hover:brightness-110 disabled:opacity-40"
            >
              <Zap size={16} />
              Start Battle
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function BattleCountdown({ battle }: Props) {
  const [tick, setTick] = useState(0);
  const remaining = battle.countdownEndsAt ? battle.countdownEndsAt - Date.now() : 0;
  const seconds = Math.max(0, Math.ceil(remaining / 1000));

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 200);
    return () => clearInterval(id);
  }, []);

  // Use tick to keep the component re-rendering for the countdown
  void tick;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden bg-ink-950/95 backdrop-blur"
    >
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle, rgba(25,211,218,0.18) 0%, transparent 60%)" }} />
      <AnimatePresence mode="wait">
        <motion.div
          key={seconds}
          initial={{ scale: 0.4, opacity: 0, rotate: -15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 0.45, type: "spring", stiffness: 220, damping: 16 }}
          className="relative flex flex-col items-center"
        >
          <div className="text-[260px] font-extrabold leading-none tracking-tighter">
            <span className="bg-gradient-to-br from-signal-cyan via-fuchsia-300 to-amber-300 bg-clip-text text-transparent">
              {seconds > 0 ? seconds : "GO!"}
            </span>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-signal-cyan/30 bg-ink-950/70 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-signal-cyan">
            <Swords size={13} />
            Get ready
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function BattleArena({ socket, roomId, battle, isAdmin, displayName, apiBaseUrl, selfSocketId }: Props) {
  const { problem } = useBattleProblem(battle.problemSlug);
  const [language, setLanguage] = useState<Language>("javascript");
  const [code, setCode] = useState<string>(() => problem?.starters[language] ?? "");
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [running, setRunning] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const meParticipant = useMemo(
    () => battle.participants.find((p) => p.socketId === selfSocketId),
    [battle.participants, selfSocketId]
  );
  const submittedAlready = meParticipant?.status === "submitted";
  const lastSubmitNonceRef = useRef(0);

  // Keep timer ticking locally between server ticks
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  // Reset code when language changes if user hasn't typed
  useEffect(() => {
    if (!problem) return;
    setCode((current) => (current.trim().length === 0 ? problem.starters[language] ?? "" : current));
  }, [language, problem]);

  // Initial starter on mount
  useEffect(() => {
    if (problem && code.trim().length === 0) {
      setCode(problem.starters[language] ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem]);

  const timeLeft = battle.endsAt ? Math.max(0, battle.endsAt - now) : 0;
  const totalMs = battle.durationMs;
  const pct = totalMs > 0 ? Math.max(0, Math.min(100, (timeLeft / totalMs) * 100)) : 0;
  const lowTime = timeLeft < 60_000;

  async function run(mode: "run" | "submit") {
    if (!problem) return;
    if (submittedAlready) return;
    setRunning(true);
    socket.emit("battle:status", { roomId, status: "running" });
    setSubmission(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: "arena",
          roomId,
          problemSlug: problem.slug,
          language,
          code,
          mode,
          tests: problem.tests
        })
      });
      const payload = (await res.json()) as Submission & { error?: string };
      setSubmission(payload);

      if (mode === "submit" && payload.results) {
        const passed = payload.results.filter((r) => r.status === "ACCEPTED").length;
        const total = payload.results.length;
        const nonce = ++lastSubmitNonceRef.current;
        void nonce;
        socket.emit("battle:submit", {
          roomId,
          passed,
          total,
          status: payload.status,
          runtimeMs: payload.runtimeMs
        });
      } else {
        socket.emit("battle:status", { roomId, status: "coding" });
      }
    } catch {
      socket.emit("battle:status", { roomId, status: "coding" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-ink-950"
    >
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-ink-950/95 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-signal-cyan/30 bg-signal-cyan/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-signal-cyan">
            <Swords size={12} />
            Battle running
          </span>
          {problem && <span className="text-sm font-semibold text-white">{problem.title}</span>}
        </div>
        <div className="flex items-center gap-3">
          <motion.div
            animate={lowTime ? { scale: [1, 1.04, 1] } : undefined}
            transition={{ repeat: Infinity, duration: 1 }}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-base font-bold tabular-nums ${
              lowTime ? "border-signal-rose/40 bg-signal-rose/15 text-signal-rose" : "border-white/15 bg-white/[0.05] text-white"
            }`}
          >
            <Timer size={14} />
            {formatDuration(timeLeft)}
          </motion.div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => socket.emit("battle:end", { roomId })}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-signal-rose/30 bg-signal-rose/10 px-3 text-xs font-semibold text-signal-rose transition hover:bg-signal-rose/20"
            >
              <Flag size={12} />
              End Battle
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-white/[0.06]">
        <motion.div
          className={`h-full ${lowTime ? "bg-signal-rose" : "bg-signal-cyan"}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "linear" }}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_1.4fr_320px] gap-px bg-white/10">
        {/* Problem */}
        <section className="flex min-h-0 flex-col overflow-auto bg-ink-950 p-5">
          {problem ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-white">{problem.title}</h2>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    problem.difficulty === "EASY"
                      ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      : problem.difficulty === "MEDIUM"
                      ? "border border-amber-300/30 bg-amber-300/10 text-amber-300"
                      : "border border-signal-rose/30 bg-signal-rose/10 text-signal-rose"
                  }`}
                >
                  {problem.difficulty}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/72">{problem.statement}</p>
              <div className="mt-4 space-y-3">
                {problem.examples.map((example, i) => (
                  <div key={i} className="rounded-md border border-white/10 bg-white/[0.03] p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Example {i + 1}</div>
                    <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-white/72">Input: {example.input}</pre>
                    <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-white/72">Output: {example.output}</pre>
                  </div>
                ))}
              </div>
              {problem.constraints.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Constraints</div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-white/64">
                    {problem.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-white/56">Problem unavailable.</div>
          )}
        </section>

        {/* Editor + results */}
        <section className="flex min-h-0 flex-col bg-[#0b0d13]">
          <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-ink-950 px-3">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-signal-cyan/30 bg-signal-cyan/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-signal-cyan">
                Your private editor
              </span>
              <select
                value={language}
                onChange={(event) => {
                  const next = event.target.value as Language;
                  setLanguage(next);
                  if (problem) setCode(problem.starters[next] ?? "");
                }}
                className="h-8 rounded-md border border-white/10 bg-ink-950 px-2 text-xs text-white outline-none focus:border-signal-cyan"
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang} value={lang}>{languageLabels[lang]}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={running || submittedAlready}
                onClick={() => run("run")}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-white/15 bg-white/[0.05] px-3 text-xs font-semibold text-white/82 transition hover:bg-white/10 disabled:opacity-40"
              >
                {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                Run
              </button>
              <button
                type="button"
                disabled={running || submittedAlready}
                onClick={() => run("submit")}
                className="inline-flex h-8 items-center gap-1 rounded-md bg-signal-cyan px-3 text-xs font-bold text-ink-950 transition hover:brightness-110 disabled:opacity-40"
              >
                {running ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Submit
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <MonacoEditor
              height="100%"
              theme="vs-dark"
              language={language}
              value={code}
              onChange={(value) => setCode(value ?? "")}
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                readOnly: submittedAlready
              }}
            />
          </div>
          <div className="h-52 shrink-0 border-t border-white/10">
            <TerminalOutput
              title="TERMINAL · BATTLE TESTS"
              entries={buildBattleTerminalEntries(submission, problem)}
              loading={running}
              footer={
                <div className="flex items-center justify-between text-[11px] text-white/56">
                  <span>
                    {submission
                      ? `${submission.status} · ${submission.runtimeMs}ms`
                      : problem
                      ? `${problem.tests.length} test case${problem.tests.length === 1 ? "" : "s"}`
                      : "No problem"}
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
        </section>

        {/* Status panel */}
        <aside className="flex min-h-0 flex-col overflow-auto bg-ink-950 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {isAdmin ? "Participant status" : "Battle status"}
          </div>
          {isAdmin ? (
            <div className="mt-3 space-y-1.5">
              {battle.participants.map((p) => {
                const badge = statusBadge(p.status);
                return (
                  <div key={p.socketId} className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${p.role === "admin" ? "bg-amber-300" : "bg-signal-cyan"}`} />
                        <span className="truncate text-xs font-semibold text-white">{p.name}</span>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    {p.result && (
                      <div className="mt-1.5 text-[10px] text-white/56">
                        {p.result.passed}/{p.result.total} passed · {p.result.runtimeMs}ms
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="text-xs text-white/56">You</div>
                <div className="mt-1 text-sm font-semibold text-white">{displayName}</div>
                <div className="mt-2 text-[11px]">
                  <span className={`rounded-full border px-2 py-0.5 font-bold uppercase ${statusBadge(meParticipant?.status ?? "joined").cls}`}>
                    {statusBadge(meParticipant?.status ?? "joined").label}
                  </span>
                </div>
                {meParticipant?.result && (
                  <div className="mt-2 text-[11px] text-white/56">
                    {meParticipant.result.passed}/{meParticipant.result.total} passed · {meParticipant.result.runtimeMs}ms
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-[11px] text-white/56">
                <div className="text-white/72">{battle.participants.length} fighters in this room.</div>
                <div className="mt-1">Other participants' code is hidden until the battle ends.</div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </motion.div>
  );
}

function BattleResults({ socket, roomId, battle, isAdmin }: Props) {
  const { problem } = useBattleProblem(battle.problemSlug);
  const sorted = useMemo(() => sortLeaderboard(battle.participants), [battle.participants]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-30 overflow-auto bg-ink-950/95 backdrop-blur"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 10%, rgba(252,211,77,0.18), transparent 40%), radial-gradient(circle at 80% 30%, rgba(244,114,182,0.16), transparent 45%)"
        }}
      />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <Trophy size={12} />
            Battle complete
          </div>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">
            <span className="bg-gradient-to-r from-amber-300 via-fuchsia-300 to-signal-cyan bg-clip-text text-transparent">
              Leaderboard
            </span>
          </h1>
          {problem && (
            <p className="mt-2 text-sm text-white/56">{problem.title} · {Math.round(battle.durationMs / 60_000)} min</p>
          )}
        </motion.header>

        <div className="space-y-2">
          {sorted.length === 0 && (
            <div className="rounded-2xl border border-white/10 p-8 text-center text-sm text-white/56">No submissions recorded.</div>
          )}
          {sorted.map((p, i) => {
            const podium = i < 3;
            const trophyColor = i === 0 ? "text-amber-300" : i === 1 ? "text-white/80" : i === 2 ? "text-amber-700" : "text-white/40";
            return (
              <motion.div
                key={p.socketId}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: i * 0.1, ease: "easeOut" }}
                className={`flex items-center gap-4 rounded-2xl border p-4 ${
                  podium ? "border-amber-300/30 bg-amber-300/[0.06]" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="flex w-16 items-center justify-center">
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.1 + 0.1, type: "spring", stiffness: 260 }}
                    className={`text-2xl font-bold ${trophyColor}`}
                  >
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </motion.span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-base font-semibold text-white">
                    {p.name}
                    {p.socketId === battle.hostSocketId && <Crown size={14} className="text-amber-300" />}
                  </div>
                  <div className="mt-1 text-xs text-white/56">
                    {p.result
                      ? `${p.result.passed} / ${p.result.total} passed · ${p.result.runtimeMs}ms · ${p.result.status}`
                      : "No submission"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {p.result && (
                    <>
                      <div className="rounded-md border border-white/10 bg-ink-950/60 px-3 py-1.5 text-center">
                        <div className="text-[10px] uppercase text-white/40">Pass</div>
                        <div className="font-mono text-sm text-white">
                          {p.result.passed}/{p.result.total}
                        </div>
                      </div>
                      <div className="rounded-md border border-white/10 bg-ink-950/60 px-3 py-1.5 text-center">
                        <div className="text-[10px] uppercase text-white/40">Time</div>
                        <div className="font-mono text-sm text-white">{p.result.runtimeMs}ms</div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
        >
          <div className="text-xs text-white/56">
            {battle.revealCode
              ? "Post-battle code sharing enabled."
              : "Other participants' code remains private."}
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => socket.emit("battle:reveal", { roomId, reveal: !battle.revealCode })}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white/72 transition hover:border-signal-cyan/40 hover:text-white"
              >
                <Shield size={13} />
                {battle.revealCode ? "Hide code" : "Reveal code"}
              </button>
              <button
                type="button"
                onClick={() => socket.emit("battle:cancel", { roomId })}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-signal-cyan px-3 text-xs font-bold text-ink-950 transition hover:brightness-110"
              >
                <UserPlus size={13} />
                New Battle
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

function buildBattleTerminalEntries(submission: Submission | null, problem: LeetcodeProblem | null): TerminalEntry[] {
  if (!submission || !submission.results) return [];
  const tests = problem?.tests ?? [];
  return submission.results.map((result, idx) => {
    const test = tests.find((t) => t.id === result.testCaseId) ?? tests[idx];
    const entry: TerminalEntry = {
      id: result.testCaseId || `test-${idx + 1}`,
      label: `test ${idx + 1}`,
      command: `battle test ${result.testCaseId || idx + 1}`,
      status: result.status,
      runtimeMs: result.runtimeMs
    };
    if (test) {
      entry.hidden = Boolean(test.hidden);
      if (test.input) entry.stdin = test.input;
      if (test.expected) entry.expected = test.expected;
    }
    if (result.stdout) entry.stdout = result.stdout;
    if (result.stderr) entry.stderr = result.stderr;
    return entry;
  });
}

function sortLeaderboard(participants: BattleParticipant[]) {
  return [...participants].sort((a, b) => {
    const aResult = a.result;
    const bResult = b.result;
    if (!aResult && !bResult) return a.name.localeCompare(b.name);
    if (!aResult) return 1;
    if (!bResult) return -1;
    if (aResult.passed !== bResult.passed) return bResult.passed - aResult.passed;
    if (aResult.runtimeMs !== bResult.runtimeMs) return aResult.runtimeMs - bResult.runtimeMs;
    return aResult.submittedAt.localeCompare(bResult.submittedAt);
  });
}

export type { Props as BattleModeShellProps };
