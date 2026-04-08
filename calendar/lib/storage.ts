import type { IsoDate } from "@/lib/calendar";

export const STORAGE_KEY = "wall-calendar:v1";

export type CalendarNote = {
  id: string;
  dateIso: IsoDate;
  title: string;
  description: string;
  createdAt: number;
  updatedAt?: number;
};

export type WallCalendarStorage = {
  version: 1;
  monthMemos: Record<string, string>;
  rangeNotes: Record<string, string>;
  datedNotes: CalendarNote[];
};

const DEFAULT_STORAGE: WallCalendarStorage = {
  version: 1,
  monthMemos: {},
  rangeNotes: {},
  datedNotes: [],
};

function cleanRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, recordValue]) =>
      typeof recordValue === "string" ? [[key, recordValue]] : [],
    ),
  );
}

function isIsoDate(value: unknown): value is IsoDate {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function cleanNotes(value: unknown): CalendarNote[] {
  if (!Array.isArray(value)) return [];

  const seenIds = new Set<string>();
  const notes: CalendarNote[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;

    const id = typeof record.id === "string" ? record.id : null;
    const dateIso = isIsoDate(record.dateIso) ? record.dateIso : null;
    const title = typeof record.title === "string" ? record.title : null;
    const description = typeof record.description === "string" ? record.description : "";
    const createdAt = typeof record.createdAt === "number" ? record.createdAt : null;
    const updatedAt = typeof record.updatedAt === "number" ? record.updatedAt : undefined;

    if (!id || !dateIso || !title || createdAt === null) continue;
    if (title.trim().length === 0) continue;
    if (seenIds.has(id)) continue;

    seenIds.add(id);
    notes.push({
      id,
      dateIso,
      title,
      description,
      createdAt,
      updatedAt,
    });
  }

  return notes;
}

export function loadStorage(): WallCalendarStorage {
  if (typeof window === "undefined") return DEFAULT_STORAGE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STORAGE;

    const parsed = JSON.parse(raw) as Partial<WallCalendarStorage> | null;
    if (!parsed || parsed.version !== 1) return DEFAULT_STORAGE;

    return {
      version: 1,
      monthMemos: cleanRecord(parsed.monthMemos),
      rangeNotes: cleanRecord(parsed.rangeNotes),
      datedNotes: cleanNotes(parsed.datedNotes),
    };
  } catch {
    return DEFAULT_STORAGE;
  }
}

export function saveStorage(data: WallCalendarStorage): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage write errors (e.g., private mode, quota exceeded).
  }
}
