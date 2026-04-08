"use client";

import clsx from "clsx";
import { addDays, addMonths, format, parseISO, startOfMonth } from "date-fns";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const closeDialogTimeoutRef = useRef<number | null>(null);
  const monthAnimTimeoutRef = useRef<number | null>(null);
  const navFxTimeoutRef = useRef<number | null>(null);
  const [navFx, setNavFx] = useState<{ key: MonthAnimDir; token: number } | null>(null);
  const todayPulseTimeoutRef = useRef<number | null>(null);
  const [todayPulse, setTodayPulse] = useState<{ active: boolean; token: number }>({
    active: false,
    token: 0,
  });
  const noteFxTimeoutRef = useRef<number | null>(null);
  const [noteFx, setNoteFx] = useState<{ id: string; token: number; action: "create" | "edit" } | null>(null);
  const [deletingNoteIds, setDeletingNoteIds] = useState<Record<string, true>>({});

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

  useEffect(() => {
    if (mode === "range") return;
    setRange({});
    setHoverIso(undefined);
  }, [mode]);

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
      if (navFxTimeoutRef.current) {
        window.clearTimeout(navFxTimeoutRef.current);
        navFxTimeoutRef.current = null;
      }
      if (todayPulseTimeoutRef.current) {
        window.clearTimeout(todayPulseTimeoutRef.current);
        todayPulseTimeoutRef.current = null;
      }
      if (noteFxTimeoutRef.current) {
        window.clearTimeout(noteFxTimeoutRef.current);
        noteFxTimeoutRef.current = null;
      }
    };
  }, []);

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

  function triggerNavFx(key: MonthAnimDir) {
    setNavFx((prev) => ({ key, token: (prev?.token ?? 0) + 1 }));
    if (navFxTimeoutRef.current) {
      window.clearTimeout(navFxTimeoutRef.current);
    }
    navFxTimeoutRef.current = window.setTimeout(() => {
      setNavFx(null);
      navFxTimeoutRef.current = null;
    }, 320);
  }

  function triggerTodayPulse() {
    setTodayPulse((prev) => ({ active: true, token: prev.token + 1 }));
    if (todayPulseTimeoutRef.current) {
      window.clearTimeout(todayPulseTimeoutRef.current);
    }
    todayPulseTimeoutRef.current = window.setTimeout(() => {
      setTodayPulse((prev) => ({ ...prev, active: false }));
      todayPulseTimeoutRef.current = null;
    }, 700);
  }

  function startMonthTransition(targetMonth: Date, dir: MonthAnimDir) {
    if (monthAnimTimeoutRef.current) {
      window.clearTimeout(monthAnimTimeoutRef.current);
      monthAnimTimeoutRef.current = null;
    }

    const nextMonth = startOfMonth(targetMonth);
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

    monthAnimTimeoutRef.current = window.setTimeout(() => {
      setMonthAnim((prev) => ({ ...prev, active: false, prevMonth: undefined }));
      monthAnimTimeoutRef.current = null;
    }, 520);
  }

  function goToToday() {
    triggerNavFx("today");
    triggerTodayPulse();
    startMonthTransition(new Date(), "today");
  }

  function clearSelection() {
    setRange({});
    setHoverIso(undefined);
  }

  function openCreateNote() {
    const defaultDateIso = activeDayIso ?? (format(startOfMonth(viewMonth), "yyyy-MM-dd") as IsoDate);
    setNoteDraft({
      dateIso: defaultDateIso,
      title: "",
      description: "",
    });
  }

  function openEditNote(note: CalendarNote) {
    setNoteDraft({
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

    setNoteDraft(null);
  }

  function deleteDatedNote(noteId: string) {
    setData((prev) => ({ ...prev, datedNotes: prev.datedNotes.filter((n) => n.id !== noteId) }));
    setNoteDraft(null);
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
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className={clsx(
                    "rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white shadow-sm ring-1 ring-white/10 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]",
                    navFx?.key === "prev" && "wc-glitch-jitter",
                  )}
                  onClick={() => {
                    triggerNavFx("prev");
                    startMonthTransition(addMonths(viewMonth, -1), "prev");
                  }}
                  aria-label="Previous month"
                >
                  Prev
                </button>
                <button
                  type="button"
                  className={clsx(
                    "rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white shadow-sm ring-1 ring-white/10 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]",
                    navFx?.key === "today" && "wc-glitch-jitter",
                  )}
                  onClick={goToToday}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={clsx(
                    "rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white shadow-sm ring-1 ring-white/10 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]",
                    navFx?.key === "next" && "wc-glitch-jitter",
                  )}
                  onClick={() => {
                    triggerNavFx("next");
                    startMonthTransition(addMonths(viewMonth, 1), "next");
                  }}
                  aria-label="Next month"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-7 lg:h-full lg:min-h-0">
          <div className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 shadow-sm sm:p-5 lg:min-h-0 lg:flex-[3] lg:p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3 lg:mb-2">
              <div>
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
              <div className="flex items-center gap-2">
                <div
                  role="group"
                  aria-label="Selection mode"
                  className="inline-flex rounded-full border border-white/10 bg-white/10 p-1 shadow-sm ring-1 ring-white/10"
                >
                  <button
                    type="button"
                    aria-pressed={mode === "notes"}
                    onClick={() => setMode("notes")}
                    className={clsx(
                      "rounded-full px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]",
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
                    onClick={() => setMode("range")}
                    className={clsx(
                      "rounded-full px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]",
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
                    className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]"
                    onClick={clearSelection}
                    disabled={!range.startIso}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            <div
              className="mt-2 grid grid-cols-7 gap-2 lg:flex-1 lg:min-h-0 lg:grid-rows-[auto_repeat(6,minmax(0,1fr))] lg:gap-1"
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
                      "relative flex h-11 w-full select-none items-center justify-center rounded-2xl text-sm font-semibold tabular-nums leading-none transition lg:h-full lg:rounded-xl lg:text-xs",
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
                    <span className="relative z-10">{format(cell.date, "d")}</span>
                    {noteCount > 0 && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#FFD60A] shadow-[0_0_10px_rgba(255,214,10,0.6)]"
                      />
                    )}
                    {cell.isToday && (
                      <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-current opacity-70" />
                    )}
                  </button>
                );
              })}
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
                className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-white/10 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]"
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
                  {visibleNotes.map((note) => (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => openEditNote(note)}
                        className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]"
                      >
                        <p className="text-xs font-medium text-white/70">
                          {format(parseISO(note.dateIso), "MMM d, yyyy")}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {note.title}
                        </p>
                        {note.description.trim().length > 0 ? (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-white/70">
                            {note.description}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>

      <NoteDialog
        open={noteDraft !== null}
        draft={noteDraft ?? { dateIso: "", title: "", description: "" }}
        onChange={setNoteDraft}
        onClose={() => setNoteDraft(null)}
        onSave={saveDatedNote}
        onDelete={deleteDatedNote}
      />
    </section>
  );
}
