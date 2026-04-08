"use client";

import clsx from "clsx";
import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type MonthYearPickerProps = {
  value: Date;
  onChange: (year: number, monthIndex: number) => void;
};

type PickerPhase = "open" | "closing" | "closed";

const POPOVER_WIDTH = 340;
const VIEWPORT_PADDING = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatMonthYearLabel(date: Date): string {
  return format(date, "MMM yyyy");
}

function formatMonthAriaLabel(year: number, monthIndex: number): string {
  return format(new Date(year, monthIndex, 1), "MMMM yyyy");
}

export default function MonthYearPicker({ value, onChange }: MonthYearPickerProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const selectedMonthDesktopRef = useRef<HTMLButtonElement | null>(null);
  const selectedMonthMobileRef = useRef<HTMLButtonElement | null>(null);
  const firstMonthDesktopRef = useRef<HTMLButtonElement | null>(null);
  const firstMonthMobileRef = useRef<HTMLButtonElement | null>(null);

  const [phase, setPhase] = useState<PickerPhase>("closed");
  const [displayYear, setDisplayYear] = useState<number>(() => value.getFullYear());
  const [isDesktopLayout, setIsDesktopLayout] = useState(true);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const phaseRef = useRef<PickerPhase>("closed");

  const isOpen = phase === "open";
  const isClosing = phase === "closing";
  const selectedYear = value.getFullYear();
  const selectedMonthIndex = value.getMonth();
  const triggerLabel = useMemo(() => formatMonthYearLabel(value), [value]);

  const clearCloseTimeout = useCallback(() => {
    if (!closeTimeoutRef.current) return;
    window.clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = null;
  }, []);

  const computePopoverPosition = useCallback((): { top: number; left: number } | null => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return null;

    const rect = trigger.getBoundingClientRect();
    const top = rect.bottom + 8;
    const maxLeft = window.innerWidth - POPOVER_WIDTH - VIEWPORT_PADDING;
    const left = clamp(
      rect.right - POPOVER_WIDTH,
      VIEWPORT_PADDING,
      Math.max(VIEWPORT_PADDING, maxLeft),
    );
    return { top, left };
  }, []);

  const close = useCallback(() => {
    if (phaseRef.current === "closed") return;
    clearCloseTimeout();
    setPhase("closing");
    closeTimeoutRef.current = window.setTimeout(() => {
      setPhase("closed");
      closeTimeoutRef.current = null;
      triggerRef.current?.focus();
    }, 180);
  }, [clearCloseTimeout]);

  const open = useCallback(() => {
    clearCloseTimeout();
    setDisplayYear(selectedYear);
    setPopoverPosition(computePopoverPosition());
    setPhase("open");
  }, [clearCloseTimeout, computePopoverPosition, selectedYear]);

  const toggle = useCallback(() => {
    if (phaseRef.current === "open") close();
    else open();
  }, [close, open]);

  useEffect(() => {
    return () => clearCloseTimeout();
  }, [clearCloseTimeout]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktopLayout(mediaQuery.matches);
    update();

    const onChangeMedia = (event: MediaQueryListEvent) => setIsDesktopLayout(event.matches);
    mediaQuery.addEventListener("change", onChangeMedia);
    return () => mediaQuery.removeEventListener("change", onChangeMedia);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => setPopoverPosition(computePopoverPosition());
    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [computePopoverPosition, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handle = window.setTimeout(() => {
      const focusTarget = isDesktopLayout
        ? selectedMonthDesktopRef.current ?? firstMonthDesktopRef.current
        : selectedMonthMobileRef.current ?? firstMonthMobileRef.current;
      focusTarget?.focus();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [displayYear, isDesktopLayout, isOpen, selectedMonthIndex, selectedYear]);

  const dialogId = "wc-month-year-dialog";

  const panelContent = (variant: "desktop" | "mobile") => {
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonthIndex = now.getMonth();

    const monthButtons = Array.from({ length: 12 }, (_, monthIndex) => {
      const isSelected = displayYear === selectedYear && monthIndex === selectedMonthIndex;
      const isCurrentMonth = displayYear === nowYear && monthIndex === nowMonthIndex;
      const ariaLabel = formatMonthAriaLabel(displayYear, monthIndex);

      const refCallback = (node: HTMLButtonElement | null) => {
        if (variant === "desktop") {
          if (monthIndex === 0) firstMonthDesktopRef.current = node;
          if (isSelected) selectedMonthDesktopRef.current = node;
        } else {
          if (monthIndex === 0) firstMonthMobileRef.current = node;
          if (isSelected) selectedMonthMobileRef.current = node;
        }
      };

      return (
        <button
          key={`${displayYear}-${monthIndex}`}
          ref={refCallback}
          type="button"
          aria-label={ariaLabel}
          className={clsx(
            "rounded-2xl px-3 py-2 text-sm font-semibold text-white/85 ring-1 ring-white/10 transition duration-150 ease-out hover:bg-white/10 active:scale-[0.98] motion-reduce:transition-none",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]",
            isCurrentMonth &&
              !isSelected &&
              "bg-[#00FFFF]/5 ring-[#00FFFF]/25 shadow-[0_0_0_1px_rgba(0,255,255,0.14),0_0_16px_rgba(0,255,255,0.12)]",
            isSelected &&
              "bg-[linear-gradient(135deg,#FF1493_0%,#8338EC_55%,#00FFFF_100%)] text-[#05010A] shadow-sm ring-1 ring-white/10 hover:brightness-110",
          )}
          onClick={() => {
            if (isClosing) return;
            onChange(displayYear, monthIndex);
            close();
          }}
        >
          {format(new Date(2026, monthIndex, 1), "MMM")}
        </button>
      );
    });

    return (
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous year"
              className="rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-white/10 transition duration-150 ease-out hover:bg-white/15 active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]"
              onClick={() => setDisplayYear((prev) => prev - 1)}
              disabled={isClosing}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <p className="min-w-[6ch] text-center text-sm font-semibold tabular-nums text-white">
              {displayYear}
            </p>
            <button
              type="button"
              aria-label="Next year"
              className="rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-white/10 transition duration-150 ease-out hover:bg-white/15 active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]"
              onClick={() => setDisplayYear((prev) => prev + 1)}
              disabled={isClosing}
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>

          <button
            type="button"
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-white/10 transition duration-150 ease-out hover:bg-white/15 active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]"
            onClick={() => {
              if (isClosing) return;
              const today = new Date();
              onChange(today.getFullYear(), today.getMonth());
              close();
            }}
            disabled={isClosing}
          >
            Today
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">{monthButtons}</div>
      </div>
    );
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Month and year"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={dialogId}
        onClick={toggle}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-white/10 transition duration-150 ease-out hover:bg-white/10 active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#05010A]"
      >
        <span className="tabular-nums">{triggerLabel}</span>
        <span aria-hidden="true" className="text-white/70">
          ▾
        </span>
      </button>

      {phase !== "closed" ? (
        <div
          className={clsx(
            "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm",
            isClosing ? "wc-picker-overlay-out" : "wc-picker-overlay-in",
          )}
          onMouseDown={(e) => {
            if (isClosing) return;
            if (e.target === e.currentTarget) close();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Month and year"
          id={dialogId}
        >
          {isDesktopLayout ? (
            <div
              className={clsx(
                "fixed w-[340px] rounded-3xl border border-white/10 bg-white/5 p-4 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_30px_80px_rgba(0,0,0,0.75)] backdrop-blur",
                isClosing ? "wc-picker-popover-out" : "wc-picker-popover-in",
              )}
              style={
                popoverPosition ? { top: popoverPosition.top, left: popoverPosition.left } : undefined
              }
            >
              {panelContent("desktop")}
            </div>
          ) : (
            <div
              className={clsx(
                "fixed inset-x-0 bottom-0 rounded-t-3xl border border-white/10 bg-[#05010A]/90 p-4 text-white shadow-[0_-18px_60px_rgba(0,0,0,0.75)] backdrop-blur",
                isClosing ? "wc-picker-sheet-out" : "wc-picker-sheet-in",
              )}
            >
              <div aria-hidden="true" className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/15" />
              {panelContent("mobile")}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
