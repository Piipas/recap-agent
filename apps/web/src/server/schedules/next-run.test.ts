import { describe, expect, it } from "vitest";
import { computeNextRunAt, localDay } from "./next-run";

const weekdays = [1, 2, 3, 4, 5];
const at = (iso: string) => new Date(iso);

describe("computeNextRunAt", () => {
  it("returns today's slot when it is still ahead", () => {
    // Wednesday 2026-10-14, 10:00 in Paris (UTC+2)
    expect(
      computeNextRunAt({ daysOfWeek: weekdays, timeOfDay: "18:00", timezone: "Europe/Paris" }, at("2026-10-14T08:00:00Z")),
    ).toEqual(at("2026-10-14T16:00:00Z"));
  });

  it("is strictly after the reference instant", () => {
    const timing = { daysOfWeek: weekdays, timeOfDay: "18:00", timezone: "Europe/Paris" };
    expect(computeNextRunAt(timing, at("2026-10-14T16:00:00Z"))).toEqual(at("2026-10-15T16:00:00Z"));
  });

  it("skips days that are not selected", () => {
    // Friday 2026-10-16 after the slot -> next Monday 2026-10-19
    expect(
      computeNextRunAt({ daysOfWeek: weekdays, timeOfDay: "18:00", timezone: "Europe/Paris" }, at("2026-10-16T17:00:00Z")),
    ).toEqual(at("2026-10-19T16:00:00Z"));
  });

  it("uses the schedule's calendar day, not UTC's", () => {
    // 23:30 UTC Wednesday is already Thursday 08:30 in Tokyo; Thursday-only schedule at 09:00.
    expect(
      computeNextRunAt({ daysOfWeek: [4], timeOfDay: "09:00", timezone: "Asia/Tokyo" }, at("2026-10-14T23:30:00Z")),
    ).toEqual(at("2026-10-15T00:00:00Z"));
  });

  it("follows the UTC offset across a DST change", () => {
    const timing = { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], timeOfDay: "18:00", timezone: "Europe/Paris" };
    expect(computeNextRunAt(timing, at("2026-10-24T17:00:00Z"))).toEqual(at("2026-10-25T17:00:00Z"));
  });

  it("moves a non-existent time forward on spring-forward day", () => {
    // 2026-03-29 02:30 does not exist in Paris; it runs at 03:30 CEST.
    const timing = { daysOfWeek: [0], timeOfDay: "02:30", timezone: "Europe/Paris" };
    expect(computeNextRunAt(timing, at("2026-03-28T12:00:00Z"))).toEqual(at("2026-03-29T01:30:00Z"));
  });

  it("runs an ambiguous time once on fall-back day", () => {
    const timing = { daysOfWeek: [0], timeOfDay: "02:30", timezone: "Europe/Paris" };
    const first = computeNextRunAt(timing, at("2026-10-24T12:00:00Z"));
    expect(first).toEqual(at("2026-10-25T01:30:00Z"));
    // The next slot after it is a week later, not the other 02:30 of the same night.
    expect(computeNextRunAt(timing, first ?? at("2026-10-25T00:00:00Z"))).toEqual(at("2026-11-01T01:30:00Z"));
  });

  it("returns null without days", () => {
    expect(computeNextRunAt({ daysOfWeek: [], timeOfDay: "18:00", timezone: "UTC" }, at("2026-10-14T00:00:00Z"))).toBe(
      null,
    );
  });
});

describe("localDay", () => {
  it("formats the local calendar day", () => {
    expect(localDay(at("2026-10-14T23:30:00Z"), "Asia/Tokyo")).toBe("2026-10-15");
    expect(localDay(at("2026-10-14T23:30:00Z"), "America/Los_Angeles")).toBe("2026-10-14");
  });
});
