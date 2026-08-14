"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FilePlus, FileCode2, FileJson, FileText, FileType2, Lock, MoreHorizontal, Trash2 } from "lucide-react";
import type { CollabFileMeta } from "@codexa/types";

type Props = {
  files: CollabFileMeta[];
  activeFileId?: string;
  displayName: string;
  onOpen: (fileId: string) => void;
  onCreate: (name: string) => void;
  onRename: (fileId: string, name: string) => void;
  onClose: (fileId: string) => void;
};

function iconForName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["json"].includes(ext)) return FileJson;
  if (["md", "txt", "rst"].includes(ext)) return FileText;
  if (["ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "cpp", "c", "h", "rb", "php", "swift", "kt", "dart", "cs"].includes(ext)) return FileCode2;
  return FileType2;
}

export function FileExplorer({ files, activeFileId, displayName, onOpen, onCreate, onRename, onClose }: Props) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addValue, setAddValue] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function submitAdd() {
    const value = addValue.trim();
    if (!value) {
      setAdding(false);
      setAddValue("");
      return;
    }
    onCreate(value);
    setAdding(false);
    setAddValue("");
  }

  function submitRename(fileId: string) {
    const value = renameValue.trim();
    if (!value) {
      setRenamingId(null);
      return;
    }
    onRename(fileId, value);
    setRenamingId(null);
    setRenameValue("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 items-center justify-between border-b border-white/10 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/64">
        Explorer
        <button
          type="button"
          className="flex size-5 items-center justify-center rounded text-white/40 transition hover:bg-white/10 hover:text-white"
          aria-label="More actions"
          title="More actions"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex h-7 items-center justify-between gap-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-white/64">
          <button
            type="button"
            className="flex h-7 flex-1 items-center gap-1 rounded px-1 transition hover:bg-white/5"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Codexa Room
          </button>
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded text-white/40 transition hover:bg-white/10 hover:text-white"
            onClick={() => {
              setOpen(true);
              setAdding(true);
            }}
            aria-label="New file"
            title="New file"
          >
            <FilePlus size={13} />
          </button>
        </div>

        {open && (
          <div className="pb-3 pl-2 pr-1">
            {adding && (
              <div className="my-1 flex h-7 items-center gap-1.5 rounded pl-4 pr-1">
                <FileCode2 size={13} className="text-white/40" />
                <input
                  autoFocus
                  className="h-6 flex-1 rounded bg-ink-950 px-1 text-xs text-white outline-none ring-1 ring-signal-cyan/50"
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
              </div>
            )}

            {files.length === 0 && !adding && (
              <div className="px-4 py-3 text-xs text-white/40">No files yet.</div>
            )}

            {files.map((file) => {
              const Icon = iconForName(file.name);
              const isActive = file.id === activeFileId;
              const isRenaming = renamingId === file.id;
              const lockedByOther = Boolean(file.lockedBy && file.lockedBy !== displayName);
              return (
                <div
                  key={file.id}
                  className={`group my-px flex h-7 items-center gap-1.5 rounded pl-4 pr-1 text-xs transition ${
                    isActive ? "bg-signal-cyan/15 text-white" : "text-white/72 hover:bg-white/[0.06]"
                  }`}
                >
                  <Icon size={13} className={isActive ? "text-signal-cyan" : "text-white/50"} />
                  {isRenaming ? (
                    <input
                      autoFocus
                      className="h-6 flex-1 rounded bg-ink-950 px-1 text-xs text-white outline-none ring-1 ring-signal-cyan/50"
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
                      onClick={() => onOpen(file.id)}
                      onDoubleClick={() => {
                        setRenamingId(file.id);
                        setRenameValue(file.name);
                      }}
                      className="flex-1 truncate text-left"
                      title="Click to open, double-click to rename"
                    >
                      {file.name}
                    </button>
                  )}
                  {file.lockedBy && (
                    <span
                      className={`inline-flex items-center gap-0.5 rounded px-1 text-[10px] ${
                        lockedByOther ? "bg-signal-rose/15 text-signal-rose" : "bg-signal-cyan/15 text-signal-cyan"
                      }`}
                      title={`Locked by ${file.lockedBy}`}
                    >
                      <Lock size={9} />
                    </span>
                  )}
                  <button
                    type="button"
                    className="flex size-5 items-center justify-center rounded text-white/40 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-white"
                    onClick={(event) => {
                      event.stopPropagation();
                      onClose(file.id);
                    }}
                    aria-label={`Delete ${file.name}`}
                    title={`Delete ${file.name}`}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
