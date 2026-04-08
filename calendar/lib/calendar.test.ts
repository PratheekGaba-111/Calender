import { getMonthGrid, getRangeVisualState, type IsoDate } from "@/lib/calendar";

describe("getMonthGrid", () => {
  it("returns a 6x7 grid with leading/trailing days", () => {
    const grid = getMonthGrid(new Date(2026, 3, 15), 0);

    expect(grid).toHaveLength(6);
    for (const week of grid) expect(week).toHaveLength(7);

    expect(grid[0][0].iso).toBe("2026-03-29");
    expect(grid[5][6].iso).toBe("2026-05-09");

    const inMonthCount = grid.flat().filter((c) => c.inCurrentMonth).length;
    expect(inMonthCount).toBe(30);
  });
});

describe("getRangeVisualState", () => {
  it("marks start/end and in-between days for a complete range", () => {
    const range = { startIso: "2026-04-10" as IsoDate, endIso: "2026-04-14" as IsoDate };

    expect(getRangeVisualState("2026-04-10", range)).toMatchObject({
      isStart: true,
      isEnd: false,
      isInRange: false,
    });
    expect(getRangeVisualState("2026-04-12", range)).toMatchObject({
      isStart: false,
      isEnd: false,
      isInRange: true,
    });
    expect(getRangeVisualState("2026-04-14", range)).toMatchObject({
      isStart: false,
      isEnd: true,
      isInRange: false,
    });
    expect(getRangeVisualState("2026-04-09", range)).toMatchObject({
      isStart: false,
      isEnd: false,
      isInRange: false,
    });
  });

  it("normalizes reversed start/end for a complete range", () => {
    const range = { startIso: "2026-04-14" as IsoDate, endIso: "2026-04-10" as IsoDate };

    expect(getRangeVisualState("2026-04-10", range).isStart).toBe(true);
    expect(getRangeVisualState("2026-04-14", range).isEnd).toBe(true);
    expect(getRangeVisualState("2026-04-12", range).isInRange).toBe(true);
  });

  it("provides preview state when hovering an end date", () => {
    const range = { startIso: "2026-04-10" as IsoDate };

    expect(getRangeVisualState("2026-04-11", range, "2026-04-12")).toMatchObject({
      isPreview: true,
      isInRange: false,
    });
    expect(getRangeVisualState("2026-04-10", range, "2026-04-12")).toMatchObject({
      isStart: true,
      isPreview: true,
    });
    expect(getRangeVisualState("2026-04-12", range, "2026-04-12")).toMatchObject({
      isEnd: true,
      isPreview: true,
    });
  });
});

