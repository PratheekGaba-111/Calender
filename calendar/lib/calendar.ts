import {
  addDays,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type IsoDate = `${number}-${number}-${number}`;

export type DayCell = {
  date: Date;
  iso: IsoDate;
  inCurrentMonth: boolean;
  isToday: boolean;
};

export type DateRange = {
  startIso?: IsoDate;
  endIso?: IsoDate;
};

export type RangeVisualState = {
  isStart: boolean;
  isEnd: boolean;
  isInRange: boolean;
  isPreview: boolean;
};

function toIsoDate(date: Date): IsoDate {
  return format(date, "yyyy-MM-dd") as IsoDate;
}

export function monthKey(dateInMonth: Date): `${number}-${number}` {
  return format(dateInMonth, "yyyy-MM") as `${number}-${number}`;
}

export function sortIsoPair(a: IsoDate, b: IsoDate): { min: IsoDate; max: IsoDate } {
  return a <= b ? { min: a, max: b } : { min: b, max: a };
}

export function getMonthGrid(
  viewMonth: Date,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0,
): DayCell[][] {
  const monthStart = startOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn });
  const cells: DayCell[] = Array.from({ length: 42 }, (_, idx) => {
    const date = addDays(gridStart, idx);
    return {
      date,
      iso: toIsoDate(date),
      inCurrentMonth: isSameMonth(date, monthStart),
      isToday: isToday(date),
    };
  });

  return Array.from({ length: 6 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

export function getRangeKey(range: Required<DateRange>): `${IsoDate}..${IsoDate}` {
  const { min, max } = sortIsoPair(range.startIso, range.endIso);
  return `${min}..${max}` as const;
}

export function getRangeVisualState(
  dayIso: IsoDate,
  range: DateRange,
  hoverIso?: IsoDate,
): RangeVisualState {
  if (!range.startIso) {
    return { isStart: false, isEnd: false, isInRange: false, isPreview: false };
  }

  if (range.endIso) {
    const { min, max } = sortIsoPair(range.startIso, range.endIso);
    return {
      isStart: dayIso === min,
      isEnd: dayIso === max,
      isInRange: dayIso > min && dayIso < max,
      isPreview: false,
    };
  }

  if (hoverIso) {
    const { min, max } = sortIsoPair(range.startIso, hoverIso);
    return {
      isStart: dayIso === range.startIso,
      isEnd: dayIso === hoverIso,
      isInRange: false,
      isPreview: dayIso >= min && dayIso <= max,
    };
  }

  return {
    isStart: dayIso === range.startIso,
    isEnd: false,
    isInRange: false,
    isPreview: false,
  };
}

