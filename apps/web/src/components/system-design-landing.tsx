"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Boxes,
  Cloud,
  Cpu,
  Database,
  Flame,
  Gauge,
  GitBranch,
  Globe,
  Layers,
  Network,
  Plug,
  Radio,
  Server,
  ShieldCheck,
  Sparkles,
  Timer,
  Workflow
} from "lucide-react";
import { SystemDesignLauncher } from "@/components/collaborative-launcher";
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

/**
 * "System Design" — the third product. Distinct from Collaborative (cyan/violet)
 * and Arena (fuchsia/amber) by leaning into an emerald + violet palette that
 * evokes infrastructure / observability dashboards.
 */

const componentPalette = [
  { Icon: Globe, label: "Client" },
  { Icon: Cloud, label: "CDN" },
  { Icon: Network, label: "Load balancer" },
  { Icon: Server, label: "App server" },
  { Icon: Database, label: "SQL / NoSQL" },
  { Icon: Boxes, label: "Cache" },
  { Icon: Workflow, label: "Queue" },
  { Icon: Cpu, label: "Worker pool" },
  { Icon: Radio, label: "Pub/Sub" },
  { Icon: GitBranch, label: "Service mesh" },
  { Icon: ShieldCheck, label: "API gateway" },
  { Icon: Plug, label: "External API" }
];

const templates = [
  { name: "Design Twitter", tag: "fan-out · timeline · cache", difficulty: "MEDIUM" as const },
  { name: "Design Uber", tag: "geo-hashing · matching · realtime", difficulty: "HARD" as const },
  { name: "Design YouTube", tag: "CDN · transcoding · object store", difficulty: "HARD" as const },
  { name: "Design WhatsApp", tag: "websockets · presence · queue", difficulty: "MEDIUM" as const },
  { name: "Design URL Shortener", tag: "hash · KV store · analytics", difficulty: "EASY" as const },
  { name: "Design Rate Limiter", tag: "token bucket · Redis · sliding window", difficulty: "MEDIUM" as const },
  { name: "Design Dropbox", tag: "chunking · metadata · sync", difficulty: "HARD" as const },
  { name: "Design Stripe", tag: "idempotency · webhooks · ledger", difficulty: "HARD" as const },
  { name: "Design TinyURL", tag: "base62 · cache · redirect", difficulty: "EASY" as const },
  { name: "Design Instagram Feed", tag: "ranking · fan-out · CDN", difficulty: "MEDIUM" as const }
];

const chaosCode = `// inject failures and watch them ripple
await scenario.kill("db-replica-2");
await scenario.partition({
  from: "app-server-3",
  to:   "cache-primary",
  forMs: 8_000
});
await scenario.throttle("api-gateway", { p99Ms: 1200 });

// observe — the simulator reports back what broke
expect(scenario.uptime("checkout")).toBeGreaterThan(0.997);
expect(scenario.errors("auth")).toMatchSnapshot();`;

