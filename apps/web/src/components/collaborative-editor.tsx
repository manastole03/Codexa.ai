"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { editor } from "monaco-editor";
import type { Socket } from "socket.io-client";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
import { MonacoBinding } from "y-monaco";
import { Button } from "@codexa/ui";
import type { CollabFileMeta, Language } from "@codexa/types";
import { FilePlus, X, Pencil, Loader2, Lock, Unlock } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.default), { ssr: false });

const languageToMonaco: Record<Language, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  cpp: "cpp",
  java: "java",
  go: "go",
  rust: "rust",
  csharp: "csharp",
  ruby: "ruby",
  php: "php",
  swift: "swift",
  kotlin: "kotlin",
  dart: "dart"
};

const extensionToLanguage: Record<string, Language> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  cpp: "cpp",
  cc: "cpp",
  h: "cpp",
  hpp: "cpp",
  java: "java",
  go: "go",
  rs: "rust",
  cs: "csharp",
  rb: "ruby",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  dart: "dart"
};

function languageFromName(name: string): Language {
  const idx = name.lastIndexOf(".");
  if (idx === -1) return "javascript";
  const ext = name.slice(idx + 1).toLowerCase();
  return extensionToLanguage[ext] ?? "javascript";
}

function colorFromString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 78%, 60%)`;
}

function readFileMetas(doc: Y.Doc): CollabFileMeta[] {
  const tabs = doc.getArray<string>("tabs").toArray();
  const meta = doc.getMap("fileMeta");
  const result: CollabFileMeta[] = [];
  tabs.forEach((fileId, order) => {
    const raw = meta.get(fileId) as
      | { name?: string; language?: Language; lockedBy?: string }
      | undefined;
    if (!raw) return;
    const item: CollabFileMeta = {
      id: fileId,
      name: raw.name ?? "untitled",
      language: (raw.language ?? "javascript") as Language,
      order
    };
    if (raw.lockedBy) item.lockedBy = raw.lockedBy;
    result.push(item);
  });
  return result;
}

type Props = {
  socket: Socket;
  roomId: string;
  displayName: string;
  joined: boolean;
  onActiveFileChange?: (file: { id: string; name: string } | null) => void;
};

export function CollaborativeEditor({ socket, roomId, displayName, joined, onActiveFileChange }: Props) {
  const docRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const modelsRef = useRef<Map<string, editor.ITextModel>>(new Map());

  const [files, setFiles] = useState<CollabFileMeta[]>([]);
  const [activeFileId, setActiveFileId] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [addValue, setAddValue] = useState("");

  const userColor = useMemo(() => colorFromString(displayName || socket.id || "anon"), [displayName, socket.id]);

  // Initialize doc + awareness once (and reset if room changes)
  useEffect(() => {
    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    docRef.current = doc;
    awarenessRef.current = awareness;

    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
      const ids = Array.from(awareness.getStates().keys());
      removeAwarenessStates(awareness, ids, "local");
      awareness.destroy();
      modelsRef.current.forEach((model) => model.dispose());
      modelsRef.current.clear();
      doc.destroy();
      docRef.current = null;
      awarenessRef.current = null;
    };
  }, [roomId]);

  // Wire socket transport once the user has joined the room
  useEffect(() => {
    if (!joined) return;
    const doc = docRef.current;
    const awareness = awarenessRef.current;
    if (!doc || !awareness) return;

    const onDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return;
      socket.emit("yjs:sync:update", { roomId, update });
    };
    doc.on("update", onDocUpdate);

    const onAwarenessUpdate = (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown
    ) => {
      if (origin === "remote") return;
      const changed = added.concat(updated, removed);
      if (changed.length === 0) return;
      socket.emit("yjs:awareness:update", {
        roomId,
        update: encodeAwarenessUpdate(awareness, changed)
      });
    };
    awareness.on("update", onAwarenessUpdate);

    const onSyncInit = ({ update, files: serverFiles }: { update: ArrayBuffer | Uint8Array; files: CollabFileMeta[] }) => {
      const bytes = update instanceof Uint8Array ? update : new Uint8Array(update);
      Y.applyUpdate(doc, bytes, "remote");
      setFiles(serverFiles);
      setHydrated(true);
      if (serverFiles.length > 0) {
        setActiveFileId((current) => current || serverFiles[0]!.id);
      }
      // Publish initial presence
      awareness.setLocalState({
        user: { name: displayName, color: userColor }
      });
    };

    const onSyncUpdate = ({ update }: { update: ArrayBuffer | Uint8Array }) => {
      const bytes = update instanceof Uint8Array ? update : new Uint8Array(update);
      Y.applyUpdate(doc, bytes, "remote");
    };

    const onAwarenessUpdateRemote = ({ update }: { update: ArrayBuffer | Uint8Array }) => {
      const bytes = update instanceof Uint8Array ? update : new Uint8Array(update);
      applyAwarenessUpdate(awareness, bytes, "remote");
    };

    const onFileList = ({ files: nextFiles }: { files: CollabFileMeta[] }) => {
      setFiles(nextFiles);
      setActiveFileId((current) => {
        if (current && nextFiles.some((f) => f.id === current)) return current;
        return nextFiles[0]?.id ?? "";
      });
    };

    socket.on("yjs:sync:init", onSyncInit);
    socket.on("yjs:sync:update", onSyncUpdate);
    socket.on("yjs:awareness:update", onAwarenessUpdateRemote);
    socket.on("file:list", onFileList);

    return () => {
      doc.off("update", onDocUpdate);
      awareness.off("update", onAwarenessUpdate);
      socket.off("yjs:sync:init", onSyncInit);
      socket.off("yjs:sync:update", onSyncUpdate);
      socket.off("yjs:awareness:update", onAwarenessUpdateRemote);
      socket.off("file:list", onFileList);
    };
  }, [joined, roomId, socket, displayName, userColor]);

  // Observe tabs/fileMeta inside the Y.Doc so React stays in sync
  useEffect(() => {
    const doc = docRef.current;
    if (!doc) return;
    const tabs = doc.getArray<string>("tabs");
    const meta = doc.getMap("fileMeta");
    const sync = () => {
      const next = readFileMetas(doc);
      setFiles(next);
      setActiveFileId((current) => {
        if (current && next.some((f) => f.id === current)) return current;
        return next[0]?.id ?? "";
      });
    };
    tabs.observe(sync);
    meta.observeDeep(sync);
    return () => {
      tabs.unobserve(sync);
      meta.unobserveDeep(sync);
    };
  }, [hydrated]);

  const activeFile = useMemo(() => files.find((f) => f.id === activeFileId), [files, activeFileId]);
  const lockedByOther = Boolean(activeFile?.lockedBy && activeFile.lockedBy !== displayName);
  const lockedByMe = Boolean(activeFile?.lockedBy && activeFile.lockedBy === displayName);

  useEffect(() => {
    if (!onActiveFileChange) return;
    onActiveFileChange(activeFile ? { id: activeFile.id, name: activeFile.name } : null);
  }, [activeFile, onActiveFileChange]);

  const handleEditorMount = useCallback(
    (instance: editor.IStandaloneCodeEditor, monaco: typeof import("monaco-editor")) => {
      editorRef.current = instance;
      monacoRef.current = monaco;
    },
    []
  );

  // Reflect read-only state on the active editor when a foreign user holds the lock
  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly: lockedByOther });
  }, [lockedByOther, activeFileId]);

  // Bind active file: swap Monaco model + MonacoBinding when activeFileId changes
  useEffect(() => {
    const editorInstance = editorRef.current;
    const monaco = monacoRef.current;
    const doc = docRef.current;
    const awareness = awarenessRef.current;
    if (!editorInstance || !monaco || !doc || !awareness || !activeFile) return;

    let model = modelsRef.current.get(activeFile.id);
    if (!model) {
      const initial = doc.getText(`file:${activeFile.id}`).toString();
      model = monaco.editor.createModel(initial, languageToMonaco[activeFile.language], monaco.Uri.parse(`inmemory://room/${roomId}/${activeFile.id}/${activeFile.name}`));
      modelsRef.current.set(activeFile.id, model);
    } else {
      monaco.editor.setModelLanguage(model, languageToMonaco[activeFile.language]);
    }
    editorInstance.setModel(model);

    bindingRef.current?.destroy();
    bindingRef.current = new MonacoBinding(
      doc.getText(`file:${activeFile.id}`),
      model,
      new Set([editorInstance]),
      awareness
    );

    // Reflect active file in presence
    const local = awareness.getLocalState() ?? {};
    awareness.setLocalState({ ...local, fileId: activeFile.id });

    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [activeFile, roomId]);

  // Track remote users (with clientID) for both the live-presence chip row
  // and the dynamic style tag that colors the Monaco selection/cursor decorations.
  const [remoteUsers, setRemoteUsers] = useState<Array<{ clientId: number; name: string; color: string; fileId?: string }>>([]);
  useEffect(() => {
    const awareness = awarenessRef.current;
    if (!awareness) return;
    const refresh = () => {
      const others: Array<{ clientId: number; name: string; color: string; fileId?: string }> = [];
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return;
        const user = (state as { user?: { name?: string; color?: string }; fileId?: string }).user;
        if (!user?.name) return;
        others.push({ clientId, name: user.name, color: user.color ?? "#888", fileId: (state as { fileId?: string }).fileId });
      });
      setRemoteUsers(others);
    };
    awareness.on("change", refresh);
    refresh();
    return () => awareness.off("change", refresh);
  }, [hydrated]);

  // Inject CSS so y-monaco's per-clientID decorations show each user's color and name.
  const remoteCursorCss = useMemo(() => {
    return remoteUsers
      .map((user) => {
        const safe = user.name.replace(/"/g, "");
        return `
.yRemoteSelection-${user.clientId} { background-color: ${user.color}40; }
.yRemoteSelectionHead-${user.clientId} { border-left: 2px solid ${user.color}; position: relative; }
.yRemoteSelectionHead-${user.clientId}::after {
  content: "${safe}";
  position: absolute;
  top: -1.25em;
  left: -2px;
  white-space: nowrap;
  background: ${user.color};
  color: #0b0d13;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 3px;
  pointer-events: none;
}`;
      })
      .join("\n");
  }, [remoteUsers]);

  function submitAdd() {
    const value = addValue.trim();
    if (!value) {
      setAdding(false);
      return;
    }
    socket.emit("file:create", { roomId, name: value, language: languageFromName(value) });
    setAddValue("");
    setAdding(false);
  }

  function closeFile(fileId: string) {
    socket.emit("file:close", { roomId, fileId });
    const model = modelsRef.current.get(fileId);
    model?.dispose();
    modelsRef.current.delete(fileId);
  }

  function submitRename(fileId: string) {
    const value = renameValue.trim();
    if (!value) {
      setRenamingId(null);
      return;
    }
    socket.emit("file:rename", { roomId, fileId, name: value });
    setRenamingId(null);
    setRenameValue("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {remoteCursorCss && <style dangerouslySetInnerHTML={{ __html: remoteCursorCss }} />}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 bg-ink-950 px-2 py-1">
        {files.map((file) => {
          const isActive = file.id === activeFileId;
          const isRenaming = renamingId === file.id;
          const usersHere = remoteUsers.filter((u) => u.fileId === file.id);
          return (
            <div
              key={file.id}
              className={`group flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition ${
                isActive
                  ? "border-signal-cyan/40 bg-white/[0.08] text-white"
                  : "border-transparent text-white/56 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {isRenaming ? (
                <input
                  autoFocus
                  className="h-6 w-32 rounded bg-ink-950 px-1 text-xs text-white outline-none"
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  onBlur={() => submitRename(file.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitRename(file.id);
                    if (event.key === "Escape") setRenamingId(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveFileId(file.id)}
                  onDoubleClick={() => {
                    setRenamingId(file.id);
                    setRenameValue(file.name);
                  }}
                  className="font-mono"
                  title="Double-click to rename"
                >
                  {file.name}
                </button>
              )}
              {file.lockedBy && (
                <span
                  className="inline-flex items-center gap-0.5 rounded bg-signal-rose/15 px-1 py-0.5 text-[10px] font-semibold text-signal-rose"
                  title={`Locked by ${file.lockedBy}`}
                >
                  <Lock size={9} />
                  {file.lockedBy === displayName ? "you" : file.lockedBy}
                </span>
              )}
              {usersHere.length > 0 && (
                <div className="flex -space-x-1">
                  {usersHere.slice(0, 3).map((user, idx) => (
                    <span
                      key={`${file.id}-${idx}`}
                      className="size-2 rounded-full ring-1 ring-ink-950"
                      style={{ background: user.color }}
                      title={user.name}
                    />
                  ))}
                </div>
              )}
              <button
                type="button"
                className="ml-1 flex size-4 items-center justify-center rounded text-white/40 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-white"
                onClick={() => closeFile(file.id)}
                aria-label={`Close ${file.name}`}
              >
                <X size={11} />
              </button>
            </div>
          );
        })}

        {adding ? (
          <input
            autoFocus
            className="h-7 w-36 rounded-md border border-white/15 bg-ink-950 px-2 text-xs text-white outline-none"
            placeholder="filename.ext"
            value={addValue}
            onChange={(event) => setAddValue(event.target.value)}
            onBlur={submitAdd}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitAdd();
              if (event.key === "Escape") {
                setAdding(false);
                setAddValue("");
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="ml-1 flex h-7 items-center gap-1 rounded-md border border-white/10 px-2 text-xs text-white/56 transition hover:border-signal-cyan/40 hover:text-white"
            onClick={() => setAdding(true)}
          >
            <FilePlus size={12} />
            New file
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {activeFile && !activeFile.lockedBy && (
            <button
              type="button"
              className="flex h-7 items-center gap-1 rounded-md border border-white/10 px-2 text-xs text-white/56 transition hover:border-signal-cyan/40 hover:text-white"
              onClick={() => socket.emit("file:lock", { roomId, fileId: activeFile.id })}
              title="Lock so only you can edit"
            >
              <Lock size={12} />
              Lock
            </button>
          )}
          {lockedByMe && (
            <button
              type="button"
              className="flex h-7 items-center gap-1 rounded-md border border-signal-cyan/30 bg-signal-cyan/10 px-2 text-xs font-semibold text-signal-cyan transition hover:bg-signal-cyan/20"
              onClick={() => socket.emit("file:unlock", { roomId, fileId: activeFile!.id })}
            >
              <Unlock size={12} />
              Unlock
            </button>
          )}
          {lockedByOther && (
            <span className="flex h-7 items-center gap-1 rounded-md border border-signal-rose/30 bg-signal-rose/10 px-2 text-xs font-semibold text-signal-rose">
              <Lock size={12} />
              Locked by {activeFile!.lockedBy}
            </span>
          )}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-[#0b0d13]">
        {!hydrated && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink-950/60 text-sm text-white/60">
            <Loader2 className="mr-2 animate-spin" size={16} /> Loading workspace…
          </div>
        )}
        <MonacoEditor
          height="100%"
          theme="vs-dark"
          defaultLanguage="javascript"
          onMount={handleEditorMount}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            automaticLayout: true,
            tabSize: 2
          }}
        />
      </div>

      {remoteUsers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-ink-950/70 px-3 py-1.5 text-xs text-white/60">
          <span className="text-white/40">Live:</span>
          {remoteUsers.map((user, idx) => (
            <span
              key={`${user.name}-${idx}`}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5"
            >
              <span className="size-1.5 rounded-full" style={{ background: user.color }} />
              {user.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Suppress unused import warning while keeping option for rename UI
void Pencil;
