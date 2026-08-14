"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, Square, Terminal as TerminalIcon, Trash2, XCircle, Zap } from "lucide-react";
import type { RunResult, SubmissionStatus } from "@codexa/types";

export type TerminalEntry = {
  id: string;
  label: string;
  command?: string;
  stdin?: string;
  expected?: string;
  status: SubmissionStatus | "RUNNING" | "INFO";
  stdout?: string;
  stderr?: string;
  runtimeMs?: number;
  hidden?: boolean;
};

type Props = {
  title?: string;
  entries: TerminalEntry[];
  loading?: boolean;
  onClear?: () => void;
  footer?: React.ReactNode;
};

function statusColor(status: TerminalEntry["status"]) {
  switch (status) {
    case "ACCEPTED":
      return "text-emerald-300";
    case "WRONG_ANSWER":
    case "RUNTIME_ERROR":
    case "COMPILE_ERROR":
    case "SYSTEM_ERROR":
      return "text-signal-rose";
    case "TIME_LIMIT_EXCEEDED":
    case "MEMORY_LIMIT_EXCEEDED":
      return "text-amber-300";
    case "RUNNING":
    case "PENDING":
      return "text-signal-cyan";
    default:
      return "text-white/60";
  }
}

function statusIcon(status: TerminalEntry["status"]) {
  switch (status) {
    case "ACCEPTED":
      return <CheckCircle2 size={12} className="text-emerald-300" />;
    case "WRONG_ANSWER":
    case "RUNTIME_ERROR":
    case "COMPILE_ERROR":
    case "SYSTEM_ERROR":
      return <XCircle size={12} className="text-signal-rose" />;
    case "TIME_LIMIT_EXCEEDED":
    case "MEMORY_LIMIT_EXCEEDED":
      return <Square size={12} className="text-amber-300" />;
    case "RUNNING":
      return <Loader2 size={12} className="animate-spin text-signal-cyan" />;
    case "INFO":
      return <Zap size={12} className="text-signal-cyan" />;
    default:
      return <Square size={11} className="text-white/40" />;
  }
}

export function TerminalOutput({ title = "TERMINAL", entries, loading, onClear, footer }: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0a0c10] font-mono text-[12px] text-white/85">
      <div className="flex h-7 shrink-0 items-center justify-between border-b border-white/10 bg-ink-950 px-3">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/64">
          <TerminalIcon size={11} />
          {title}
          {loading && <Loader2 size={10} className="ml-1 animate-spin text-signal-cyan" />}
        </div>
        {onClear && entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex size-5 items-center justify-center rounded text-white/40 transition hover:bg-white/10 hover:text-white"
            title="Clear terminal"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-2 leading-5">
        {entries.length === 0 && !loading && (
          <div className="text-white/30">Press Run to execute the current code against the test cases.</div>
        )}
        {entries.map((entry) => (
          <TerminalRow key={entry.id} entry={entry} />
        ))}
        {loading && entries.length === 0 && (
          <div className="flex items-center gap-2 text-signal-cyan">
            <Loader2 size={12} className="animate-spin" />
            Booting executor…
          </div>
        )}
      </div>

      {footer && <div className="shrink-0 border-t border-white/10 bg-ink-950 px-3 py-1.5">{footer}</div>}
    </div>
  );
}

function TerminalRow({ entry }: { entry: TerminalEntry }) {
  const [open, setOpen] = useState(entry.status !== "ACCEPTED" && entry.status !== "RUNNING");
  const showDetails = (entry.stdin ?? "").length > 0 || (entry.stdout ?? "").length > 0 || (entry.stderr ?? "").length > 0 || (entry.expected ?? "").length > 0;

  return (
    <div className="mb-2 last:mb-0">
      <button
        type="button"
        onClick={() => showDetails && setOpen((value) => !value)}
        disabled={!showDetails}
        className={`flex w-full items-center gap-2 rounded-sm px-1 text-left transition ${
          showDetails ? "hover:bg-white/[0.04]" : "cursor-default"
        }`}
      >
        {showDetails ? (
          open ? <ChevronDown size={11} className="text-white/40" /> : <ChevronRight size={11} className="text-white/40" />
        ) : (
          <span className="w-[11px]" />
        )}
        <span className="text-signal-cyan">$</span>
        <span className="text-white/64">{entry.command ?? entry.label}</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px]">
          {statusIcon(entry.status)}
          <span className={statusColor(entry.status)}>{entry.status}</span>
          {typeof entry.runtimeMs === "number" && entry.runtimeMs > 0 && (
            <span className="text-white/30">{entry.runtimeMs}ms</span>
          )}
        </span>
      </button>

      {open && showDetails && (
        <div className="ml-5 mt-1 space-y-1">
          {entry.stdin && (
            <Block label="stdin" color="text-white/40">
              {entry.hidden ? "(hidden)" : entry.stdin}
            </Block>
          )}
          {entry.stdout && (
            <Block label="stdout" color="text-emerald-200/80">
              {entry.stdout}
            </Block>
          )}
          {entry.stderr && (
            <Block label="stderr" color="text-signal-rose">
              {entry.stderr}
            </Block>
          )}
          {entry.expected && entry.status !== "ACCEPTED" && (
            <Block label="expected" color="text-white/40">
              {entry.hidden ? "(hidden)" : entry.expected}
            </Block>
          )}
        </div>
      )}
    </div>
  );
}

function Block({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-white/[0.04] bg-white/[0.02] p-2">
      <div className={`mb-0.5 text-[10px] uppercase tracking-wider ${color}`}>{label}</div>
      <pre className="whitespace-pre-wrap break-words text-[11px] leading-5 text-white/78">{children}</pre>
    </div>
  );
}

export function buildTerminalEntries(results: RunResult[]): TerminalEntry[] {
  return results.map((result, idx) => {
    const entry: TerminalEntry = {
      id: result.testCaseId || `test-${idx + 1}`,
      label: `test ${idx + 1}`,
      command: `run ${result.testCaseId || `test-${idx + 1}`}`,
      status: result.status,
      runtimeMs: result.runtimeMs
    };
    if (result.stdout) entry.stdout = result.stdout;
    if (result.stderr) entry.stderr = result.stderr;
    if (result.expected) entry.expected = result.expected;
    return entry;
  });
}
