"use client";

import clsx from "clsx";
import { useEffect, useMemo, useRef } from "react";

export type NoteDraft = {
  id?: string;
  dateIso: string;
  title: string;
  description: string;
};

export type NoteDialogPhase = "open" | "closing" | "closed";

export type NoteDialogProps = {
  phase: NoteDialogPhase;
  draft: NoteDraft;
  onChange: (next: NoteDraft) => void;
  onClose: () => void;
  onSave: (note: NoteDraft & { id: string }) => void;
  onDelete?: (id: string) => void;
};

function isCanonicalIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function generateId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }

  return `note_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
}

export default function NoteDialog({
  phase,
  draft,
  onChange,
  onClose,
  onSave,
  onDelete,
}: NoteDialogProps) {
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const isOpen = phase === "open";
  const isClosing = phase === "closing";

  const canSave = useMemo(() => {
    return isCanonicalIsoDate(draft.dateIso) && draft.title.trim().length > 0;
  }, [draft.dateIso, draft.title]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handle = window.setTimeout(() => titleInputRef.current?.focus(), 0);
    return () => window.clearTimeout(handle);
  }, [isOpen]);

  if (phase === "closed") return null;

  const isEditing = Boolean(draft.id);

  return (
    <div
      className={clsx(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm",
        isClosing ? "wc-modal-overlay-out" : "wc-modal-overlay-in",
      )}
      onMouseDown={(e) => {
        if (isClosing) return;
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? "Edit note" : "Add note"}
    >
      <div
        className={clsx(
          "w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_30px_80px_rgba(0,0,0,0.75)] backdrop-blur",
          isClosing ? "wc-modal-out" : "wc-modal-in",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-tight">
              {isEditing ? "Edit note" : "Add note"}
            </h3>
            <p className="mt-1 text-sm text-white/70">
              Add a title, description, and date.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white shadow-sm ring-1 ring-white/10 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]"
            onClick={onClose}
            disabled={isClosing}
          >
            Close
          </button>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-white">
            Date
            <input
              type="date"
              value={draft.dateIso}
              onChange={(e) => onChange({ ...draft, dateIso: e.target.value })}
              disabled={isClosing}
              className={clsx(
                "w-full rounded-2xl border bg-black/20 px-3 py-2 text-sm text-white shadow-sm outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-offset-[#05010A]",
                isCanonicalIsoDate(draft.dateIso)
                  ? "border-white/10 focus-visible:ring-[#00FFFF]"
                  : "border-[#FF1493]/30 focus-visible:ring-[#FF1493]",
              )}
              style={{ colorScheme: "dark" }}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-white">
            Title
            <input
              ref={titleInputRef}
              type="text"
              value={draft.title}
              onChange={(e) => onChange({ ...draft, title: e.target.value })}
              disabled={isClosing}
              placeholder="e.g., Hiking plan"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white shadow-sm outline-none ring-offset-2 placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-white">
            Description
            <textarea
              value={draft.description}
              onChange={(e) => onChange({ ...draft, description: e.target.value })}
              disabled={isClosing}
              placeholder="Details…"
              rows={4}
              className="w-full resize-y rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white shadow-sm outline-none ring-offset-2 placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            {isEditing && onDelete && draft.id ? (
              <button
                type="button"
                className="rounded-full bg-[#FF1493]/15 px-4 py-2 text-sm font-semibold text-[#FF1493] ring-1 ring-[#FF1493]/25 transition hover:bg-[#FF1493]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF1493] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]"
                onClick={() => onDelete(draft.id!)}
                disabled={isClosing}
              >
                Delete
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-white/10 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]"
              onClick={onClose}
              disabled={isClosing}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSave || isClosing}
              className="rounded-full bg-[linear-gradient(135deg,#FF1493_0%,#8338EC_55%,#00FFFF_100%)] px-4 py-2 text-sm font-semibold text-[#05010A] shadow-[0_0_18px_rgba(255,20,147,0.28),0_0_22px_rgba(0,255,255,0.2)] ring-1 ring-white/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]"
              onClick={() => {
                if (!canSave || isClosing) return;
                const id = draft.id ?? generateId();
                onSave({
                  ...draft,
                  id,
                  title: draft.title.trim(),
                });
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