export function SystemDesignLanding() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-950 text-white antialiased">
      <BackdropLayer />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 pb-24 pt-5">
        <Nav />

        {/* HERO */}
        <section className="relative grid items-center gap-12 py-20 lg:grid-cols-[1fr_1.15fr] lg:py-28">
          <Spotlight className="left-1/2 -top-44 -translate-x-1/2" color="rgba(16,185,129,0.20)" size={900} />

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Eyebrow tone="violet">
              <LiveDot tone="emerald" /> New · sandboxed system design practice
            </Eyebrow>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.02em] text-white sm:text-6xl lg:text-[80px]">
              Design the system. <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-emerald-300 via-violet-300 to-signal-cyan bg-clip-text text-transparent">
                Then break it on purpose.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-[15px] leading-7 text-white/65">
              A browser-based whiteboard for serious system design practice. Drag in load balancers,
              caches, queues, and replicas. Wire them up. Then inject failure — drop a node, partition
              the network, throttle the gateway — and watch the request path light up red.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#start"
                className="group inline-flex h-11 items-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-ink-950 hover:bg-white/90"
              >
                <Workflow size={15} />
                Open the whiteboard
                <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
              </a>
              <a
                href="#templates"
                className="inline-flex h-11 items-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-white/90 hover:bg-white/[0.08]"
              >
                Browse templates
              </a>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] text-white/45">
              <span className="inline-flex items-center gap-2"><Boxes size={12} className="text-emerald-300" /> 40+ components</span>
              <span className="inline-flex items-center gap-2"><Flame size={12} className="text-amber-300" /> chaos scenarios</span>
              <span className="inline-flex items-center gap-2"><Bot size={12} className="text-violet-300" /> AI critique</span>
              <span className="inline-flex items-center gap-2"><Sparkles size={12} className="text-signal-cyan" /> shareable rooms</span>
            </div>
          </motion.div>

          {/* Hero diagram — animated architecture with live traffic */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
            className="relative"
          >
            <ConicBeam />
            <ArchitectureDiagram />

            {/* floating chips */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-ink-900/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 backdrop-blur"
            >
              <Radio size={10} className="animate-pulse" /> live · 2,140 rps
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-violet-300/30 bg-ink-900/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200 backdrop-blur"
            >
              <Timer size={10} /> p99 · 142 ms
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="absolute -bottom-4 right-6 z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/95 px-3 py-1.5 text-[11px] font-medium text-white/85 shadow-xl backdrop-blur-xl"
            >
              <Flame size={11} className="text-amber-300" />
              chaos: db-replica-2 down · routing around
            </motion.div>
          </motion.div>
        </section>

        {/* Logo strip */}
        <section className="border-y border-white/[0.06] py-7">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">Built on the same realtime stack as the rest of Codexa</div>
          <div className="mt-4"><StackMarquee /></div>
        </section>

        {/* Metric row */}
        <section className="mt-20">
          <MetricRow
            items={[
              { label: "Components", value: "40+", sub: "drag-drop palette" },
              { label: "Templates", value: "20", sub: "interview prompts" },
              { label: "Chaos modes", value: "8", sub: "kill · partition · throttle" },
              { label: "Shareable", value: "1 URL", sub: "the whole diagram" }
            ]}
          />
        </section>

        {/* Component palette */}
        <section id="palette" className="mt-28">
          <SectionHeader
            eyebrow={<><Boxes size={11} /> Component palette</>}
            title={<>Every primitive a real system has. <span className="text-white/55">Snappable on a grid.</span></>}
            subtitle="Each component is a real-world unit with sensible defaults — capacity, p99, failure modes — that the simulator uses when you press play."
            tone="violet"
          />

          <div className="mt-12 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {componentPalette.map((c, i) => {
              const Icon = c.Icon;
              return (
                <motion.div
                  key={c.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: 0.04 * i }}
                  className="group flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-3 transition hover:border-emerald-300/30"
                >
                  <span className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-ink-950 text-emerald-300 transition group-hover:text-emerald-200">
                    <Icon size={16} />
                  </span>
                  <span className="text-sm font-medium text-white/85">{c.label}</span>
                </motion.div>
              );
            })}
            <div className="group flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3 text-sm text-white/50">
              + 28 more · presence, search, k/v, blob storage…
            </div>
          </div>
        </section>

        {/* Templates */}
        <section id="templates" className="mt-28">
          <SectionHeader
            eyebrow={<><Sparkles size={11} /> Interview templates</>}
            title={<>Start from a real prompt. <span className="text-white/55">Adapt as you go.</span></>}
            subtitle="Twenty starter scenes seeded with realistic constraints — request patterns, write-heavy vs read-heavy, latency budgets — so the first 30 seconds are spent thinking, not labelling boxes."
            tone="violet"
          />

          <div className="mt-12 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {templates.map((t, i) => (
              <motion.a
                key={t.name}
                href="#start"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: 0.04 * i }}
                className="group flex flex-col gap-2 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 transition hover:border-violet-300/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{t.name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      t.difficulty === "EASY"
                        ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                        : t.difficulty === "MEDIUM"
                        ? "border border-amber-300/30 bg-amber-300/10 text-amber-300"
                        : "border border-signal-rose/30 bg-signal-rose/10 text-signal-rose"
                    }`}
                  >
                    {t.difficulty}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-white/45">{t.tag}</div>
              </motion.a>
            ))}
          </div>
        </section>

        {/* Chaos / simulation */}
        <section className="mt-28">
          <SectionHeader
            eyebrow={<><Flame size={11} /> Chaos engineering</>}
            title={<>Press play. <span className="text-white/55">Then break things.</span></>}
            subtitle="The simulator runs your diagram against a synthetic request load. Inject failures from a small chaos API and watch the request path re-route, queue, or fall over — exactly like a postmortem rehearsal."
            tone="amber"
          />

          <Bento className="mt-12">
            <BentoCard span="col-span-6 sm:col-span-4" tone="amber">
              <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-ink-950 text-amber-300">
                <Flame size={18} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">Failure modes that read like code</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">
                A small, intentional chaos API. No DSL to learn — just JS calls — so the scenario travels with the room URL and replays the same way every time.
              </p>
              <div className="mt-5">
                <CodeBlock filename="scenario.spec.ts" language="tsx" code={chaosCode} height={210} lineNumbers />
              </div>
            </BentoCard>

            <BentoCard span="col-span-6 sm:col-span-2" tone="violet">
              <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-ink-950 text-violet-300">
                <Bot size={18} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">AI critique</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Ask the room AI to review your design against the prompt's constraints. It reads the diagram, not a snapshot.
              </p>
              <div className="mt-5 space-y-1.5 font-mono text-[11px]">
                {[
                  { tone: "warn" as const, text: "→ no read replica on the user-db" },
                  { tone: "warn" as const, text: "→ cache lacks TTL eviction" },
                  { tone: "ok" as const, text: "✓ queue has DLQ wired" }
                ].map((row, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -4 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: 0.05 * i }}
                    className={`rounded-md border px-2 py-1.5 ${
                      row.tone === "warn"
                        ? "border-amber-300/20 bg-amber-300/[0.06] text-amber-200"
                        : "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300"
                    }`}
                  >
                    {row.text}
                  </motion.div>
                ))}
              </div>
            </BentoCard>

            <BentoCard span="col-span-6 sm:col-span-3" tone="violet">
              <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-ink-950 text-emerald-300">
                <Gauge size={18} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">Live traffic + latency</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Each edge animates with the actual request volume your simulator produces. p50 / p95 / p99 update in the corner of the relevant component.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-[11px]">
                {[
                  { k: "p50", v: "32 ms", tone: "ok" as const },
                  { k: "p95", v: "118 ms", tone: "ok" as const },
                  { k: "p99", v: "412 ms", tone: "warn" as const }
                ].map((m) => (
                  <div
                    key={m.k}
                    className={`rounded-md border bg-ink-950/60 p-2.5 text-center ${
                      m.tone === "ok"
                        ? "border-emerald-400/20 text-emerald-300"
                        : "border-amber-300/20 text-amber-200"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider opacity-60">{m.k}</div>
                    <div className="mt-1 font-mono text-base font-semibold">{m.v}</div>
                  </div>
                ))}
              </div>
            </BentoCard>

            <BentoCard span="col-span-6 sm:col-span-3" tone="violet">
              <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-ink-950 text-violet-300">
                <ShieldCheck size={18} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">Structured interview scoring</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">
                A rubric the AI grades against — scope clarification, capacity estimates, failure modes, scaling story. The score travels with your room so you can compare attempts.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2 text-[11px]">
                {[
                  { k: "Scope", v: "4 / 5", ok: true },
                  { k: "Capacity", v: "3 / 5", ok: false },
                  { k: "Tradeoffs", v: "5 / 5", ok: true },
                  { k: "Failure", v: "2 / 5", ok: false }
                ].map((row) => (
                  <div key={row.k} className="flex items-center justify-between rounded-md border border-white/10 bg-ink-950/60 px-2.5 py-1.5">
                    <span className="text-white/60">{row.k}</span>
                    <span className={`font-mono font-semibold ${row.ok ? "text-emerald-300" : "text-amber-300"}`}>{row.v}</span>
                  </div>
                ))}
              </div>
            </BentoCard>
          </Bento>
        </section>

        {/* Pipeline */}
        <section className="mt-28">
          <SectionHeader
            eyebrow={<><Cpu size={11} /> The simulator</>}
            title="Synthetic traffic against your diagram."
            subtitle="Press play and the simulator generates a workload that matches the template's constraints — read/write mix, burstiness, geographic spread. Every component you drew sees its share."
            tone="violet"
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_1fr]">
            <TerminalPanel
              title="sim · design/twitter · 60s window"
              lines={[
                { prompt: "$", text: "codexa sim play --template twitter --duration 60s" },
                { text: "[gen] warming workload model · zipfian fan-out", tone: "info" },
                { text: "[edge] client → cdn      2,140 rps", tone: "muted" },
                { text: "[edge] cdn   → api       1,070 rps  (50% hit)", tone: "muted" },
                { text: "[edge] api   → cache     1,070 rps  (94% hit)", tone: "muted" },
                { text: "[edge] api   → user-db      64 rps", tone: "muted" },
                { text: "[chaos] kill db-replica-2 · routing around", tone: "warn" },
                { text: "[edge] api   → user-db     128 rps  (replica gone)", tone: "warn" },
                { text: "[verdict] uptime 99.71% · errors 0.29% · p99 412 ms", tone: "ok" }
              ]}
            />
            <CodeBlock
              filename="design/twitter.ts"
              language="tsx"
              height={360}
              code={`// the simulator reads what you drew
import { scene } from "./scene";

export const workload = {
  template: "twitter",
  durationMs: 60_000,
  rps: 2_140,                  // peak target
  mix: { reads: 0.94, writes: 0.06 },
  fanout: {
    distribution: "zipfian",   // few celebs, many followers
    alpha: 1.1
  },
  geo: { regions: ["us-east", "eu-west", "ap-south"] }
};

export const sla = {
  uptime: 0.997,
  p99Ms: 500
};

export default { scene, workload, sla };`}
            />
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
                <Eyebrow tone="violet"><LiveDot tone="emerald" /> Open the whiteboard</Eyebrow>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                  Draw the system. <span className="text-white/55">Then defend it.</span>
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-white/60">
                  Spin up a shared room, pick a template (or start blank), drop in components, and run the simulator. Bring your interviewer.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 text-[11px] text-white/55">
                  {[
                    "40+ components",
                    "20 templates",
                    "Chaos API",
                    "AI critique",
                    "Live traffic",
                    "Shareable URL"
                  ].map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-ink-950/60 px-2.5 py-1">{tag}</span>
                  ))}
                </div>
              </div>
              <SystemDesignLauncher />
            </div>
          </motion.div>
        </section>

        <footer className="mt-16 border-t border-white/10 pt-6 text-xs text-white/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>© Codexa.ai — System Design</span>
            <span className="inline-flex items-center gap-2">
              <Layers size={11} /> Next.js · Excalidraw · Yjs · Socket.IO · MCP
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
/* ────────────────────────────────────────────────────────────── */
/* Hero diagram — an interactive-looking architecture visualization */
/* ────────────────────────────────────────────────────────────── */

