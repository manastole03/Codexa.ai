"use client";

import { Files, Search, Settings, Users } from "lucide-react";

export type SidebarView = "explorer" | "search" | "members";

type Props = {
  view: SidebarView;
  onChange: (next: SidebarView) => void;
  online: number;
};

const items: Array<{ key: SidebarView; label: string; Icon: typeof Files }> = [
  { key: "explorer", label: "Explorer", Icon: Files },
  { key: "search", label: "Search", Icon: Search },
  { key: "members", label: "Members", Icon: Users }
];

export function ActivityBar({ view, onChange, online }: Props) {
  return (
    <div className="flex h-full w-12 shrink-0 flex-col items-center justify-between border-r border-white/10 bg-ink-950/95 py-2">
      <div className="flex flex-col gap-1">
        {items.map(({ key, label, Icon }) => {
          const active = view === key;
          return (
            <button
              key={key}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => onChange(key)}
              className={`relative flex size-10 items-center justify-center rounded transition ${
                active ? "text-white" : "text-white/56 hover:text-white"
              }`}
            >
              {active && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-signal-cyan" />}
              <span className="relative">
                <Icon size={18} />
                {key === "members" && online > 0 && (
                  <span className="absolute -right-2 -top-1.5 rounded-full bg-signal-cyan px-1 text-[9px] font-bold text-ink-950">
                    {online}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        title="Settings (coming soon)"
        aria-label="Settings"
        className="flex size-10 items-center justify-center text-white/40 transition hover:text-white/70"
      >
        <Settings size={18} />
      </button>
    </div>
  );
}
