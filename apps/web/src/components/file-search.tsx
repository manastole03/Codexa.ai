"use client";

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { Loader2, Search } from "lucide-react";

type Match = {
  fileId: string;
  fileName: string;
  lineNumber: number;
  column: number;
  preview: string;
};

type Props = {
  socket: Socket;
  roomId: string;
  onOpen: (fileId: string) => void;
};

export function FileSearch({ socket, roomId, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onResult = ({ query: q, matches: next, total: nextTotal }: { query: string; matches: Match[]; total?: number }) => {
      setMatches(next);
      setTotal(typeof nextTotal === "number" ? nextTotal : next.length);
      setLastQuery(q);
      setLoading(false);
    };
    socket.on("collab:search:result", onResult);
    return () => {
      socket.off("collab:search:result", onResult);
    };
  }, [socket]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setMatches([]);
      setTotal(0);
      setLastQuery("");
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      socket.emit("collab:search", { roomId, query: query.trim(), caseSensitive });
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, caseSensitive, roomId, socket]);

  // group matches by file
  const grouped = matches.reduce<Record<string, { fileName: string; rows: Match[] }>>((acc, m) => {
    const existing = acc[m.fileId];
    if (existing) {
      existing.rows.push(m);
    } else {
      acc[m.fileId] = { fileName: m.fileName, rows: [m] };
    }
    return acc;
  }, {});

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 items-center border-b border-white/10 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/64">
        Search
      </div>

      <div className="space-y-2 border-b border-white/10 p-2">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search files in room"
            className="h-8 w-full rounded border border-white/10 bg-ink-950 pl-7 pr-2 text-xs text-white outline-none focus:border-signal-cyan"
          />
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-white/56">
          <input
            type="checkbox"
            className="accent-signal-cyan"
            checked={caseSensitive}
            onChange={(event) => setCaseSensitive(event.target.checked)}
          />
          Case sensitive
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-white/40">
            <Loader2 size={12} className="animate-spin" />
            Searching…
          </div>
        )}
        {!loading && lastQuery && matches.length === 0 && (
          <div className="px-3 py-3 text-[11px] text-white/40">No results for &ldquo;{lastQuery}&rdquo;.</div>
        )}
        {!loading && matches.length > 0 && (
          <div className="px-1 py-2 text-[11px]">
            <div className="px-2 pb-1 text-white/40">
              {matches.length}
              {total > matches.length ? ` of ${total}` : ""} matches
            </div>
            {Object.entries(grouped).map(([fileId, group]) => (
              <div key={fileId} className="mb-2">
                <button
                  type="button"
                  onClick={() => onOpen(fileId)}
                  className="flex w-full items-center justify-between rounded px-2 py-1 font-mono text-[11px] font-semibold text-white/80 hover:bg-white/[0.06]"
                >
                  <span className="truncate">{group.fileName}</span>
                  <span className="text-white/40">{group.rows.length}</span>
                </button>
                <div className="pl-2">
                  {group.rows.map((row, idx) => (
                    <button
                      key={`${row.fileId}-${row.lineNumber}-${idx}`}
                      type="button"
                      onClick={() => onOpen(row.fileId)}
                      className="block w-full truncate rounded px-2 py-0.5 text-left font-mono text-[11px] text-white/56 hover:bg-white/[0.05] hover:text-white"
                      title={`${row.fileName}:${row.lineNumber}`}
                    >
                      <span className="mr-2 text-white/30">{row.lineNumber}</span>
                      {highlight(row.preview, query, caseSensitive)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function highlight(text: string, query: string, caseSensitive: boolean) {
  if (!query) return text;
  const needle = caseSensitive ? query : query.toLowerCase();
  const hay = caseSensitive ? text : text.toLowerCase();
  const parts: Array<{ text: string; match: boolean }> = [];
  let cursor = 0;
  while (cursor < text.length) {
    const idx = hay.indexOf(needle, cursor);
    if (idx === -1) {
      parts.push({ text: text.slice(cursor), match: false });
      break;
    }
    if (idx > cursor) parts.push({ text: text.slice(cursor, idx), match: false });
    parts.push({ text: text.slice(idx, idx + query.length), match: true });
    cursor = idx + query.length;
  }
  return (
    <>
      {parts.map((part, i) => (
        <span key={i} className={part.match ? "rounded bg-signal-cyan/30 px-0.5 text-white" : ""}>
          {part.text}
        </span>
      ))}
    </>
  );
}
