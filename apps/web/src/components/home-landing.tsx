"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Boxes,
  CheckCircle2,
  Cloud,
  Code2,
  Cpu,
  Database,
  FileCode2,
  Flame,
  Gauge,
  Layers,
  Lock,
  MessageSquare,
  MousePointer2,
  Network,
  Plug,
  Radio,
  ShieldCheck,
  Sparkles,
  Swords,
  Terminal,
  Trophy,
  UsersRound,
  Workflow
} from "lucide-react";
import {
  Bento,
  BentoCard,
  ConicBeam,
  DotGrid,
  Eyebrow,
  GradientMesh,
  IDEPanel,
  LiveDot,
  MetricRow,
  SectionHeader,
  Spotlight,
  StackMarquee,
  TerminalPanel
} from "@/components/landing-ui";

const heroCode = `// codexa — shared awareness across every room
import { Awareness } from "y-protocols/awareness";
import { MonacoBinding } from "y-monaco";
import { io } from "socket.io-client";

export function joinRoom(doc, editor, user) {
  const awareness = new Awareness(doc);
  awareness.setLocalState({
    user: { name: user.name, color: user.color },
    cursor: { line: 0, ch: 0 }
  });

  const socket = io("/rooms", { auth: { roomId: user.roomId } });
  socket.on("sync", (update) => Y.applyUpdate(doc, update));

  return new MonacoBinding(
    doc.getText("file"),
    editor.getModel(),
    new Set([editor]),
    awareness
  );
}`;

const universalFeatures = [
  {
    Icon: Radio,
    title: "Realtime by default",
    body: "Every keystroke, tab, cursor, and chat message is synced through Socket.IO and Yjs awareness — under 60ms in steady state.",
    tone: "cyan" as const
  },
  {
    Icon: Bot,
    title: "AI that reads your file",
    body: "Both products share an OpenRouter-backed AI panel that streams against the active file's current content, not a stale snapshot.",
    tone: "violet" as const
  },
  {
    Icon: Plug,
    title: "Live MCP surface",
    body: "Each room exposes a working Model Context Protocol panel — real tools, real resources, one-click invocation against the server.",
    tone: "fuchsia" as const
  },
  {
    Icon: ShieldCheck,
    title: "Sandboxed execution",
    body: "Submissions run in disposable Docker containers: no network, 256 MB cap, 5s wall, dropped caps, tmpfs work dir.",
    tone: "amber" as const
  }
];

const stackRows = [
  { label: "Realtime", value: "Yjs · y-monaco · Socket.IO", Icon: Cpu },
  { label: "Editor", value: "Monaco · Tailwind · React 19", Icon: FileCode2 },
  { label: "Data", value: "Prisma · Postgres · Redis", Icon: Database },
  { label: "Jobs", value: "BullMQ · Dockerode", Icon: Gauge },
  { label: "Network", value: "Next.js 15 · Edge-ready", Icon: Network },
  { label: "AI", value: "OpenRouter · MCP", Icon: Plug }
];

const products = [
  {
    kind: "collab",
    title: "Collaborative",
    headline: "Multiplayer VS Code, shared in real time.",
    subtitle: "Real-time VS Code, multi-user. Live cursors, multi-file tabs, AI pair programmer, and a live MCP server panel.",
    href: "/collaborative",
    border: "border-signal-cyan/30",
    badge: "border-signal-cyan/40 bg-signal-cyan/10 text-signal-cyan",
    accent: "text-signal-cyan",
    Icon: UsersRound,
    bullets: [
      { Icon: MousePointer2, label: "Yjs awareness" },
      { Icon: FileCode2, label: "Shared tabs" },
      { Icon: Lock, label: "Owner locks" },
      { Icon: Bot, label: "AI pair" }
    ]
  },
  {
    kind: "arena",
    title: "Arena",
    headline: "A sandboxed arena where code is graded live.",
    subtitle: "Multiplayer LeetCode-style arena with sandboxed code execution, 11 problems, 13 languages, and a live MCP tool surface.",
    href: "/arena",
    border: "border-fuchsia-300/30",
    badge: "border-fuchsia-300/40 bg-fuchsia-300/10 text-fuchsia-200",
    accent: "text-fuchsia-200",
    Icon: Swords,
    bullets: [
      { Icon: Trophy, label: "11 problems" },
      { Icon: Boxes, label: "13 languages" },
      { Icon: ShieldCheck, label: "Docker" },
      { Icon: Sparkles, label: "MCP tools" }
    ]
  },
  {
    kind: "system-design",
    title: "System Design",
    headline: "Draw the system, then break it on purpose.",
    subtitle: "Browser-based whiteboard with 40+ infrastructure components, interview templates, chaos scenarios, and AI-driven critique.",
    href: "/system-design",
    border: "border-emerald-300/30",
    badge: "border-emerald-300/40 bg-emerald-300/10 text-emerald-300",
    accent: "text-emerald-300",
    Icon: Workflow,
    bullets: [
      { Icon: Cloud, label: "40+ components" },
      { Icon: Sparkles, label: "20 templates" },
      { Icon: Flame, label: "Chaos sim" },
      { Icon: Bot, label: "AI critique" }
    ]
  }
] as const;

