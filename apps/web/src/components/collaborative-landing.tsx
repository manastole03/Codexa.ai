"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Cpu,
  FileCode2,
  GitBranch,
  Lock,
  MessageSquare,
  MousePointer2,
  Network,
  PanelsTopLeft,
  Plug,
  Radio,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  Zap
} from "lucide-react";
import { CollaborativeLauncher } from "@/components/collaborative-launcher";
import {
  Bento,
  BentoCard,
  CodeBlock,
  ConicBeam,
  DotGrid,
  Eyebrow,
  IDEPanel,
  LiveDot,
  MetricRow,
  SectionHeader,
  Spotlight,
  StackMarquee,
  TerminalPanel
} from "@/components/landing-ui";

const heroCode = `import { Awareness } from "y-protocols/awareness";
import { MonacoBinding } from "y-monaco";
import { connectRoom } from "@codexa/realtime";

export function pair(doc, editor, user) {
  const awareness = new Awareness(doc);

  awareness.setLocalState({
    user: { name: user.name, color: user.color },
    cursor: { line: 0, ch: 0 }
  });

  connectRoom("/rooms", user.roomId).onUpdate((u) => {
    Y.applyUpdate(doc, u);
  });

  return new MonacoBinding(
    doc.getText("file"),
    editor.getModel(),
    new Set([editor]),
    awareness
  );
}`;

const aiCode = `// codexa.ai · pair programmer
const explanation = await ai.stream({
  file: activeFile,                  // current Monaco model
  selection: editor.getSelection(),
  intent: "refactor:extract-fn"      // also: explain | review | tests
});

for await (const delta of explanation) {
  panel.append(delta);
}`;

const featuresBento = [
  {
    span: "col-span-6 sm:col-span-4",
    Icon: MousePointer2,
    title: "Yjs-backed live cursors & presence",
    body: "Every teammate's cursor, selection, and active file is broadcast through Yjs awareness. Conflict-free under load — no central locks, no operational transform.",
    tone: "cyan" as const,
    visual: (
      <PresenceVisual />
    )
  },
  {
    span: "col-span-6 sm:col-span-2",
    Icon: FileCode2,
    title: "Shared multi-file tabs",
    body: "Open, rename, close — every tab is CRDT-synced and persisted to Postgres.",
    tone: "fuchsia" as const
  },
  {
    span: "col-span-6 sm:col-span-3",
    Icon: Lock,
    title: "Owner-only locks",
    body: "Claim a file when you need to drive. Others flip read-only with a lock badge. No merge surprises.",
    tone: "amber" as const,
    visual: (
      <div className="mt-5 rounded-xl border border-amber-300/20 bg-ink-950/60 p-3 text-[11.5px]">
        <div className="flex items-center justify-between text-white/65">
          <span className="inline-flex items-center gap-1.5 font-mono"><FileCode2 size={11} className="text-fuchsia-300" /> server.ts</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 font-bold uppercase tracking-wider text-amber-300">
            <Lock size={10} /> locked · rohan
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-white/55">
          <span className="inline-flex items-center gap-1.5 font-mono"><FileCode2 size={11} className="text-signal-cyan" /> awareness.ts</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-bold uppercase tracking-wider text-emerald-300">
            open
          </span>
        </div>
      </div>
    )
  },
  {
    span: "col-span-6 sm:col-span-3",
    Icon: Bot,
    title: "AI pair programmer",
    body: "OpenRouter-backed AI panel that streams against your active file's live content — not a stale snapshot.",
    tone: "violet" as const,
    visual: (
      <div className="mt-5">
        <CodeBlock code={aiCode} language="tsx" filename="ai-pair.ts" height={150} lineNumbers={false} />
      </div>
    )
  },
  {
    span: "col-span-6 sm:col-span-3",
    Icon: Plug,
    title: "Live MCP server panel",
    body: "Right panel is a real MCP client: list tools, list resources, invoke with one click. Production code talking to production code.",
    tone: "fuchsia" as const
  },
  {
    span: "col-span-6 sm:col-span-3",
    Icon: MessageSquare,
    title: "Room chat",
    body: "Lightweight Socket.IO chat sits next to the code. No context-switching to Slack for quick questions.",
    tone: "cyan" as const
  }
];

const steps = [
  { Icon: Users, title: "Create a room", body: "Pick a display name, hit Create, share the URL. First in becomes admin." },
  { Icon: Terminal, title: "Code together", body: "Monaco + Yjs streams every keystroke, cursor, and selection. Open new tabs, lock files." },
  { Icon: Sparkles, title: "Ship faster", body: "AI chat reads your current file. MCP exposes tools. Room chat handles the rest." }
];

