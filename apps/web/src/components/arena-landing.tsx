"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  CheckCircle2,
  Cpu,
  Gauge,
  Layers,
  Plug,
  ShieldCheck,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  XCircle,
  Zap
} from "lucide-react";
import { problems, supportedLanguages } from "@codexa/problems";
import { RoomLauncher } from "@/components/collaborative-launcher";
import {
  Bento,
  BentoCard,
  CodeBlock,
  ConicBeam,
  DotGrid,
  Eyebrow,
  LiveDot,
  MetricRow,
  SectionHeader,
  Spotlight,
  StackMarquee,
  TerminalPanel
} from "@/components/landing-ui";

const sampleProblems = problems.slice(0, 6);

const submissionTs = `// arena · two-sum streaming
export function firstPairSum(stream: number[], target: number): [number, number] | null {
  const seen = new Map<number, number>();
  for (let i = 0; i < stream.length; i++) {
    const want = target - stream[i];
    if (seen.has(want)) return [seen.get(want)!, i];
    seen.set(stream[i], i);
  }
  return null;
}`;

const featuresBento = [
  {
    span: "col-span-6 sm:col-span-4",
    Icon: Swords,
    title: "Curated catalog — 11 problems, every difficulty",
    body: "Hand-picked problems shipped with examples, constraints, hints, editorial markdown, and reference solutions in every supported language.",
    tone: "fuchsia" as const,
    visual: (
      <div className="mt-5 grid gap-1.5">
        {[
          { name: "Two-Sum, Streaming Edition", diff: "MEDIUM" as const, tags: ["array", "hash-map"] },
          { name: "Kth Largest in Stream", diff: "MEDIUM" as const, tags: ["heap", "priority-queue"] },
          { name: "LRU Cache", diff: "HARD" as const, tags: ["linked-list", "design"] }
        ].map((p) => (
          <div key={p.name} className="flex items-center justify-between rounded-md border border-white/10 bg-ink-950/60 px-3 py-1.5 text-[11.5px]">
            <span className="truncate text-white/85">{p.name}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              p.diff === "MEDIUM" ? "border border-amber-300/30 bg-amber-300/10 text-amber-300" : "border border-signal-rose/30 bg-signal-rose/10 text-signal-rose"
            }`}>{p.diff}</span>
          </div>
        ))}
      </div>
    )
  },
  {
    span: "col-span-6 sm:col-span-2",
    Icon: Boxes,
    title: "13 languages",
    body: "TS · JS · Py · C++ · Java · Go · Rust · C# · Rb · PHP · Swift · Kotlin · Dart.",
    tone: "cyan" as const
  },
  {
    span: "col-span-6 sm:col-span-3",
    Icon: ShieldCheck,
    title: "Docker sandbox",
    body: "Fresh container per submission: no network, read-only root, tmpfs work dir, 256 MB · 1 vCPU · 5s wall, all caps dropped.",
    tone: "amber" as const,
    visual: (
      <div className="mt-5 grid grid-cols-2 gap-2 text-[11px]">
        {[
          { k: "memory", v: "256 MB" },
          { k: "vcpu", v: "1.0" },
          { k: "wall", v: "5 s" },
          { k: "network", v: "none" },
          { k: "root fs", v: "ro" },
          { k: "work fs", v: "tmpfs" }
        ].map((row) => (
          <div key={row.k} className="flex items-center justify-between rounded-md border border-white/10 bg-ink-950/60 px-2 py-1.5">
            <span className="text-white/45">{row.k}</span>
            <span className="font-mono text-white/85">{row.v}</span>
          </div>
        ))}
      </div>
    )
  },
  {
    span: "col-span-6 sm:col-span-3",
    Icon: Gauge,
    title: "BullMQ queue",
    body: "Submissions queue through Redis. The executor worker streams per-test results so the room sees runtimes the instant they're known.",
    tone: "violet" as const
  },
  {
    span: "col-span-6 sm:col-span-3",
    Icon: Plug,
    title: "Live MCP tools",
    body: "list_problems · get_problem · get_hints · get_solution · get_editorial · validate_solution.",
    tone: "fuchsia" as const
  },
  {
    span: "col-span-6 sm:col-span-3",
    Icon: Trophy,
    title: "Leaderboard-ready",
    body: "Submissions persist to Postgres with status, runtime, code. Drop a leaderboard view on top whenever you want.",
    tone: "cyan" as const
  }
];

export function ArenaLanding() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-950 text-white antialiased">
      <BackdropLayer />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 pb-24 pt-5">
        <Nav />

        {/* HERO */}
        <section className="relative grid items-center gap-12 py-20 lg:grid-cols-[1fr_1.1fr] lg:py-28">
          <Spotlight className="left-1/2 -top-44 -translate-x-1/2" color="rgba(244,114,182,0.22)" size={900} />

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Eyebrow tone="fuchsia">
              <Zap size={11} /> Compete · submit · climb
            </Eyebrow>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.02em] text-white sm:text-6xl lg:text-[80px]">
              The arena where <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-fuchsia-300 via-signal-cyan to-amber-300 bg-clip-text text-transparent">
                code is graded live.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-[15px] leading-7 text-white/65">
              A multiplayer LeetCode-style arena that lives inside Codexa. Pick a problem, code in
              any of thirteen languages, hit Submit — your code runs in an isolated Docker sandbox
              and the room sees every test result, instantly.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#start"
                className="group inline-flex h-11 items-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-ink-950 hover:bg-white/90"
              >
                <Swords size={15} />
                Open an Arena room
                <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
              </a>
              <a
                href="#problems"
                className="inline-flex h-11 items-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-white/90 hover:bg-white/[0.08]"
              >
                Browse problems
              </a>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] text-white/45">
              <span className="inline-flex items-center gap-2"><ShieldCheck size={12} className="text-emerald-300" /> Docker · 256MB · 5s</span>
              <span className="inline-flex items-center gap-2"><Gauge size={12} className="text-amber-300" /> BullMQ + Redis</span>
              <span className="inline-flex items-center gap-2"><Plug size={12} className="text-fuchsia-300" /> MCP-native</span>
              <span className="inline-flex items-center gap-2"><Cpu size={12} className="text-signal-cyan" /> {supportedLanguages.length} runtimes</span>
            </div>
          </motion.div>

          {/* Hero: split between problem code and live submission */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
            className="relative"
          >
            <div className="relative">
              <ConicBeam />
              <div className="relative grid gap-4 rounded-2xl border border-white/10 bg-[#0a0b10] p-4 shadow-[0_40px_140px_-30px_rgba(244,114,182,0.45)]">
                {/* problem strip */}
                <div className="grid items-center gap-3 rounded-xl border border-white/10 bg-ink-950/60 px-4 py-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fuchsia-200">
                      <BookOpen size={12} /> Problem
                    </div>
                    <div className="mt-1 text-base font-semibold text-white">Two-Sum, Streaming Edition</div>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-white/45">
                      <span className="rounded-full border border-white/10 px-2 py-0.5">array</span>
                      <span className="rounded-full border border-white/10 px-2 py-0.5">hash-map</span>
                      <span className="rounded-full border border-white/10 px-2 py-0.5">streaming</span>
                    </div>
                  </div>
                  <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-300">Medium</span>
                </div>

                {/* code */}
                <CodeBlock
                  filename="solution.ts"
                  language="tsx"
                  code={submissionTs}
                  height={210}
                  highlightLines={[2, 3, 4, 5, 6]}
                  cursors={[
                    { line: 3, col: 30, name: "asha", tone: "cyan" },
                    { line: 6, col: 18, name: "rohan", tone: "fuchsia" }
                  ]}
                />

                {/* test runner */}
                <div className="rounded-xl border border-white/10 bg-ink-950/60">
                  <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[11px] text-white/55">
                    <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-signal-cyan">
                      <Timer size={11} /> submission · 472 ms
                    </span>
                    <span className="font-mono">job 4f2c8a</span>
                  </div>
                  <div className="grid gap-1 p-2.5">
                    {[
                      { name: "edge: empty input", ok: true, ms: 4 },
                      { name: "basic: 2 + 2", ok: true, ms: 6 },
                      { name: "ordering: [3,1,2]", ok: true, ms: 9 },
                      { name: "boundary: 10⁵ items", ok: true, ms: 142 },
                      { name: "hidden: stress #4", ok: false, ms: 311 }
                    ].map((t, i) => (
                      <motion.div
                        key={t.name}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.55 + i * 0.16 }}
                        className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-[11.5px] ${
                          t.ok ? "border-emerald-400/20 bg-emerald-400/[0.05]" : "border-signal-rose/30 bg-signal-rose/10"
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {t.ok ? <CheckCircle2 size={13} className="text-emerald-300" /> : <XCircle size={13} className="text-signal-rose" />}
                          <span className="truncate text-white/85">{t.name}</span>
                        </span>
                        <span className="font-mono text-[10.5px] text-white/45">{t.ms}ms</span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 bg-signal-rose/10 px-4 py-2 text-[11.5px] text-signal-rose">
                    <span className="font-semibold">4 / 5 tests</span>
                    <span className="font-mono">WRONG_ANSWER</span>
                  </div>
                </div>
              </div>
            </div>

            {/* floating ranking chip */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="absolute -right-3 top-3 z-10 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-ink-900/95 px-3 py-1.5 text-[11px] font-medium text-amber-200 shadow-xl backdrop-blur-xl"
            >
              <Trophy size={12} /> asha · #1 · streak 7
            </motion.div>
          </motion.div>
        </section>

        {/* Logo strip */}
        <section className="border-y border-white/[0.06] py-7">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">A grading system on a real production stack</div>
          <div className="mt-4"><StackMarquee /></div>
        </section>

        {/* Metric row */}
        <section className="mt-20">
          <MetricRow
            items={[
              { label: "Problems", value: `${problems.length}`, sub: "with editorial" },
              { label: "Languages", value: `${supportedLanguages.length}`, sub: "all sandboxed" },
              { label: "Sandbox", value: "5s · 256MB", sub: "Docker default" },
              { label: "Cold-start", value: "~120 ms", sub: "container spawn" }
            ]}
          />
        </section>

        {/* Features bento */}
        <section id="features" className="mt-28">
          <SectionHeader
            eyebrow={<><Sparkles size={11} /> The grading pipeline</>}
            title={<>A grading system <span className="text-white/55">you can actually trust.</span></>}
            subtitle="Sandboxed, queued, persisted. Submissions in Arena rooms are the real thing — not a sandboxed-looking iframe."
            tone="fuchsia"
          />
          <Bento className="mt-12">
            {featuresBento.map((f) => {
              const Icon = f.Icon;
              return (
                <BentoCard key={f.title} span={f.span} tone={f.tone}>
                  <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-ink-950">
                    <Icon size={18} className={f.tone === "cyan" ? "text-signal-cyan" : f.tone === "violet" ? "text-violet-300" : f.tone === "fuchsia" ? "text-fuchsia-200" : "text-amber-300"} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">{f.body}</p>
                  {f.visual ?? null}
                </BentoCard>
              );
            })}
          </Bento>
        </section>

        {/* Pipeline detail */}
        <section className="mt-28">
          <SectionHeader
            eyebrow={<><Cpu size={11} /> The submission pipeline</>}
            title="From Submit to verdict in a single Redis hop."
            subtitle="Editor → API → BullMQ → executor worker → Docker container → streaming test events → room. Every step is observable."
            tone="violet"
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_1fr]">
            <TerminalPanel
              title="executor · queue:submissions"
              lines={[
                { prompt: "$", text: "node apps/executor/src/runner.ts" },
                { text: "[ready] connected · redis bullmq", tone: "info" },
                { text: "[job 4f2c8a] received · lang=ts user=asha", tone: "muted" },
                { text: "[docker] spawn codexa-runner-node:lts", tone: "muted" },
                { text: "[container] cold-start 117 ms · oom=256M cpu=1.0 nproc=64", tone: "muted" },
                { text: "✓ test_basic            6 ms", tone: "ok" },
                { text: "✓ test_ordering        11 ms", tone: "ok" },
                { text: "✓ test_boundary       142 ms", tone: "ok" },
                { text: "✗ test_stress_4       311 ms  WRONG_ANSWER", tone: "err" },
                { text: "[verdict] 4 / 5 · 472 ms wall", tone: "warn" },
                { text: "[postgres] inserted Submission#9123", tone: "ok" }
              ]}
            />
            <CodeBlock
              filename="executor/runner.ts"
              language="tsx"
              height={360}
              code={`// minimal sandbox spawn — read-only root + tmpfs work
const container = await docker.createContainer({
  Image: imageFor(lang),
  Cmd: cmdFor(lang),
  Env: [\`PROBLEM=\${slug}\`],
  HostConfig: {
    Memory: 256 * 1024 * 1024,
    CpuQuota: 100_000,
    NetworkMode: "none",
    ReadonlyRootfs: true,
    Tmpfs: { "/work": "rw,nosuid,size=64m" },
    CapDrop: ["ALL"],
    PidsLimit: 64
  }
});

await container.start();
const verdict = await runTestsStreaming(container, problem.tests, {
  wallMs: 5000,
  onResult: (r) => room.emit("test:result", r)
});`}
            />
          </div>
        </section>

        {/* Problems preview */}
        <section id="problems" className="mt-28">
          <SectionHeader
            eyebrow={<><BookOpen size={11} /> Sample problems</>}
            title={<>A taste of the catalog. <span className="text-white/55">Every problem ships with editorial.</span></>}
            tone="amber"
          />

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sampleProblems.map((problem, i) => (
              <motion.div
                key={problem.slug}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: 0.05 * i }}
                className="group rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 transition hover:border-fuchsia-300/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">{problem.title}</h3>
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
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/55">{problem.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {problem.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">{tag}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section id="start" className="mt-28">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-white/[0.01] p-8"
          >
            <DotGrid />
            <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <Eyebrow tone="fuchsia"><LiveDot tone="fuchsia" /> Open the Arena</Eyebrow>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                  Pick a problem. <span className="text-white/55">Pick a language. Submit.</span>
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-white/60">
                  The room sees every test result live — and so does the AI in the right panel.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-2 text-[11px] text-white/55">
                  {[
                    { label: "Auto-graded", Icon: CheckCircle2 },
                    { label: "Multi-language", Icon: Boxes },
                    { label: "AI hints", Icon: Sparkles }
                  ].map(({ label, Icon }) => (
                    <div key={label} className="flex items-center gap-1.5 rounded-md border border-white/10 bg-ink-950/60 px-2.5 py-2">
                      <Icon size={13} className="text-fuchsia-200" />
                      {label}
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-2 text-[11px] text-white/55">
                  {[
                    "Curated catalog",
                    "Docker sandbox",
                    "BullMQ + Redis",
                    "MCP tools",
                    "Postgres history"
                  ].map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-ink-950/60 px-2.5 py-1">{tag}</span>
                  ))}
                </div>
              </div>
              <RoomLauncher product="arena" title="Create or join an Arena room" />
            </div>
          </motion.div>
        </section>

        <footer className="mt-16 border-t border-white/10 pt-6 text-xs text-white/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>© Codexa.ai — Arena</span>
            <span className="inline-flex items-center gap-2">
              <Layers size={11} /> Next.js · Monaco · Docker · BullMQ · Redis · MCP
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
        <Image src="/codexa.png" width={32} height={32} alt="Codexa.ai" className="rounded-md" />
        <span className="text-sm font-semibold uppercase tracking-[0.22em] text-white/85">Codexa · Arena</span>
      </a>
      <nav className="flex items-center gap-1 text-sm text-white/55">
        <a className="rounded-md px-3 py-2 hover:bg-white/[0.06] hover:text-white" href="#features">Pipeline</a>
        <a className="rounded-md px-3 py-2 hover:bg-white/[0.06] hover:text-white" href="#problems">Problems</a>
        <a className="rounded-md px-3 py-2 hover:bg-white/[0.06] hover:text-white" href="/collaborative">Collaborative</a>
        <a className="rounded-md px-3 py-2 hover:bg-white/[0.06] hover:text-white" href="/system-design">System Design</a>
        <a className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3.5 text-sm font-semibold text-ink-950 hover:bg-white/90" href="#start">
          Open Arena <ArrowRight size={14} />
        </a>
      </nav>
    </header>
  );
}

function BackdropLayer() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(244,114,182,0.22), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 14%, rgba(250,204,21,0.16), transparent 65%), radial-gradient(ellipse 40% 40% at 10% 30%, rgba(25,211,218,0.12), transparent 65%), #07080d"
        }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <DotGrid size={24} className="opacity-60" fade={false} />
      </div>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-fuchsia-300/50 to-transparent" />
    </>
  );
}