type Node = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  Icon: typeof Server;
  tone: "emerald" | "violet" | "cyan" | "amber" | "fuchsia";
  /** When true, render with the "failed" treatment for the chaos chip. */
  failed?: boolean;
};

const toneToColor = {
  emerald: { stroke: "#34d399", fill: "rgba(52,211,153,0.10)", text: "text-emerald-300" },
  violet: { stroke: "#a78bfa", fill: "rgba(167,139,250,0.10)", text: "text-violet-300" },
  cyan: { stroke: "#19d3da", fill: "rgba(25,211,218,0.10)", text: "text-signal-cyan" },
  amber: { stroke: "#fbbf24", fill: "rgba(251,191,36,0.10)", text: "text-amber-300" },
  fuchsia: { stroke: "#f472b6", fill: "rgba(244,114,182,0.10)", text: "text-fuchsia-200" }
} as const;

const nodes: Node[] = [
  { id: "client", x: 24, y: 36, w: 110, h: 52, label: "Client", sub: "Web · Mobile", Icon: Globe, tone: "cyan" },
  { id: "cdn", x: 178, y: 36, w: 110, h: 52, label: "CDN", sub: "Edge cache", Icon: Cloud, tone: "violet" },
  { id: "lb", x: 332, y: 36, w: 130, h: 52, label: "Load balancer", sub: "round-robin", Icon: Network, tone: "emerald" },
  { id: "app1", x: 506, y: 12, w: 124, h: 38, label: "App server #1", Icon: Server, tone: "emerald" },
  { id: "app2", x: 506, y: 62, w: 124, h: 38, label: "App server #2", Icon: Server, tone: "emerald" },
  { id: "app3", x: 506, y: 112, w: 124, h: 38, label: "App server #3", Icon: Server, tone: "emerald" },
  { id: "cache", x: 332, y: 196, w: 130, h: 50, label: "Cache", sub: "Redis · 94% hit", Icon: Boxes, tone: "amber" },
  { id: "queue", x: 178, y: 196, w: 110, h: 50, label: "Queue", sub: "BullMQ", Icon: Workflow, tone: "fuchsia" },
  { id: "worker", x: 24, y: 196, w: 110, h: 50, label: "Worker", sub: "8 replicas", Icon: Cpu, tone: "violet" },
  { id: "db-primary", x: 506, y: 196, w: 124, h: 50, label: "DB · primary", sub: "Postgres", Icon: Database, tone: "violet" },
  { id: "db-replica-1", x: 506, y: 268, w: 124, h: 32, label: "DB · replica 1", Icon: Database, tone: "violet" },
  { id: "db-replica-2", x: 506, y: 306, w: 124, h: 32, label: "DB · replica 2 · DOWN", Icon: Database, tone: "amber", failed: true }
];

