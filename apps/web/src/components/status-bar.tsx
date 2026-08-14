"use client";

import { Bell, CircleCheckBig, GitBranch, Lock, Radio, Users, WifiOff } from "lucide-react";

type Props = {
  roomId: string;
  displayName: string;
  online: number;
  activeFileName?: string;
  language?: string;
  lockedBy?: string;
  connected: boolean;
};

export function StatusBar({ roomId, displayName, online, activeFileName, language, lockedBy, connected }: Props) {
  return (
    <div className="flex h-6 items-center justify-between gap-3 border-t border-white/10 bg-signal-cyan/15 px-3 text-[11px] font-medium text-white/82">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1">
          {connected ? <Radio size={11} className="text-signal-cyan" /> : <WifiOff size={11} className="text-signal-rose" />}
          {connected ? "live" : "offline"}
        </span>
        <span className="inline-flex items-center gap-1 truncate">
          <GitBranch size={11} />
          room/{roomId.slice(0, 8)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users size={11} />
          {online} online
        </span>
        <span className="inline-flex items-center gap-1 text-white/64">{displayName}</span>
      </div>

      <div className="flex items-center gap-3">
        {lockedBy && (
          <span className="inline-flex items-center gap-1 text-signal-rose">
            <Lock size={11} />
            locked by {lockedBy}
          </span>
        )}
        {activeFileName && (
          <span className="inline-flex items-center gap-1 truncate">
            <CircleCheckBig size={11} className="text-signal-cyan" />
            {activeFileName}
          </span>
        )}
        {language && <span className="truncate uppercase tracking-wider">{language}</span>}
        <span className="inline-flex items-center gap-1 text-white/64">
          <Bell size={11} />
          UTF-8
        </span>
      </div>
    </div>
  );
}
