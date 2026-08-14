"use client";

import { motion, useReducedMotion, type Transition } from "framer-motion";
import { Highlight, themes, type Language } from "prism-react-renderer";
import {
  Circle,
  FileCode2,
  Lock,
  Radio,
  Terminal,
  X
} from "lucide-react";
import type { ReactNode, CSSProperties } from "react";

/* ─────────────── Backgrounds ─────────────── */

/**
 * Animated dot grid backdrop — Linear/Cursor-style. Drawn with CSS so it stays
 * cheap. The mask gradient fades the edges out.
 */
export function DotGrid({
  size = 22,
  className = "",
  fade = true
}: {
  size?: number;
  className?: string;
  fade?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
        backgroundSize: `${size}px ${size}px`,
        maskImage: fade
          ? "radial-gradient(ellipse at center, black 50%, transparent 80%)"
          : undefined,
        WebkitMaskImage: fade
          ? "radial-gradient(ellipse at center, black 50%, transparent 80%)"
          : undefined
      }}
    />
  );
}

/**
 * Conic gradient mesh — the "premium" background a la Cursor/Linear hero.
 */
export function GradientMesh({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(25,211,218,0.18), transparent 60%), radial-gradient(ellipse 70% 50% at 100% 10%, rgba(244,114,182,0.16), transparent 65%), radial-gradient(ellipse 60% 50% at 0% 30%, rgba(124,58,237,0.14), transparent 65%)"
      }}
    />
  );
}

/**
 * Animated cyan/fuchsia beam that pulses diagonally across a container.
 */
