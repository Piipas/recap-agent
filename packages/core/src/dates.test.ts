import { describe, expect, it } from "vitest";
import { dayBounds, isoDay } from "./dates";

describe("isoDay", () => {
  it("formats the UTC calendar day", () => {
    expect(isoDay(new Date("2026-10-14T00:00:00Z"))).toBe("2026-10-14");
  });
});

describe("dayBounds", () => {
  it("covers the UTC day", () => {
    expect(dayBounds("2026-10-14", "UTC")).toEqual({
      start: new Date("2026-10-14T00:00:00Z"),
      end: new Date("2026-10-15T00:00:00Z"),
    });
  });

  it("covers the local day in another timezone", () => {
    expect(dayBounds("2026-10-14", "Europe/Paris")).toEqual({
      start: new Date("2026-10-13T22:00:00Z"),
      end: new Date("2026-10-14T22:00:00Z"),
    });
  });

  it("is 25 hours long on the day clocks go back", () => {
    const { start, end } = dayBounds("2026-10-25", "Europe/Paris");
    expect(end.getTime() - start.getTime()).toBe(25 * 3_600_000);
  });
});