type Edge = { from: string; to: string; tone: keyof typeof toneToColor; speedSec?: number; dashed?: boolean };

const edges: Edge[] = [
  { from: "client", to: "cdn", tone: "cyan" },
  { from: "cdn", to: "lb", tone: "violet" },
  { from: "lb", to: "app1", tone: "emerald" },
  { from: "lb", to: "app2", tone: "emerald" },
  { from: "lb", to: "app3", tone: "emerald" },
  { from: "app2", to: "cache", tone: "amber" },
  { from: "app2", to: "queue", tone: "fuchsia" },
  { from: "queue", to: "worker", tone: "violet", speedSec: 2.4 },
  { from: "app2", to: "db-primary", tone: "violet" },
  { from: "db-primary", to: "db-replica-1", tone: "violet", dashed: true, speedSec: 3.6 },
  { from: "db-primary", to: "db-replica-2", tone: "amber", dashed: true }
];

function nodeCenter(n: Node) {
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

function ArchitectureDiagram() {
  const reduce = useReducedMotion();
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n] as const));
  const W = 670;
  const H = 360;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0b10] shadow-[0_40px_140px_-30px_rgba(0,0,0,0.9)]">
      {/* IDE-style title bar */}
      <div className="flex h-9 items-center gap-2 border-b border-white/10 bg-white/[0.02] px-3">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="ml-3 truncate font-mono text-[11px] text-white/45">
          codexa · design/twitter · sim @ 2.1k rps
        </div>
        <div className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-white/45">
          <span className="inline-flex items-center gap-1"><Radio size={10} className="text-emerald-300 animate-pulse" /> sim</span>
        </div>
      </div>

      {/* Diagram surface */}
      <div className="relative h-[380px] w-full overflow-hidden bg-[#0a0b10]">
        {/* grid backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "20px 20px"
          }}
        />

        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full">
          <defs>
            {Object.entries(toneToColor).map(([key, tone]) => (
              <linearGradient key={key} id={`edge-${key}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={tone.stroke} stopOpacity="0.6" />
                <stop offset="100%" stopColor={tone.stroke} stopOpacity="0.2" />
              </linearGradient>
            ))}
          </defs>

          {/* edges */}
          {edges.map((e, i) => {
            const from = byId[e.from]!;
            const to = byId[e.to]!;
            const a = nodeCenter(from);
            const b = nodeCenter(to);
            // bring the line endpoints to the edge of the rect so they
            // don't overlap the labels
            const path = orthogonalPath(a, b);
            const tone = toneToColor[e.tone];

            return (
              <g key={`edge-${i}`}>
                <path
                  d={path}
                  stroke={tone.stroke}
                  strokeOpacity={0.35}
                  strokeWidth={1.2}
                  fill="none"
                  strokeDasharray={e.dashed ? "4 4" : undefined}
                />
                {!reduce && (
                  <>
                    {/* primary traffic dot */}
                    <circle r="3" fill={tone.stroke}>
                      <animateMotion dur={`${e.speedSec ?? 2.0}s`} repeatCount="indefinite" path={path} />
                    </circle>
                    {/* faint trailing dot */}
                    <circle r="2" fill={tone.stroke} opacity="0.4">
                      <animateMotion
                        dur={`${e.speedSec ?? 2.0}s`}
                        repeatCount="indefinite"
                        begin={`${(e.speedSec ?? 2.0) * 0.3}s`}
                        path={path}
                      />
                    </circle>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* nodes (HTML for clean text rendering) */}
        {nodes.map((n) => {
          const Icon = n.Icon;
          const tone = toneToColor[n.tone];
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={`absolute flex flex-col justify-center gap-0.5 rounded-md border bg-ink-900/85 px-2.5 py-1.5 backdrop-blur-sm ${
                n.failed ? "border-amber-300/50" : "border-white/10"
              }`}
              style={{
                left: `${(n.x / W) * 100}%`,
                top: `${(n.y / H) * 100}%`,
                width: `${(n.w / W) * 100}%`,
                height: `${(n.h / H) * 100}%`,
                boxShadow: `0 0 0 1px ${tone.stroke}30`
              }}
            >
              <div className="flex items-center gap-1.5">
                <Icon size={12} className={tone.text} />
                <span className={`truncate text-[11px] font-semibold ${n.failed ? "text-amber-200" : "text-white/90"}`}>
                  {n.label}
                </span>
              </div>
              {n.sub && (
                <div className="truncate font-mono text-[9.5px] text-white/45">{n.sub}</div>
              )}
              {n.failed && (
                <motion.div
                  aria-hidden
                  className="absolute inset-0 rounded-md"
                  initial={{ boxShadow: "0 0 0 0 rgba(251,191,36,0)" }}
                  animate={{ boxShadow: ["0 0 0 0 rgba(251,191,36,0)", "0 0 0 4px rgba(251,191,36,0.25)", "0 0 0 0 rgba(251,191,36,0)"] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* mini metrics strip */}
      <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-emerald-400/10 px-3 py-1.5 text-[10.5px] text-white/85">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5"><Radio size={10} className="text-emerald-300" /> 2,140 rps</span>
          <span className="font-mono">uptime 99.71%</span>
          <span className="font-mono">errors 0.29%</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-emerald-300">p50 32ms</span>
          <span className="font-mono text-emerald-300">p95 118ms</span>
          <span className="font-mono text-amber-300">p99 412ms</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Produce an orthogonal (right-angle) connector between two points so the
 * diagram looks like a real architecture diagram instead of spaghetti.
 */
function orthogonalPath(a: { x: number; y: number }, b: { x: number; y: number }) {
  // Horizontal segments are preferred; route via the midpoint x.
  const midX = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}`;
}

/* ────────────────────────────────────────────────────────────── */
/* Nav + backdrop                                                  */
/* ────────────────────────────────────────────────────────────── */

function Nav() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-white/[0.07]">
      <a href="/" className="flex items-center gap-3">
        <Image src="/codexa.png" width={32} height={32} alt="Codexa.ai" className="rounded-md" />
        <span className="text-sm font-semibold uppercase tracking-[0.22em] text-white/85">Codexa · System Design</span>
      </a>
      <nav className="flex items-center gap-1 text-sm text-white/55">
        <a className="rounded-md px-3 py-2 hover:bg-white/[0.06] hover:text-white" href="#palette">Components</a>
        <a className="rounded-md px-3 py-2 hover:bg-white/[0.06] hover:text-white" href="#templates">Templates</a>
        <a className="rounded-md px-3 py-2 hover:bg-white/[0.06] hover:text-white" href="/collaborative">Collaborative</a>
        <a className="rounded-md px-3 py-2 hover:bg-white/[0.06] hover:text-white" href="/arena">Arena</a>
        <a className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3.5 text-sm font-semibold text-ink-950 hover:bg-white/90" href="#start">
          Open whiteboard <ArrowRight size={14} />
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
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(16,185,129,0.20), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 12%, rgba(124,58,237,0.18), transparent 65%), radial-gradient(ellipse 40% 40% at 10% 30%, rgba(251,191,36,0.10), transparent 65%), #07080d"
        }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <DotGrid size={24} className="opacity-60" fade={false} />
      </div>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
    </>
  );
}