export function ConicBeam({ delay = 0 }: { delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute -inset-1 overflow-hidden rounded-[inherit]"
      initial={{ opacity: 0 }}
      animate={reduce ? { opacity: 0.35 } : { opacity: [0.15, 0.45, 0.15] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <div
        className="absolute inset-[-100%]"
        style={{
          background:
            "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(25,211,218,0.45) 30deg, rgba(244,114,182,0.45) 90deg, transparent 180deg, transparent 360deg)"
        }}
      />
    </motion.div>
  );
}

/* ─────────────── Eyebrow / chips ─────────────── */

export function Eyebrow({
  children,
  tone = "cyan"
}: {
  children: ReactNode;
  tone?: "cyan" | "fuchsia" | "amber" | "violet" | "neutral";
}) {
  const map = {
    cyan: "border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan",
    fuchsia: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-200",
    amber: "border-amber-300/30 bg-amber-300/10 text-amber-200",
    violet: "border-violet-300/30 bg-violet-300/10 text-violet-200",
    neutral: "border-white/10 bg-white/[0.04] text-white/70"
  } as const;
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-wide ${map[tone]}`}>
      {children}
    </div>
  );
}

export function LiveDot({ tone = "cyan" }: { tone?: "cyan" | "fuchsia" | "amber" | "emerald" }) {
  const map = {
    cyan: "bg-signal-cyan shadow-[0_0_10px_rgba(25,211,218,0.7)]",
    fuchsia: "bg-fuchsia-300 shadow-[0_0_10px_rgba(244,114,182,0.7)]",
    amber: "bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.7)]",
    emerald: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]"
  } as const;
  return (
    <span className="relative inline-flex">
      <span className={`size-1.5 rounded-full ${map[tone]}`} />
      <motion.span
        className={`absolute inset-0 rounded-full ${map[tone]}`}
        animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
    </span>
  );
}

/* ─────────────── Code block (real syntax highlighting) ─────────────── */

const codexTheme = {
  ...themes.vsDark,
  plain: { ...themes.vsDark.plain, backgroundColor: "transparent" },
  styles: [
    ...themes.vsDark.styles,
    { types: ["keyword", "selector"], style: { color: "#f472b6" } },
    { types: ["function", "function-variable", "method"], style: { color: "#a78bfa" } },
    { types: ["string", "url"], style: { color: "#fde68a" } },
    { types: ["number", "boolean"], style: { color: "#19d3da" } },
    { types: ["comment", "prolog", "doctype", "cdata"], style: { color: "#64748b", fontStyle: "italic" as const } },
    { types: ["class-name", "tag", "constant"], style: { color: "#7dd3fc" } },
    { types: ["punctuation"], style: { color: "rgba(255,255,255,0.55)" } },
    { types: ["operator"], style: { color: "rgba(255,255,255,0.7)" } }
  ]
};

export type RemoteCursor = {
  /** zero-indexed line */
  line: number;
  /** column character offset within the line */
  col: number;
  name: string;
  tone: "cyan" | "fuchsia" | "amber" | "violet";
};

export function CodeBlock({
  code,
  language = "tsx",
  filename,
  cursors,
  lineNumbers = true,
  height = 320,
  highlightLines = [],
  showHeader = true,
  className = ""
}: {
  code: string;
  language?: Language;
  filename?: string;
  cursors?: RemoteCursor[];
  lineNumbers?: boolean;
  height?: number;
  highlightLines?: number[];
  showHeader?: boolean;
  className?: string;
}) {
  const cursorColorMap: Record<RemoteCursor["tone"], { line: string; tag: string }> = {
    cyan: { line: "bg-signal-cyan", tag: "bg-signal-cyan text-ink-950" },
    fuchsia: { line: "bg-fuchsia-300", tag: "bg-fuchsia-300 text-ink-950" },
    amber: { line: "bg-amber-300", tag: "bg-amber-300 text-ink-950" },
    violet: { line: "bg-violet-300", tag: "bg-violet-300 text-ink-950" }
  };

  return (
    <div className={`overflow-hidden rounded-xl border border-white/10 bg-[#0a0b10] shadow-[0_30px_120px_-40px_rgba(0,0,0,0.8)] ${className}`}>
      {showHeader && (
        <div className="flex h-9 items-center gap-2 border-b border-white/10 bg-white/[0.02] px-3">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          {filename && (
            <div className="ml-3 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-ink-950/60 px-2 py-0.5 font-mono text-[11px] text-white/60">
              <FileCode2 size={11} className="text-signal-cyan" />
              {filename}
            </div>
          )}
          <div className="ml-auto inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
            <Radio size={10} className="text-signal-cyan" /> live
          </div>
        </div>
      )}

      <div className="relative overflow-hidden" style={{ height }}>
        <Highlight code={code.trim()} language={language} theme={codexTheme}>
          {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={`m-0 px-0 py-3 font-mono text-[12.5px] leading-[1.6] ${hlClassName}`}
              style={{ ...style, background: "transparent" }}
            >
              {tokens.map((line, lineIdx) => {
                const lineProps = getLineProps({ line });
                const isHighlighted = highlightLines.includes(lineIdx);
                return (
                  <div
                    key={lineIdx}
                    {...lineProps}
                    className={`relative flex px-4 ${isHighlighted ? "bg-signal-cyan/[0.07]" : ""} ${lineProps.className ?? ""}`}
                  >
                    {lineNumbers && (
                      <span className="mr-4 inline-block w-6 shrink-0 select-none text-right font-mono text-[11px] text-white/25">
                        {lineIdx + 1}
                      </span>
                    )}
                    <span className="flex-1">
                      {line.map((token, j) => (
                        <span key={j} {...getTokenProps({ token })} />
                      ))}
                    </span>

                    {/* render any cursors that live on this line */}
                    {cursors
                      ?.filter((c) => c.line === lineIdx)
                      .map((c, ci) => (
                        <Cursor key={`${c.name}-${ci}`} cursor={c} colorMap={cursorColorMap[c.tone]} />
                      ))}
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}

function Cursor({
  cursor,
  colorMap
}: {
  cursor: RemoteCursor;
  colorMap: { line: string; tag: string };
}) {
  // approx 7.6px per mono char at 12.5px font; offset by line-number gutter
  const leftPx = 16 + 6 * 4 + 16 + cursor.col * 7.6;
  return (
    <span
      className="pointer-events-none absolute inset-y-0"
      style={{ left: leftPx }}
    >
      <motion.span
        className={`absolute top-1 h-[18px] w-[2px] ${colorMap.line}`}
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ duration: 1.1, repeat: Infinity }}
      />
      <span className={`absolute -top-[14px] left-0 rounded px-1 py-[1px] font-mono text-[9px] font-bold ${colorMap.tag}`}>
        {cursor.name}
      </span>
    </span>
  );
}

/* ─────────────── IDE Panel (heavy hero mockup) ─────────────── */

export type IDEFile = { name: string; tone: "cyan" | "fuchsia" | "amber" | "violet"; locked?: boolean };

export function IDEPanel({
  files,
  activeIndex = 0,
  code,
  language = "tsx",
  cursors,
  onlineNames = [],
  height = 360,
  highlightLines,
  className = ""
}: {
  files: IDEFile[];
  activeIndex?: number;
  code: string;
  language?: Language;
  cursors?: RemoteCursor[];
  onlineNames?: { name: string; tone: "cyan" | "fuchsia" | "amber" | "violet" }[];
  height?: number;
  highlightLines?: number[];
  className?: string;
}) {
  const toneToDot: Record<IDEFile["tone"], string> = {
    cyan: "bg-signal-cyan",
    fuchsia: "bg-fuchsia-300",
    amber: "bg-amber-300",
    violet: "bg-violet-300"
  };
  return (
    <div className={`overflow-hidden rounded-2xl border border-white/10 bg-[#0a0b10] shadow-[0_40px_140px_-30px_rgba(0,0,0,0.9)] ${className}`}>
      {/* title bar */}
      <div className="flex h-9 items-center gap-2 border-b border-white/10 bg-white/[0.02] px-3">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="ml-3 truncate font-mono text-[11px] text-white/45">
          codexa · {files[activeIndex]?.name ?? "untitled"}
        </div>
        <div className="ml-auto flex items-center gap-3 text-[10px] text-white/45">
          <span className="inline-flex items-center gap-1"><Radio size={10} className="text-signal-cyan animate-pulse" /> live</span>
          {onlineNames.length > 0 && (
            <span className="flex items-center -space-x-1.5">
              {onlineNames.map((p) => (
                <span
                  key={p.name}
                  className={`size-3.5 rounded-full border border-ink-950 ${toneToDot[p.tone]}`}
                  title={p.name}
                />
              ))}
            </span>
          )}
        </div>
      </div>
      {/* tab strip */}
      <div className="flex h-8 items-center gap-1 border-b border-white/10 bg-white/[0.015] px-2">
        {files.map((f, i) => (
          <div
            key={f.name}
            className={`group flex h-7 items-center gap-1.5 rounded-md border px-2 font-mono text-[11px] transition ${
              i === activeIndex
                ? "border-white/15 bg-white/[0.07] text-white"
                : "border-transparent text-white/50 hover:text-white/80"
            }`}
          >
            <span className={`size-1.5 rounded-full ${toneToDot[f.tone]}`} />
            {f.name}
            {f.locked && <Lock size={10} className="text-amber-300" />}
            <X size={11} className="ml-1 text-white/30 transition group-hover:text-white/70" />
          </div>
        ))}
      </div>
      {/* editor */}
      <CodeBlock
        code={code}
        language={language}
        cursors={cursors}
        highlightLines={highlightLines}
        height={height}
        showHeader={false}
        className="rounded-none border-0"
      />
      {/* status bar */}
      <div className="flex h-7 items-center justify-between gap-3 border-t border-white/10 bg-signal-cyan/15 px-3 text-[10.5px] text-white/85">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5"><Radio size={10} className="text-signal-cyan" /> live</span>
          <span className="font-mono">room/9f2a8c</span>
          <span className="inline-flex items-center gap-1">{onlineNames.length} online</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono">{files[activeIndex]?.name}</span>
          <span className="uppercase tracking-wider">{language.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Terminal mockup ─────────────── */

export function TerminalPanel({
  title = "arena · sandbox",
  lines,
  className = ""
}: {
  title?: string;
  lines: Array<{ prompt?: string; text: string; tone?: "muted" | "ok" | "warn" | "err" | "info" }>;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const toneClass = {
    muted: "text-white/55",
    ok: "text-emerald-300",
    warn: "text-amber-300",
    err: "text-signal-rose",
    info: "text-signal-cyan"
  } as const;

  return (
    <div className={`overflow-hidden rounded-xl border border-white/10 bg-[#06080c] shadow-[0_30px_120px_-40px_rgba(0,0,0,0.8)] ${className}`}>
      <div className="flex h-8 items-center gap-2 border-b border-white/10 bg-white/[0.02] px-3">
        <Terminal size={12} className="text-signal-cyan" />
        <span className="font-mono text-[11px] text-white/55">{title}</span>
      </div>
      <div className="space-y-1 px-4 py-3 font-mono text-[11.5px] leading-relaxed">
        {lines.map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            whileInView={reduce ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.35, delay: 0.06 * i }}
            className="flex items-baseline gap-2"
          >
            {l.prompt && <span className="select-none text-signal-cyan/80">{l.prompt}</span>}
            <span className={l.tone ? toneClass[l.tone] : "text-white/85"}>{l.text}</span>
          </motion.div>
        ))}
        <motion.span
          className="ml-0 inline-block h-3 w-2 translate-y-0.5 bg-signal-cyan/80"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        />
      </div>
    </div>
  );
}

/* ─────────────── Bento ─────────────── */

export function Bento({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid auto-rows-[minmax(180px,auto)] gap-4 sm:grid-cols-6 ${className}`}>{children}</div>
  );
}

export function BentoCard({
  span = "col-span-6 sm:col-span-3",
  tone = "neutral",
  children,
  className = ""
}: {
  span?: string;
  tone?: "neutral" | "cyan" | "fuchsia" | "amber" | "violet";
  children: ReactNode;
  className?: string;
}) {
  const toneMap = {
    neutral: "hover:border-white/20",
    cyan: "hover:border-signal-cyan/40",
    fuchsia: "hover:border-fuchsia-300/40",
    amber: "hover:border-amber-300/40",
    violet: "hover:border-violet-300/40"
  } as const;
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 transition ${toneMap[tone]} ${span} ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100" style={{
        background:
          "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(25,211,218,0.10), transparent 70%)"
      }} />
      {children}
    </div>
  );
}

/* ─────────────── Stat (animated) ─────────────── */

export function Stat({
  label,
  value,
  hint
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
      <div className="text-[11px] uppercase tracking-wider text-white/45">{label}</div>
      <div className="mt-1.5 font-mono text-2xl font-semibold tracking-tight text-white">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-white/45">{hint}</div>}
    </div>
  );
}

/* ─────────────── Logo marquee (open-source stack) ─────────────── */

const stackLogos = [
  "Next.js",
  "React 19",
  "TypeScript",
  "Yjs",
  "Monaco",
  "Socket.IO",
  "BullMQ",
  "Redis",
  "Postgres",
  "Prisma",
  "Docker",
  "MCP",
  "OpenRouter"
];

export function StackMarquee() {
  const reduce = useReducedMotion();
  const repeated = [...stackLogos, ...stackLogos];
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(90deg, transparent, black 10%, black 90%, transparent)",
        WebkitMaskImage:
          "linear-gradient(90deg, transparent, black 10%, black 90%, transparent)"
      }}
    >
      <motion.div
        className="flex gap-10 py-2 text-sm font-medium text-white/55"
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
      >
        {repeated.map((label, i) => (
          <span key={`${label}-${i}`} className="inline-flex items-center gap-2 whitespace-nowrap font-mono uppercase tracking-[0.18em]">
            <Circle size={6} className="fill-white/30 text-white/30" />
            {label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ─────────────── Animated metric (counts up on mount) ─────────────── */

export function MetricRow({
  items
}: {
  items: { label: string; value: string; sub?: string }[];
}) {
  const tx: Transition = { duration: 0.5, ease: "easeOut" };
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it, i) => (
        <motion.div
          key={it.label}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ ...tx, delay: 0.05 * i }}
          className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4"
        >
          <div className="text-[11px] uppercase tracking-wider text-white/45">{it.label}</div>
          <div className="mt-1 font-mono text-2xl font-semibold tracking-tight text-white">{it.value}</div>
          {it.sub && <div className="mt-0.5 text-[11px] text-white/50">{it.sub}</div>}
        </motion.div>
      ))}
    </div>
  );
}

/* ─────────────── Section heading ─────────────── */

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
  tone = "cyan"
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  tone?: "cyan" | "fuchsia" | "amber" | "violet" | "neutral";
}) {
  const alignment = align === "center" ? "mx-auto text-center" : "";
  return (
    <div className={`max-w-2xl ${alignment}`}>
      {eyebrow && <Eyebrow tone={tone}>{eyebrow}</Eyebrow>}
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-[15px] leading-7 text-white/60">{subtitle}</p>}
    </div>
  );
}

/* ─────────────── Spotlight (cursor-follow optional) ─────────────── */

export function Spotlight({
  className = "",
  color = "rgba(25,211,218,0.18)",
  size = 700
}: {
  className?: string;
  color?: string;
  size?: number;
}) {
  const style: CSSProperties = {
    width: size,
    height: size,
    background: `radial-gradient(closest-side, ${color}, transparent 70%)`
  };
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute -z-10 rounded-full blur-3xl ${className}`}
      style={style}
    />
  );
}
