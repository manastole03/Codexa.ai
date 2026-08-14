"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Copy, LogIn, MessageSquare, Send, Users, X } from "lucide-react";
import { Button } from "@codexa/ui";
import type { ActiveRoomUser, RoomRole } from "@codexa/types";
import { apiBaseUrl } from "@/lib/api";
import { SystemDesignSimulator } from "@/components/system-design-simulator";

type ChatMessage = { author: string; body: string };

export function SystemDesignWorkspace({
  roomId,
  displayName,
  email = ""
}: {
  roomId: string;
  displayName: string;
  email?: string;
}) {
  // Join gate — if the URL didn't carry a name, prompt for one before
  // connecting. Mirrors the pre-join screen on collab/arena rooms.
  const [hasJoined, setHasJoined] = useState(Boolean(displayName.trim()));
  const [joinName, setJoinName] = useState(displayName);
  const [joinEmail, setJoinEmail] = useState(email);
  const [joinedName, setJoinedName] = useState(displayName.trim());
  const [joinedEmail, setJoinedEmail] = useState(email);

  const [connected, setConnected] = useState(false);
  const [role, setRole] = useState<RoomRole>("user");
  const [notice, setNotice] = useState("");
  const [closedMessage, setClosedMessage] = useState("");
  const [activeUsers, setActiveUsers] = useState<ActiveRoomUser[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const socket = useMemo<Socket>(() => io(apiBaseUrl, { autoConnect: false }), []);

  useEffect(() => {
    if (!hasJoined) return;

    socket.connect();
    socket.emit("room:join", {
      roomId,
      product: "system-design",
      name: joinedName,
      email: joinedEmail || undefined
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("room:joined", ({ role: nextRole }: { role: RoomRole }) => {
      setRole(nextRole);
      setNotice(
        nextRole === "admin"
          ? "You are the room admin — first one in."
          : "You joined the whiteboard."
      );
    });
    socket.on(
      "room:state",
      ({ activeUsers: nextUsers }: { activeUsers: ActiveRoomUser[] }) => {
        setActiveUsers(nextUsers);
      }
    );
    socket.on("room:error", ({ message: nextMessage }: { message: string }) =>
      setNotice(nextMessage)
    );
    socket.on("room:removed", () => {
      setClosedMessage("You were removed from this room by the admin.");
      socket.disconnect();
    });
    socket.on("room:ended", () => {
      setClosedMessage("This room has ended.");
      socket.disconnect();
    });
    socket.on("chat:message", (next: ChatMessage) => {
      setChat((current) => [...current, next]);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room:joined");
      socket.off("room:state");
      socket.off("room:error");
      socket.off("room:removed");
      socket.off("room:ended");
      socket.off("chat:message");
      socket.disconnect();
    };
  }, [hasJoined, joinedEmail, joinedName, roomId, socket]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.length]);

  async function copyRoomLink() {
    const url = `${window.location.origin}/system-design/${roomId}?product=system-design`;
    await navigator.clipboard.writeText(url);
    setNotice("Room link copied — share it with your interviewer.");
  }

  function submitJoin() {
    const trimmed = joinName.trim();
    if (!trimmed) {
      setNotice("Display name is required to join.");
      return;
    }
    setJoinedName(trimmed);
    setJoinedEmail(joinEmail.trim().toLowerCase());
    setHasJoined(true);
    setNotice("");
  }

  function sendChat() {
    const body = message.trim();
    if (!body) return;
    socket.emit("chat:message", { roomId, author: joinedName, body });
    setMessage("");
  }

  if (closedMessage) {
    return (
      <ClosedScreen message={closedMessage} />
    );
  }

  if (!hasJoined) {
    return (
      <JoinGate
        roomId={roomId}
        joinName={joinName}
        setJoinName={setJoinName}
        joinEmail={joinEmail}
        setJoinEmail={setJoinEmail}
        notice={notice}
        onSubmit={submitJoin}
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-72px)] flex-col bg-ink-950 text-white">
      {/* Sub-header */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-ink-900/60 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              connected
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                : "border-amber-300/40 bg-amber-300/10 text-amber-300"
            }`}
          >
            <span className={`size-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-300"}`} />
            {connected ? "live" : "connecting…"}
          </span>
          <span className="hidden text-[11px] uppercase tracking-wider text-white/45 sm:inline">
            System Design · whiteboard
          </span>
          <span className="truncate font-mono text-[12px] text-white/55">room/{roomId.slice(0, 8)}</span>
        </div>

        <div className="flex items-center gap-2">
          <PresenceStrip users={activeUsers} role={role} />
          <button
            type="button"
            onClick={copyRoomLink}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-[12px] font-medium text-white/85 transition hover:bg-white/[0.08]"
          >
            <Copy size={13} /> Copy link
          </button>
          <button
            type="button"
            onClick={() => setChatOpen((open) => !open)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition ${
              chatOpen
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                : "border-white/10 bg-white/[0.04] text-white/85 hover:bg-white/[0.08]"
            }`}
          >
            <MessageSquare size={13} /> Chat
            {chat.length > 0 && (
              <span className="ml-1 rounded-full bg-white/15 px-1.5 text-[10px] font-mono">{chat.length}</span>
            )}
          </button>
        </div>
      </div>

      {notice && (
        <div className="border-b border-white/10 bg-emerald-400/[0.06] px-4 py-1.5 text-[12px] text-emerald-200">
          {notice}
        </div>
      )}

      {/* Workspace */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col p-2">
          <SystemDesignSimulator roomId={roomId} socket={socket} />
        </div>

        {chatOpen && (
          <aside className="flex w-72 shrink-0 flex-col border-l border-white/10 bg-ink-900/60">
            <div className="flex h-10 items-center justify-between border-b border-white/10 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/65">
              <span className="inline-flex items-center gap-1.5"><MessageSquare size={11} /> Room chat</span>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                aria-label="Close chat"
                className="rounded p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
            <div ref={chatScrollRef} className="flex-1 space-y-2 overflow-y-auto p-3 text-[12.5px]">
              {chat.length === 0 ? (
                <p className="text-[11.5px] text-white/40">
                  No messages yet. Ping the interviewer when you're ready to walk through.
                </p>
              ) : (
                chat.map((msg, i) => (
                  <div key={i} className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                      {msg.author}
                    </div>
                    <div className="mt-0.5 whitespace-pre-wrap text-white/85">{msg.body}</div>
                  </div>
                ))
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChat();
              }}
              className="flex items-center gap-1.5 border-t border-white/10 p-2"
            >
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message the room…"
                className="h-9 flex-1 rounded-md border border-white/10 bg-ink-950 px-2.5 text-[12.5px] text-white outline-none placeholder:text-white/30 focus:border-emerald-300/60"
              />
              <button
                type="submit"
                disabled={!message.trim()}
                aria-label="Send"
                className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-400 px-2.5 text-ink-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
              >
                <Send size={13} />
              </button>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}

function PresenceStrip({ users, role }: { users: ActiveRoomUser[]; role: RoomRole }) {
  if (users.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white/55">
        <Users size={12} /> 0
      </span>
    );
  }
  const visible = users.slice(0, 4);
  const remaining = users.length - visible.length;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white/75">
      <Users size={12} className="text-emerald-300" />
      <span className="flex -space-x-1.5">
        {visible.map((user, i) => (
          <span
            key={user.socketId}
            title={`${user.name}${user.role === "admin" ? " · admin" : ""}`}
            className={`flex size-5 items-center justify-center rounded-full border border-ink-900 text-[9px] font-bold uppercase ${
              user.role === "admin"
                ? "bg-amber-300 text-ink-950"
                : i % 3 === 0
                ? "bg-signal-cyan text-ink-950"
                : i % 3 === 1
                ? "bg-fuchsia-300 text-ink-950"
                : "bg-violet-300 text-ink-950"
            }`}
          >
            {user.name.slice(0, 2)}
          </span>
        ))}
      </span>
      <span className="font-mono text-white/60">{users.length}</span>
      {remaining > 0 && <span className="text-white/40">+{remaining}</span>}
      {role === "admin" && (
        <span className="ml-1 rounded border border-amber-300/30 bg-amber-300/10 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-amber-300">
          admin
        </span>
      )}
    </span>
  );
}

function JoinGate({
  roomId,
  joinName,
  setJoinName,
  joinEmail,
  setJoinEmail,
  notice,
  onSubmit
}: {
  roomId: string;
  joinName: string;
  setJoinName: (v: string) => void;
  joinEmail: string;
  setJoinEmail: (v: string) => void;
  notice: string;
  onSubmit: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-ink-950 p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl"
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          System Design · join room
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">Join the whiteboard</h1>
        <p className="mt-1 text-sm text-white/55">
          Room <span className="font-mono text-white/75">{roomId.slice(0, 8)}</span> — pick a display
          name so others can see who's drawing.
        </p>
        <div className="mt-5 grid gap-3">
          <input
            autoFocus
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            placeholder="Display name (required)"
            className="h-11 rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-300/60"
          />
          <input
            value={joinEmail}
            onChange={(e) => setJoinEmail(e.target.value)}
            placeholder="Email (optional)"
            type="email"
            className="h-11 rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-300/60"
          />
        </div>
        {notice && <p className="mt-3 text-[12.5px] font-medium text-signal-rose">{notice}</p>}
        <Button type="submit" className="mt-5 w-full" icon={<LogIn size={16} />}>Enter whiteboard</Button>
      </form>
    </div>
  );
}

function ClosedScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-ink-950 p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
        <h1 className="text-xl font-semibold text-white">Room closed</h1>
        <p className="mt-2 text-sm text-white/60">{message}</p>
        <a
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-white/15 px-4 text-sm font-semibold text-white/85 hover:bg-white/10"
          href="/system-design"
        >
          Back to System Design
        </a>
      </div>
    </div>
  );
}
