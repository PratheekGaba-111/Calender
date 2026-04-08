"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadStorage, saveStorage, type WallCalendarStorage } from "@/lib/storage";

export type SaveState = "idle" | "saving" | "saved";

export function useWallCalendarStorage(debounceMs: number = 350): {
  data: WallCalendarStorage;
  setData: (next: React.SetStateAction<WallCalendarStorage>) => void;
  saveState: SaveState;
} {
  const [data, setData] = useState<WallCalendarStorage>(() => ({
    version: 1,
    monthMemos: {},
    rangeNotes: {},
    datedNotes: [],
  }));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const hasLoadedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      saveStorage(data);
      setSaveState("saved");
      timeoutRef.current = null;
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [data, debounceMs]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(loadStorage());
    hasLoadedRef.current = true;
  }, []);

  const setDataWithSaveState = useCallback(
    (next: React.SetStateAction<WallCalendarStorage>) => {
      setSaveState("saving");
      setData(next);
    },
    [],
  );

  return { data, setData: setDataWithSaveState, saveState };
}
