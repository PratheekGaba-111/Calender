"use client";

import clsx from "clsx";
import { addDays, format, parseISO, startOfMonth } from "date-fns";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import MonthYearPicker from "@/components/MonthYearPicker";
import NoteDialog, { type NoteDraft } from "@/components/NoteDialog";
import {
  getMonthGrid,
  getRangeVisualState,
  sortIsoPair,
  type DateRange,
  type IsoDate,
} from "@/lib/calendar";
import { getHeroForMonth } from "@/lib/heroImages";
import { useWallCalendarStorage } from "@/hooks/useWallCalendarStorage";
import type { CalendarNote } from "@/lib/storage";

export type WallCalendarProps = {
  heroSrc?: string;
  heroAlt?: string;
  initialMonth?: Date;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
};

function dayLabel(date: Date): string {
  return format(date, "MMMM d, yyyy");
}

function formatShort(iso: IsoDate): string {
  return format(parseISO(iso), "MMM d");
}

export default function WallCalendar({
  heroSrc,
  heroAlt,
  initialMonth,
  weekStartsOn = 0,
}: WallCalendarProps) {
  type MonthAnimDir = "prev" | "next" | "today";
  type MonthAnimState = {
    active: boolean;
    dir: MonthAnimDir;
    prevMonth?: Date;
    token: number;
  };

  const { data, setData, saveState } = useWallCalendarStorage(350);
  const [mode, setMode] = useState<"notes" | "range">("notes");
  const [viewMonth, setViewMonth] = useState<Date>(() =>
    startOfMonth(initialMonth ?? new Date()),
  );
  const [monthAnim, setMonthAnim] = useState<MonthAnimState>(() => ({
    active: false,
    dir: "next",
    prevMonth: undefined,
    token: 0,
  }));
  const [range, setRange] = useState<DateRange>({});
  const [hoverIso, setHoverIso] = useState<IsoDate | undefined>(undefined);
  const [activeDayIso, setActiveDayIso] = useState<IsoDate | undefined>(undefined);
  const [noteDraft, setNoteDraft] = useState<NoteDraft | null>(null);
  const [noteDialogPhase, setNoteDialogPhase] = useState<"open" | "closing" | "closed">("closed");
  const closeDialogTimeoutRef = useRef<number | null>(null);
  const monthAnimTimeoutRef = useRef<number | null>(null);
  const noteFxTimeoutRef = useRef<number | null>(null);
  const [noteFx, setNoteFx] = useState<{ id: string; token: number; action: "create" | "edit" } | null>(null);
  const [deletingNoteIds, setDeletingNoteIds] = useState<Record<string, true>>({});
  const [todayPulseToken, setTodayPulseToken] = useState(() => {
    const now = new Date();
    const initial = startOfMonth(initialMonth ?? now);
    return initial.getFullYear() === now.getFullYear() && initial.getMonth() === now.getMonth() ? 1 : 0;
  });

  const computedHero = useMemo(() => getHeroForMonth(viewMonth.getMonth()), [viewMonth]);
  const effectiveHeroSrc = heroSrc ?? computedHero.src;
  const effectiveHeroAlt = heroAlt ?? computedHero.alt;
  const prevHero = useMemo(() => {
    if (!monthAnim.prevMonth) return null;
    const hero = getHeroForMonth(monthAnim.prevMonth.getMonth());
    return {
      src: heroSrc ?? hero.src,
      alt: heroAlt ?? hero.alt,
    };
  }, [heroAlt, heroSrc, monthAnim.prevMonth]);

  const grid = useMemo(() => getMonthGrid(viewMonth, weekStartsOn), [viewMonth, weekStartsOn]);
  const prevGrid = useMemo(
    () => (monthAnim.prevMonth ? getMonthGrid(monthAnim.prevMonth, weekStartsOn) : null),
    [monthAnim.prevMonth, weekStartsOn],
  );
  const weekdayLabels = useMemo(() => {
    const baseSunday = new Date(2026, 0, 4);
    return Array.from({ length: 7 }, (_, idx) =>
      format(addDays(baseSunday, (idx + weekStartsOn) % 7), "EEE"),
    );
  }, [weekStartsOn]);

  const notesByDate = useMemo(() => {
    const map: Partial<Record<IsoDate, CalendarNote[]>> = {};
    for (const note of data.datedNotes) {
      const list = map[note.dateIso] ?? [];
      map[note.dateIso] = list.concat(note);
    }
    return map;
  }, [data.datedNotes]);

  const visibleNotes = useMemo(() => {
    const visibleIsos = new Set(grid.flat().map((cell) => cell.iso));
    const notes = data.datedNotes.filter((note) => visibleIsos.has(note.dateIso));
    notes.sort((a, b) =>
      a.dateIso === b.dateIso ? a.createdAt - b.createdAt : a.dateIso.localeCompare(b.dateIso),
    );
    return notes;
  }, [data.datedNotes, grid]);

  const selectionSummary = useMemo(() => {
    if (!range.startIso) return "Select a start date.";
    if (!range.endIso) return `Start: ${formatShort(range.startIso)}. Select an end date.`;

    const { min, max } = sortIsoPair(range.startIso, range.endIso);
    return `Selected ${formatShort(min)} – ${formatShort(max)}.`;
  }, [range.endIso, range.startIso]);

  const isViewingCurrentMonth = useMemo(() => {
    const now = new Date();
    return viewMonth.getFullYear() === now.getFullYear() && viewMonth.getMonth() === now.getMonth();
  }, [viewMonth]);

  useEffect(() => {
    return () => {
      if (closeDialogTimeoutRef.current) {
        window.clearTimeout(closeDialogTimeoutRef.current);
        closeDialogTimeoutRef.current = null;
      }
      if (monthAnimTimeoutRef.current) {
        window.clearTimeout(monthAnimTimeoutRef.current);
        monthAnimTimeoutRef.current = null;
      }
      if (noteFxTimeoutRef.current) {
        window.clearTimeout(noteFxTimeoutRef.current);
        noteFxTimeoutRef.current = null;
      }
    };
  }, []);

  function switchMode(nextMode: "notes" | "range") {
    setMode(nextMode);
    if (nextMode === "notes") {
      setRange({});
      setHoverIso(undefined);
    }
  }

  function monthInClass(dir: MonthAnimDir): string {
    if (dir === "prev") return "wc-month-in-prev";
    if (dir === "today") return "wc-month-in-today";
    return "wc-month-in-next";
  }

  function monthOutClass(dir: MonthAnimDir): string {
    if (dir === "prev") return "wc-month-out-prev";
    if (dir === "today") return "wc-month-out-today";
    return "wc-month-out-next";
  }

  function startMonthTransition(targetMonth: Date, dir: MonthAnimDir) {
    if (monthAnimTimeoutRef.current) {
      window.clearTimeout(monthAnimTimeoutRef.current);
      monthAnimTimeoutRef.current = null;
    }

    const nextMonth = startOfMonth(targetMonth);
    const now = new Date();
    if (nextMonth.getFullYear() === now.getFullYear() && nextMonth.getMonth() === now.getMonth()) {
      setTodayPulseToken((prev) => prev + 1);
    }
    setMonthAnim((prev) => ({
      active: true,
      dir,
      prevMonth: viewMonth,
      token: prev.token + 1,
    }));
    setViewMonth(nextMonth);
    setRange({});
    setHoverIso(undefined);
    setActiveDayIso(undefined);
    forceCloseNoteDialog();

    monthAnimTimeoutRef.current = window.setTimeout(() => {
      setMonthAnim((prev) => ({ ...prev, active: false, prevMonth: undefined }));
      monthAnimTimeoutRef.current = null;
    }, 700);
  }

  function jumpToMonthYear(year: number, monthIndex: number) {
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return;
    if (monthIndex < 0 || monthIndex > 11) return;

    const currentKey = viewMonth.getFullYear() * 12 + viewMonth.getMonth();
    const targetKey = year * 12 + monthIndex;
    const dir: MonthAnimDir =
      targetKey === currentKey ? "today" : targetKey > currentKey ? "next" : "prev";

    startMonthTransition(new Date(year, monthIndex, 1), dir);
  }

  function clearSelection() {
    setRange({});
    setHoverIso(undefined);
  }

  function openNoteDialog(draft: NoteDraft) {
    if (closeDialogTimeoutRef.current) {
      window.clearTimeout(closeDialogTimeoutRef.current);
      closeDialogTimeoutRef.current = null;
    }
    setNoteDraft(draft);
    setNoteDialogPhase("open");
  }

  function closeNoteDialog() {
    if (noteDialogPhase === "closed") return;
    if (closeDialogTimeoutRef.current) {
      window.clearTimeout(closeDialogTimeoutRef.current);
      closeDialogTimeoutRef.current = null;
    }

    setNoteDialogPhase("closing");
    closeDialogTimeoutRef.current = window.setTimeout(() => {
      setNoteDialogPhase("closed");
      setNoteDraft(null);
      closeDialogTimeoutRef.current = null;
    }, 200);
  }

  function forceCloseNoteDialog() {
    if (closeDialogTimeoutRef.current) {
      window.clearTimeout(closeDialogTimeoutRef.current);
      closeDialogTimeoutRef.current = null;
    }
    setNoteDialogPhase("closed");
    setNoteDraft(null);
  }

  function openCreateNote() {
    const defaultDateIso = activeDayIso ?? (format(startOfMonth(viewMonth), "yyyy-MM-dd") as IsoDate);
    openNoteDialog({
      dateIso: defaultDateIso,
      title: "",
      description: "",
    });
  }

  function openEditNote(note: CalendarNote) {
    openNoteDialog({
      id: note.id,
      dateIso: note.dateIso,
      title: note.title,
      description: note.description,
    });
  }

  function saveDatedNote(note: NoteDraft & { id: string }) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(note.dateIso)) return;

    const dateIso = note.dateIso as IsoDate;
    const now = Date.now();
    const action: "create" | "edit" = data.datedNotes.some((n) => n.id === note.id) ? "edit" : "create";

    setData((prev) => {
      const existing = prev.datedNotes.find((n) => n.id === note.id);
      const nextNote: CalendarNote = existing
        ? {
            ...existing,
            dateIso,
            title: note.title.trim(),
            description: note.description,
            updatedAt: now,
          }
        : {
            id: note.id,
            dateIso,
            title: note.title.trim(),
            description: note.description,
            createdAt: now,
          };

      const nextNotes = existing
        ? prev.datedNotes.map((n) => (n.id === note.id ? nextNote : n))
        : prev.datedNotes.concat(nextNote);

      return { ...prev, datedNotes: nextNotes };
    });

    setNoteFx((prev) => ({
      id: note.id,
      token: (prev?.token ?? 0) + 1,
      action,
    }));
    if (noteFxTimeoutRef.current) {
      window.clearTimeout(noteFxTimeoutRef.current);
      noteFxTimeoutRef.current = null;
    }
    noteFxTimeoutRef.current = window.setTimeout(() => {
      setNoteFx(null);
      noteFxTimeoutRef.current = null;
    }, 650);

    closeNoteDialog();
  }

  function deleteDatedNote(noteId: string) {
    if (deletingNoteIds[noteId]) return;
    setDeletingNoteIds((prev) => ({ ...prev, [noteId]: true }));
    closeNoteDialog();

    window.setTimeout(() => {
      setData((prev) => ({ ...prev, datedNotes: prev.datedNotes.filter((n) => n.id !== noteId) }));
      setDeletingNoteIds((prev) => {
        const next = { ...prev };
        delete next[noteId];
        return next;
      });
    }, 220);
  }

  function onDayClick(dayIso: IsoDate) {
    setActiveDayIso(dayIso);
    if (mode !== "range") return;
    setRange((prev) => {
      if (!prev.startIso) return { startIso: dayIso };
      if (prev.startIso && !prev.endIso) {
        const { min, max } = sortIsoPair(prev.startIso, dayIso);
        return { startIso: min, endIso: max };
      }
      return { startIso: dayIso };
    });
    setHoverIso(undefined);
  }

  return (
    <section className="w-full rounded-3xl border border-white/10 bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur lg:h-full lg:min-h-0">
      <div className="grid gap-4 p-4 sm:p-6 lg:p-4 lg:h-full lg:min-h-0 lg:grid-cols-12 lg:gap-4">
        <div className="lg:col-span-5 lg:h-full lg:min-h-0">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm lg:aspect-auto lg:h-full lg:min-h-0">
            <div className="absolute inset-0">
              {prevHero ? (
                <div
                  key={`hero-out-${monthAnim.token}`}
                  aria-hidden="true"
                  className={clsx(
                    "absolute inset-0 z-0 pointer-events-none",
                    monthOutClass(monthAnim.dir),
                  )}
                >
                  <Image
                    src={prevHero.src}
                    alt={prevHero.alt}
                    fill
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div
                key={`hero-in-${monthAnim.token}`}
                className={clsx(
                  "absolute inset-0 z-10",
                  monthAnim.active && monthInClass(monthAnim.dir),
                )}
              >
                <Image
                  src={effectiveHeroSrc}
                  alt={effectiveHeroAlt}
                  fill
                  priority
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div aria-hidden="true" className="absolute inset-0 wc-scanlines opacity-20" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#05010A]/80 via-[#05010A]/10 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-white/80">
                  Wall Calendar
                </p>
                <h2 className="truncate text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {format(viewMonth, "MMMM yyyy")}
                </h2>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-7 lg:h-full lg:min-h-0">
          <div className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-sm sm:p-5 lg:min-h-0 lg:flex-[3] lg:p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3 lg:mb-2">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">
                  {mode === "range" ? "Select a date range" : "Notes mode"}
                </h3>
                {mode === "range" ? (
                  <p className="text-sm text-white/70" aria-live="polite">
                    {selectionSummary}
                  </p>
                ) : (
                  <p className="text-sm text-white/70">
                    Range selection is off. Switch to{" "}
                    <span className="font-semibold text-white">Range</span> when you need it.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <MonthYearPicker value={viewMonth} onChange={jumpToMonthYear} />
                <div
                  role="group"
                  aria-label="Selection mode"
                  className="inline-flex rounded-full border border-white/10 bg-white/10 p-1 shadow-sm ring-1 ring-white/10"
                >
                  <button
                    type="button"
                    aria-pressed={mode === "notes"}
                    onClick={() => switchMode("notes")}
                    className={clsx(
                      "rounded-full px-3 py-1.5 text-sm font-semibold transition duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]",
                      mode === "notes"
                        ? "bg-[linear-gradient(135deg,#FF1493_0%,#8338EC_55%,#00FFFF_100%)] text-[#05010A] shadow-sm"
                        : "text-white/80 hover:bg-white/10",
                    )}
                  >
                    Notes
                  </button>
                  <button
                    type="button"
                    aria-pressed={mode === "range"}
                    onClick={() => switchMode("range")}
                    className={clsx(
                      "rounded-full px-3 py-1.5 text-sm font-semibold transition duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]",
                      mode === "range"
                        ? "bg-[linear-gradient(135deg,#FF1493_0%,#8338EC_55%,#00FFFF_100%)] text-[#05010A] shadow-sm"
                        : "text-white/80 hover:bg-white/10",
                    )}
                  >
                    Range
                  </button>
                </div>

                {mode === "range" ? (
                  <button
                    type="button"
                    className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium text-white shadow-sm transition duration-150 ease-out hover:bg-white/15 active:scale-[0.98] motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]"
                    onClick={clearSelection}
                    disabled={!range.startIso}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            <div className="relative mt-2 overflow-hidden lg:flex-1 lg:min-h-0">
              {prevGrid ? (
                <div
                  key={`grid-out-${monthAnim.token}`}
                  aria-hidden="true"
                  className={clsx(
                    "absolute inset-0 z-0 grid h-full grid-cols-7 gap-2 pointer-events-none lg:grid-rows-[auto_repeat(6,minmax(0,1fr))] lg:gap-1",
                    monthOutClass(monthAnim.dir),
                  )}
                >
                  {weekdayLabels.map((label) => (
                    <div
                      key={`prev-${label}`}
                      className="py-1 text-center text-xs font-medium tracking-wide text-white/60"
                    >
                      {label}
                    </div>
                  ))}

                  {prevGrid.flat().map((cell) => (
                    <div
                      key={cell.iso}
                      className={clsx(
                        "relative flex h-11 w-full select-none items-center justify-center rounded-2xl text-sm font-semibold tabular-nums leading-none lg:h-full lg:rounded-xl lg:text-xs",
                        cell.inCurrentMonth ? "text-white/70" : "text-white/30",
                      )}
                    >
                      <span>{format(cell.date, "d")}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div
                key={`grid-in-${monthAnim.token}`}
                className={clsx(
                  "relative z-10 grid h-full grid-cols-7 gap-2 lg:grid-rows-[auto_repeat(6,minmax(0,1fr))] lg:gap-1",
                  monthAnim.active && monthInClass(monthAnim.dir),
                )}
                onMouseLeave={() => setHoverIso(undefined)}
              >
                {weekdayLabels.map((label) => (
                  <div
                    key={label}
                    className="py-1 text-center text-xs font-medium tracking-wide text-white/60"
                    onMouseEnter={() => setHoverIso(undefined)}
                  >
                    {label}
                  </div>
                ))}

                {grid.flat().map((cell) => {
                  const visual =
                    mode === "range"
                      ? getRangeVisualState(cell.iso, range, hoverIso)
                      : { isStart: false, isEnd: false, isInRange: false, isPreview: false };
                  const isSelected = visual.isStart || visual.isEnd || visual.isInRange;
                  const noteCount = notesByDate[cell.iso]?.length ?? 0;
                  const ariaLabel =
                    noteCount > 0
                      ? `${dayLabel(cell.date)}, ${noteCount} ${noteCount === 1 ? "note" : "notes"}`
                      : dayLabel(cell.date);

                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      onClick={() => onDayClick(cell.iso)}
                      onMouseEnter={() => {
                        if (mode === "range" && range.startIso && !range.endIso) setHoverIso(cell.iso);
                      }}
                      aria-label={ariaLabel}
                      aria-pressed={mode === "range" ? isSelected : undefined}
                      aria-current={cell.isToday ? "date" : undefined}
                      data-range-start={visual.isStart ? "true" : undefined}
                      data-range-end={visual.isEnd ? "true" : undefined}
                      data-range-in={visual.isInRange ? "true" : undefined}
                      className={clsx(
                        "relative flex h-11 w-full select-none items-center justify-center rounded-2xl text-sm font-semibold tabular-nums leading-none transition duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none lg:h-full lg:rounded-xl lg:text-xs",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]",
                        cell.inCurrentMonth
                          ? "text-white/90 hover:bg-white/10"
                          : "text-white/40 hover:bg-white/5",
                        visual.isPreview &&
                          !range.endIso &&
                          "bg-[#00FFFF]/10 ring-1 ring-[#00FFFF]/30 shadow-[0_0_0_1px_rgba(0,255,255,0.15)]",
                        visual.isInRange && "bg-[#FF1493]/15 ring-1 ring-[#FF1493]/20",
                        (visual.isStart || visual.isEnd) &&
                          "bg-[linear-gradient(135deg,#FF1493_0%,#8338EC_55%,#00FFFF_100%)] text-[#05010A] shadow-sm ring-1 ring-white/10 hover:brightness-110",
                      )}
                    >
                      {cell.isToday ? (
                        <>
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-1 rounded-2xl ring-1 ring-[#00FFFF]/35 shadow-[0_0_0_1px_rgba(0,255,255,0.22),0_0_16px_rgba(0,255,255,0.18),0_0_18px_rgba(255,20,147,0.12)] lg:rounded-xl"
                          />
                          {isViewingCurrentMonth ? (
                            <span
                              key={`today-pulse-${todayPulseToken}`}
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-1 rounded-2xl wc-today-pulse lg:rounded-xl"
                            />
                          ) : null}
                        </>
                      ) : null}
                      <span className="relative z-10">{format(cell.date, "d")}</span>
                      {noteCount > 0 && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#FFD60A] shadow-[0_0_10px_rgba(255,214,10,0.6)]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-sm sm:p-5 lg:min-h-0 lg:flex-[2] lg:p-4 flex flex-col">
            <div className="mb-4 flex items-start justify-between gap-3 lg:mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Notes</h3>
                <p className="text-sm text-white/70">
                  Saved locally{" "}
                  <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/85 ring-1 ring-white/10">
                    {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Idle"}
                  </span>
                </p>
              </div>
              <button
                type="button"
                aria-label="Add note"
                className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-white/10 transition duration-150 ease-out hover:bg-white/15 active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]"
                onClick={openCreateNote}
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
              {visibleNotes.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                  Click <span className="font-semibold text-white">+</span> to add a note for a date.
                </div>
              ) : (
                <ul className="space-y-3">
                  {visibleNotes.map((note) => {
                    const isDeleting = deletingNoteIds[note.id] === true;
                    const fxToken = noteFx?.id === note.id ? noteFx.token : 0;
                    const shouldPop = noteFx?.id === note.id && !isDeleting;

                    return (
                      <li key={`${note.id}-${fxToken}`}>
                        <button
                          type="button"
                          onClick={() => openEditNote(note)}
                          aria-label={`${format(parseISO(note.dateIso), "MMM d, yyyy")}: ${note.title}`}
                          className={clsx(
                            "w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition duration-150 ease-out hover:bg-white/10 active:scale-[0.99] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]",
                            shouldPop && "wc-note-pop",
                            isDeleting && "pointer-events-none wc-note-delete",
                          )}
                        >
                          <p className="text-xs font-medium text-white/70">
                            {format(parseISO(note.dateIso), "MMM d, yyyy")}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">{note.title}</p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>

      <NoteDialog
        phase={noteDialogPhase}
        draft={noteDraft ?? { dateIso: "", title: "", description: "" }}
        onChange={(next) => setNoteDraft(next)}
        onClose={closeNoteDialog}
        onSave={saveDatedNote}
        onDelete={deleteDatedNote}
      />
    </section>
  );
}