export function HomeLanding() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-950 text-white antialiased">
      <BackdropLayer />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 pb-24 pt-5">
        <Nav />

        {/* HERO */}
        <section className="relative grid items-center gap-12 py-20 lg:grid-cols-[1.05fr_1.1fr] lg:py-28">
          <Spotlight className="left-1/2 -top-40 -translate-x-1/2" color="rgba(25,211,218,0.18)" size={900} />

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Eyebrow tone="neutral">
              <Code2 size={12} className="text-signal-cyan" />
              v1.0 · realtime collaborative dev environment
            </Eyebrow>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.02em] text-white sm:text-6xl lg:text-[80px]">
              The collaborative <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-signal-cyan via-fuchsia-300 to-amber-300 bg-clip-text text-transparent">
                code platform
              </span>{" "}
              for serious teams.
            </h1>
            <p className="mt-7 max-w-xl text-[15px] leading-7 text-white/65">
              Codexa is two products on one realtime stack. A multiplayer VS Code where every cursor,
              tab, and file is synced live — and a sandboxed coding arena where submissions execute
              in throwaway Docker containers. Built on Yjs, Socket.IO, Postgres, BullMQ, and MCP.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="/collaborative"
                className="group inline-flex h-11 items-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-ink-950 transition hover:bg-white/90"
              >
                Open Collaborative
                <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
              </a>
              <a
                href="/arena"
                className="group inline-flex h-11 items-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.08]"
              >
                Enter Arena
                <ArrowUpRight size={15} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] text-white/45">
              <span className="inline-flex items-center gap-2"><LiveDot tone="emerald" /> sub-60ms sync</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck size={12} className="text-emerald-300" /> Docker-sandboxed exec</span>
              <span className="inline-flex items-center gap-2"><Plug size={12} className="text-fuchsia-300" /> MCP-native</span>
              <span className="inline-flex items-center gap-2"><Cpu size={12} className="text-signal-cyan" /> CRDT-backed</span>
            </div>
          </motion.div>

          {/* IDE hero mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
            className="relative"
          >
            <div className="relative">
              <ConicBeam />
              <IDEPanel
                files={[
                  { name: "awareness.ts", tone: "cyan" },
                  { name: "server.ts", tone: "fuchsia", locked: true },
                  { name: "README.md", tone: "amber" }
                ]}
                activeIndex={0}
                language="tsx"
                code={heroCode}
                height={380}
                highlightLines={[5, 6, 7, 8]}
                cursors={[
                  { line: 5, col: 22, name: "asha", tone: "cyan" },
                  { line: 11, col: 32, name: "rohan", tone: "fuchsia" }
                ]}
                onlineNames={[
                  { name: "asha", tone: "cyan" },
                  { name: "rohan", tone: "fuchsia" },
                  { name: "mei", tone: "amber" }
                ]}
              />
            </div>

            {/* Floating chip — AI suggestion */}
            <motion.div
              initial={{ opacity: 0, x: 12, y: -6 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.7, delay: 1 }}
              className="absolute -right-3 top-14 z-10 hidden w-64 rounded-xl border border-violet-300/25 bg-ink-900/95 p-3 shadow-2xl backdrop-blur-xl sm:block"
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold text-violet-200">
                <Bot size={12} /> Codexa AI · suggestion
              </div>
              <div className="mt-2 font-mono text-[11px] leading-5 text-white/75">
                Add backpressure: <span className="text-amber-300">await</span>{" "}
                <span className="text-signal-cyan">awareness</span>.<span className="text-violet-300">setLocalStateField</span>
                <span className="text-white/50">(...)</span> debounced at <span className="text-fuchsia-300">16ms</span>.
              </div>
              <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-300">
                <CheckCircle2 size={11} /> applied to line 8
              </div>
            </motion.div>

            {/* Floating chip — sandbox status */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.2 }}
              className="absolute -bottom-6 left-3 z-10 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-ink-900/95 px-3 py-1.5 text-[11px] font-medium text-white/85 shadow-xl backdrop-blur-xl"
            >
              <span className="inline-flex size-1.5 rounded-full bg-emerald-400" />
              docker · 256MB · 5s wall
            </motion.div>
          </motion.div>
        </section>

        {/* Stack marquee */}
        <section className="border-y border-white/[0.06] py-7">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">Built with the open-source dev stack</div>
          <div className="mt-4"><StackMarquee /></div>
        </section>

        {/* Product split */}
        <section id="products" className="mt-28 grid gap-5 lg:grid-cols-3">
          {products.map((p, i) => {
            const Icon = p.Icon;
            return (
              <motion.a
                key={p.kind}
                href={p.href}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: 0.08 * i }}
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border ${p.border} bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-7 transition hover:bg-white/[0.05]`}
              >
                <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition group-hover:opacity-100" style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,0.06), transparent 40%)"
                }} />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${p.badge}`}>
                      <Icon size={11} /> {p.title}
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                      {p.headline}
                    </h3>
                    <p className="mt-3 max-w-md text-sm leading-6 text-white/55">{p.subtitle}</p>
                  </div>
                  <ArrowUpRight className={`size-5 shrink-0 ${p.accent} opacity-60 transition group-hover:opacity-100`} />
                </div>
                <div className="relative mt-6 grid grid-cols-2 gap-2">
                  {p.bullets.map(({ Icon: BIcon, label }) => (
                    <div key={label} className="flex items-center gap-1.5 rounded-md border border-white/10 bg-ink-950/60 px-2 py-1.5 text-[11px] text-white/65">
                      <BIcon size={12} className={p.accent} />
                      {label}
                    </div>
                  ))}
                </div>
              </motion.a>
            );
          })}
        </section>

        {/* Capabilities (bento) */}
        <section className="mt-28">
          <SectionHeader
            eyebrow={<><Sparkles size={11} /> Capabilities</>}
            title={<>One foundation. <span className="text-white/55">Three experiences.</span></>}
            subtitle="Collaborative, Arena, and System Design share the same realtime backbone, the same AI panel, and the same MCP surface. Move between them without switching tools."
          />

          <Bento className="mt-12">
            {universalFeatures.map((f, i) => {
              const Icon = f.Icon;
              const span = i === 0 ? "col-span-6 sm:col-span-4" : i === 1 ? "col-span-6 sm:col-span-2" : i === 2 ? "col-span-6 sm:col-span-3" : "col-span-6 sm:col-span-3";
              return (
                <BentoCard key={f.title} span={span} tone={f.tone}>
                  <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-ink-950 text-white">
                    <Icon size={18} className={f.tone === "cyan" ? "text-signal-cyan" : f.tone === "violet" ? "text-violet-300" : f.tone === "fuchsia" ? "text-fuchsia-200" : "text-amber-300"} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">{f.body}</p>
                </BentoCard>
              );
            })}

            {/* Special bento — terminal */}
            <div className="col-span-6 sm:col-span-3">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-signal-cyan" />
                  <span className="text-sm font-semibold text-white">Submission flow</span>
                </div>
                <p className="mt-1 text-xs text-white/50">From editor to live test results in one Submit.</p>
                <TerminalPanel
                  className="mt-3"
                  title="executor · queue:submissions"
                  lines={[
                    { prompt: "$", text: "submit two-sum-streaming --lang ts" },
                    { text: "queued · job 4f2c8a · waiting for worker", tone: "muted" },
                    { text: "✓ test_basic            6 ms", tone: "ok" },
                    { text: "✓ test_ordering        11 ms", tone: "ok" },
                    { text: "✓ test_boundary       142 ms", tone: "ok" },
                    { text: "✗ test_stress_4       311 ms  WRONG_ANSWER", tone: "err" },
                    { text: "4 / 5 tests · WRONG_ANSWER", tone: "warn" }
                  ]}
                />
              </div>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5">
                <div className="flex items-center gap-2">
                  <Plug size={14} className="text-fuchsia-300" />
                  <span className="text-sm font-semibold text-white">MCP tool surface</span>
                </div>
                <p className="mt-1 text-xs text-white/50">Every room exposes the same MCP server.</p>
                <div className="mt-3 grid gap-1.5 font-mono text-[11.5px]">
                  {[
                    { name: "list_problems", desc: "→ ProblemSummary[]" },
                    { name: "get_problem", desc: "(slug) → Problem" },
                    { name: "get_hints", desc: "(slug) → Hint[]" },
                    { name: "get_editorial", desc: "(slug) → string" },
                    { name: "validate_solution", desc: "(slug, code, lang) → Verdict" }
                  ].map((t, i) => (
                    <motion.div
                      key={t.name}
                      initial={{ opacity: 0, x: -6 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: 0.07 * i }}
                      className="flex items-center justify-between rounded-md border border-white/10 bg-ink-950/60 px-2.5 py-1.5"
                    >
                      <span className="text-fuchsia-200">{t.name}</span>
                      <span className="text-white/40">{t.desc}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </Bento>
        </section>

        {/* Stack */}
        <section id="stack" className="mt-28">
          <SectionHeader
            eyebrow={<><Cpu size={11} /> Stack</>}
            title={<>An honest stack. <span className="text-white/55">Read the code.</span></>}
            subtitle="No magic. Well-loved open source pieces wired together to behave like a real product."
          />
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stackRows.map((s, i) => {
              const Icon = s.Icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: 0.05 * i }}
                  className="group flex items-start gap-3 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 transition hover:border-white/20"
                >
                  <span className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-ink-950 text-signal-cyan">
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-white/45">{s.label}</div>
                    <div className="mt-1 truncate font-mono text-[13px] text-white/85">{s.value}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Numbers */}
        <section className="mt-20">
          <MetricRow
            items={[
              { label: "Realtime ping", value: "47 ms", sub: "median, in-region" },
              { label: "Languages", value: "13", sub: "in the Arena" },
              { label: "Problems", value: "11", sub: "with editorial" },
              { label: "Sandbox limit", value: "5s · 256MB", sub: "Docker default" }
            ]}
          />
        </section>

        {/* CTA */}
        <section className="mt-28">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-white/[0.01] p-10"
          >
            <DotGrid />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <Eyebrow tone="cyan"><LiveDot tone="cyan" /> Ready when you are</Eyebrow>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                  Ship code with your team in <span className="text-white/55">the same window.</span>
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">
                  Open a Collaborative room for shared real-time editing, or an Arena room for sandboxed competition. No installs.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <a
                    href="/collaborative"
                    className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-ink-950 hover:bg-white/90"
                  >
                    Open Collaborative
                    <ArrowRight size={14} />
                  </a>
                  <a
                    href="/arena"
                    className="inline-flex h-11 items-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-white/90 hover:bg-white/[0.08]"
                  >
                    Enter Arena
                  </a>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { Icon: Layers, label: "Yjs + Monaco" },
                  { Icon: Network, label: "Socket.IO" },
                  { Icon: Database, label: "Prisma + Postgres" },
                  { Icon: ShieldCheck, label: "Docker sandbox" }
                ].map((s) => {
                  const Icon = s.Icon;
                  return (
                    <div key={s.label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink-950/60 p-3">
                      <span className="flex size-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-signal-cyan">
                        <Icon size={14} />
                      </span>
                      <span className="text-sm font-medium text-white/85">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </section>

        <footer className="mt-16 border-t border-white/10 pt-6 text-xs text-white/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>© Codexa.ai</span>
            <span className="flex items-center gap-2">
              <MessageSquare size={11} /> Built for real teams · open-source friendly
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

function Nav() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-white/[0.07]">
      <a href="/" className="flex items-center gap-3">
        <Image src="/codexa.png" width={32} height={32} alt="Codexa.ai" className="rounded-md" priority />
        <span className="text-sm font-semibold uppercase tracking-[0.22em] text-white/85">Codexa</span>
      </a>
      <nav className="hidden items-center gap-1 text-sm text-white/55 md:flex">
        <a className="rounded-md px-3 py-2 hover:bg-white/[0.06] hover:text-white" href="/collaborative">Collaborative</a>
        <a className="rounded-md px-3 py-2 hover:bg-white/[0.06] hover:text-white" href="/arena">Arena</a>
        <a className="rounded-md px-3 py-2 hover:bg-white/[0.06] hover:text-white" href="/system-design">System Design</a>
        <a className="rounded-md px-3 py-2 hover:bg-white/[0.06] hover:text-white" href="#stack">Stack</a>
        <a className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3.5 text-sm font-semibold text-ink-950 hover:bg-white/90" href="#products">
          Get started <ArrowRight size={14} />
        </a>
      </nav>
    </header>
  );
}

function BackdropLayer() {
  const reduce = useReducedMotion();
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(25,211,218,0.18), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 10%, rgba(244,114,182,0.14), transparent 65%), radial-gradient(ellipse 40% 40% at 10% 30%, rgba(124,58,237,0.12), transparent 65%), #07080d"
        }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <DotGrid size={24} className="opacity-60" fade={false} />
      </div>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-signal-cyan/50 to-transparent" />
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed -inset-px -z-10"
          initial={{ backgroundPosition: "0% 0%" }}
          animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
          transition={{ duration: 30, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
          style={{
            background:
              "linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.025) 50%, transparent 60%)"
          }}
        />
      )}
    </>
  );
}

// re-export for callers (currently none) — keeps tree-shaker happy when unused
export type { } from "@/components/landing-ui";
