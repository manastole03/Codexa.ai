"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import type { ComponentType } from "react";
import type { Socket } from "socket.io-client";

type ExcalidrawComponentProps = Record<string, unknown>;

const Excalidraw = dynamic<ExcalidrawComponentProps>(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return mod.Excalidraw as ComponentType<ExcalidrawComponentProps>;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-sm text-white/52">
        Loading whiteboard...
      </div>
    )
  }
);

type ExcalidrawBoardProps = {
  roomId: string;
  socket: Socket;
  title?: string;
};

type ScenePayload = {
  elements: readonly unknown[];
  files?: Record<string, unknown>;
};

export function ExcalidrawBoard({ roomId, socket, title }: ExcalidrawBoardProps) {
  const apiRef = useRef<any>(null);
  const applyingRemoteRef = useRef(false);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (scene: ScenePayload) => {
      if (!apiRef.current || !Array.isArray(scene.elements)) return;
      applyingRemoteRef.current = true;
      apiRef.current.updateScene({
        elements: scene.elements,
        files: scene.files
      });
      window.setTimeout(() => {
        applyingRemoteRef.current = false;
      }, 80);
    };

    socket.on("excalidraw:update", handler);
    return () => {
      socket.off("excalidraw:update", handler);
      if (sendTimerRef.current) {
        clearTimeout(sendTimerRef.current);
      }
    };
  }, [socket]);

  function broadcastScene(elements: readonly unknown[], files?: Record<string, unknown>) {
    if (applyingRemoteRef.current) return;
    if (sendTimerRef.current) {
      clearTimeout(sendTimerRef.current);
    }
    sendTimerRef.current = setTimeout(() => {
      socket.emit("excalidraw:update", { roomId, elements, files });
    }, 160);
  }

  return (
    <div className="h-[calc(100vh-170px)] min-h-[520px] overflow-hidden rounded-lg border border-white/10 bg-white">
      <Excalidraw
        theme="dark"
        name={title ? `${title} plan` : "Codexa Arena board"}
        excalidrawAPI={(api: unknown) => {
          apiRef.current = api;
        }}
        onChange={(elements: readonly unknown[], _appState: unknown, files?: Record<string, unknown>) => {
          broadcastScene(elements, files);
        }}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false
          }
        }}
      />
    </div>
  );
}
