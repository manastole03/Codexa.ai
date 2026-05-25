"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Button } from "@codexa/ui";
import type { ProductKind } from "@codexa/types";
import { Copy, LogIn, Plus } from "lucide-react";

function createRoomId() {
  return crypto.randomUUID();
}

export function RoomLauncher({
  product,
  title = "Create or join a room"
}: {
  product: ProductKind;
  title?: string;
}) {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const productLabel = product === "arena" ? "Arena" : "Collaborative";

  function requireName() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Display name is required.");
      return null;
    }
    setError("");
    return trimmed;
  }

  function roomHref(id: string, displayName: string) {
    const params = new URLSearchParams({
      product,
      name: displayName
    });
    if (email.trim()) {
      params.set("email", email.trim().toLowerCase());
    }
    return `/rooms/${id}?${params.toString()}`;
  }

  function createRoom() {
    const displayName = requireName();
    if (!displayName) return;
    const id = createRoomId();
    setRoomId(id);
    router.push(roomHref(id, displayName) as Route);
  }

  function joinRoom() {
    const displayName = requireName();
    if (!displayName) return;
    if (!roomId.trim()) {
      setError("Room ID is required to join.");
      return;
    }
    router.push(roomHref(roomId.trim(), displayName) as Route);
  }

  async function copyRoom() {
    if (roomId) {
      await navigator.clipboard.writeText(roomId);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-glow">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-white/52">{productLabel} rooms are role-based: first join is admin, everyone else joins as user.</p>
      </div>
      <div className="grid gap-3">
        <input
          className="h-11 rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-signal-cyan"
          placeholder="Display name required"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (error) setError("");
          }}
          aria-invalid={Boolean(error && !name.trim())}
        />
        <input
          className="h-11 rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-signal-cyan"
          placeholder="Email optional"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className="h-11 rounded-md border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none transition placeholder:text-white/32 focus:border-signal-cyan"
            placeholder="Room ID"
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
          />
          <Button type="button" variant="secondary" icon={<Copy size={16} />} onClick={copyRoom} aria-label="Copy room ID" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" icon={<Plus size={16} />} onClick={createRoom}>Create Room</Button>
          <Button type="button" variant="secondary" icon={<LogIn size={16} />} onClick={joinRoom}>Join Room</Button>
        </div>
        {error && <p className="text-sm font-medium text-signal-rose">{error}</p>}
      </div>
    </div>
  );
}

export function CollaborativeLauncher() {
  return <RoomLauncher product="collaborative" />;
}