export function CollaborativeLanding() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-950 text-white antialiased">
      <BackdropLayer />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 pb-24 pt-5">
        <Nav />

        {/* HERO */}
        <section className="relative grid items-center gap-12 py-20 lg:grid-cols-[1fr_1.1fr] lg:py-28">
          <Spotlight className="left-1/2 -top-44 -translate-x-1/2" color="rgba(25,211,218,0.20)" size={900} />

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Eyebrow tone="cyan">
              <LiveDot tone="cyan" /> Realtime · CRDT-backed · multiplayer by default
            </Eyebrow>
            <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.02em] text-white sm:text-6xl lg:text-[80px]">
              VS Code, <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-signal-cyan via-fuchsia-300 to-violet-300 bg-clip-text text-transparent">
                shared in real time.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-[15px] leading-7 text-white/65">
              A collaborative workspace that looks and feels like VS Code, but every cursor, tab,
              file, and chat message is synced live to your whole team. Yjs CRDT under the hood,
              Monaco on top, with an AI pair programmer and a working Model Context Protocol panel.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#start"
                className="group inline-flex h-11 items-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-ink-950 hover:bg-white/90"
              >
                <PanelsTopLeft size={15} />
                Open a room
                <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
              </a>
              <a
                href="#features"
                className="inline-flex h-11 items-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-5 text-sm font-semibold text-white/90 hover:bg-white/[0.08]"
              >
                Explore features
              </a>
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] text-white/45">
              <span className="inline-flex items-center gap-2"><Cpu size={12} className="text-signal-cyan" /> Yjs 13.6 + y-monaco</span>
              <span className="inline-flex items-center gap-2"><Network size={12} className="text-signal-cyan" /> Socket.IO transport</span>
              <span className="inline-flex items-center gap-2"><Plug size={12} className="text-fuchsia-300" /> MCP server panel</span>
              <span className="inline-flex items-center gap-2"><Bot size={12} className="text-violet-300" /> OpenRouter AI</span>
            </div>
          </motion.div>

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
                height={400}
                highlightLines={[4, 5, 6, 7, 8, 9, 10]}
                cursors={[
                  { line: 7, col: 28, name: "asha", tone: "cyan" },
                  { line: 13, col: 18, name: "rohan", tone: "fuchsia" },
                  { line: 19, col: 12, name: "mei", tone: "amber" }
                ]}
                onlineNames={[
                  { name: "asha", tone: "cyan" },
                  { name: "rohan", tone: "fuchsia" },
                  { name: "mei", tone: "amber" }
                ]}
              />
            </div>

            {/* presence chip */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="absolute -bottom-5 right-4 z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/95 px-3 py-1.5 text-[11px] font-medium text-white/85 shadow-xl backdrop-blur-xl"
            >
              <span className="flex -space-x-1.5">
                <span className="size-3 rounded-full border border-ink-950 bg-signal-cyan" />
                <span className="size-3 rounded-full border border-ink-950 bg-fuchsia-300" />
                <span className="size-3 rounded-full border border-ink-950 bg-amber-300" />
              </span>
              asha, rohan, mei · typing
            </motion.div>
          </motion.div>
        </section>

        {/* Logo strip */}
        <section className="border-y border-white/[0.06] py-7">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">Powered by best-in-class open source</div>
          <div className="mt-4"><StackMarquee /></div>
        </section>

        {/* Metric row */}
        <section className="mt-20">
          <MetricRow
            items={[
              { label: "Sync latency", value: "47 ms", sub: "median, in-region" },
              { label: "Active users", value: "100+", sub: "tested concurrent" },
              { label: "CRDT", value: "Yjs 13.6", sub: "y-monaco binding" },
              { label: "Files / room", value: "∞", sub: "Postgres-backed" }
            ]}
          />
        </section>

        {/* Features bento */}
        <section id="features" className="mt-28">
          <SectionHeader
            eyebrow={<><Sparkles size={11} /> Features</>}
            title={<>Built like a real IDE. <span className="text-white/55">Synced like a Google Doc.</span></>}
            subtitle="No plug-ins, no setup. Sign in, share the room URL, and the workspace is identical for everyone in it."
            tone="cyan"
          />
          <Bento className="mt-12">
            {featuresBento.map((f) => {
              const Icon = f.Icon;
              return (
                <BentoCard key={f.title} span={f.span} tone={f.tone}>
                  <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-ink-950 text-signal-cyan">
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

        {/* How it works */}
        <section id="how" className="mt-28">
          <SectionHeader
            eyebrow={<><Zap size={11} /> How it works</>}
            title="From URL to live coding in three steps."
            subtitle="No installs. The room URL is the only thing you need to share."
            tone="cyan"
          />
          <div className="relative mt-12 grid gap-4 lg:grid-cols-3">
            <div aria-hidden className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-signal-cyan/30 to-transparent lg:block" />
            {steps.map((step, i) => {
              const Icon = step.Icon;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: 0.08 * i }}
                  className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6"
                >
                  <span className="absolute -top-3 left-6 inline-flex h-7 items-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-ink-950">
                    Step {i + 1}
                  </span>
                  <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-ink-950 text-signal-cyan">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">{step.body}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Realtime engine */}
        <section className="mt-28">
          <SectionHeader
            eyebrow={<><Cpu size={11} /> The realtime engine</>}
            title="CRDT + Socket.IO + Monaco — no compromises."
            subtitle="Yjs is the conflict-free backbone. y-monaco binds it to the editor. Socket.IO carries presence and chat. Everything is reconnect-safe and offline-tolerant."
            tone="violet"
          />
          <div className="mt-10 grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
            <TerminalPanel
              title="server · /rooms"
              lines={[
                { prompt: "$", text: "node apps/api/src/index.ts" },
                { text: "[ready] socket.io on :3001", tone: "info" },
                { text: "[room/9f2a8c] connect asha · cyan", tone: "muted" },
                { text: "[room/9f2a8c] connect rohan · fuchsia", tone: "muted" },
                { text: "[room/9f2a8c] connect mei · amber", tone: "muted" },
                { text: "[doc] applied update 14B · 11.7 KB total", tone: "ok" },
                { text: "[awareness] cursor asha → main.ts L7:C28", tone: "info" },
                { text: "[awareness] selection rohan → server.ts L13:C18", tone: "info" }
              ]}
            />
            <CodeBlock
              filename="awareness-binding.ts"
              language="tsx"
              height={300}
              code={`// y-monaco glues the CRDT to Monaco
import { MonacoBinding } from "y-monaco";

const yText = doc.getText("file");
const binding = new MonacoBinding(
  yText,
  editor.getModel(),
  new Set([editor]),
  awareness
);

// presence flows back to UI
awareness.on("change", () => {
  const remote = [...awareness.getStates().values()];
  ui.renderCursors(remote.filter(s => s.user.id !== me.id));
});`}
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
                <Eyebrow tone="cyan"><LiveDot tone="cyan" /> Open a room</Eyebrow>
                <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                  Spin up the workspace. <span className="text-white/55">Invite by URL.</span>
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-white/60">
                  You get an admin role, a file explorer, a live editor, AI chat, and a working MCP panel — instantly.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 text-[11px] text-white/55">
                  {[
                    "Multi-file workspace",
                    "Live cursors",
                    "Owner-only locks",
                    "AI pair programmer",
                    "MCP server panel",
                    "Room chat"
                  ].map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-ink-950/60 px-2.5 py-1">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <CollaborativeLauncher />
            </div>
          </motion.div>
        </section>

        <footer className="mt-16 border-t border-white/10 pt-6 text-xs text-white/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>© Codexa.ai — Collaborative Platform</span>
            <span className="inline-flex items-center gap-2">
              <GitBranch size={11} /> Next.js · Monaco · Yjs · Socket.IO · MCP
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

function PresenceVisual() {
  return (
    <div className="relative mt-5 overflow-hidden rounded-xl border border-white/10 bg-ink-950/60 p-3">
      <div className="flex items-center justify-between text-[11px] text-white/55">
        <span className="inline-flex items-center gap-1.5"><Radio size={11} className="text-signal-cyan animate-pulse" /> room/9f2a8c · live</span>
        <span className="font-mono">awareness.ts</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {(
          [
            { name: "asha", tone: "bg-signal-cyan", txt: "text-signal-cyan", line: "L7:C28" },
            { name: "rohan", tone: "bg-fuchsia-300", txt: "text-fuchsia-200", line: "L13:C18" },
            { name: "mei", tone: "bg-amber-300", txt: "text-amber-200", line: "L19:C12" }
          ] as const
        ).map((u) => (
          <div key={u.name} className="rounded-md border border-white/10 bg-ink-950 px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${u.tone}`} />
              <span className={`text-[11px] font-semibold ${u.txt}`}>{u.name}</span>
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-white/45">{u.line}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Nav() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-white/[0.07]">
      <a href="/" className="flex items-center gap-3">
        <Image src="/codexa.png" width={32} height={32} alt="Codexa.ai" className="rounded-md" />
        <span className="text-sm font-semibold uppercase tracking-[0.22em] text-white/85">Codexa · Collaborative</span>
      </a>
      <nav className="flex items-center gap-1 text-sm text-white/55">
        <a className="rounded-md px-3 py-2 hover:bg-white/[0.06] hover:text-white" href="#features">Features</a>
        <a className="rounded-md px-3 py-2 hover:bg-white/[0.06] hover:text-white" href="#how">How it works</a>
        <a className="rounded-md px-3 py-2 hover:bg-white/[0.06] hover:text-white" href="/arena">Arena</a>
        <a className="rounded-md px-3 py-2 hover:bg-white/[0.06] hover:text-white" href="/system-design">System Design</a>
        <a className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3.5 text-sm font-semibold text-ink-950 hover:bg-white/90" href="#start">
          Open a room <ArrowRight size={14} />
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
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(25,211,218,0.20), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 12%, rgba(124,58,237,0.16), transparent 65%), radial-gradient(ellipse 40% 40% at 10% 30%, rgba(244,114,182,0.10), transparent 65%), #07080d"
        }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <DotGrid size={24} className="opacity-60" fade={false} />
      </div>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-signal-cyan/50 to-transparent" />
    </>
  );
}
