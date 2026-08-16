import { describe, expect, it } from "vitest";
import { assertDateOnly, buildWeek, startOfMondayWeek, toLocalDateString } from "@/src/domain/week";

describe("week helpers", () => {
  it("formats local date-only strings", () => {
    expect(toLocalDateString(new Date(2026, 7, 16, 10, 30))).toBe("2026-08-16");
  });

  it("finds the Monday that starts the local week", () => {
    expect(startOfMondayWeek(new Date(2026, 7, 16, 10, 30))).toBe("2026-08-10");
    expect(startOfMondayWeek(new Date(2026, 7, 17, 10, 30))).toBe("2026-08-17");
  });

  it("builds exactly seven Monday-through-Sunday days and marks today", () => {
    expect(buildWeek("2026-08-10", "2026-08-16")).toEqual([
      { date: "2026-08-10", weekday: "Mon", dayOfMonth: 10, isToday: false },
      { date: "2026-08-11", weekday: "Tue", dayOfMonth: 11, isToday: false },
      { date: "2026-08-12", weekday: "Wed", dayOfMonth: 12, isToday: false },
      { date: "2026-08-13", weekday: "Thu", dayOfMonth: 13, isToday: false },
      { date: "2026-08-14", weekday: "Fri", dayOfMonth: 14, isToday: false },
      { date: "2026-08-15", weekday: "Sat", dayOfMonth: 15, isToday: false },
      { date: "2026-08-16", weekday: "Sun", dayOfMonth: 16, isToday: true }
    ]);
  });

  it("rejects non-date-only strings", () => {
    expect(assertDateOnly("2026-08-16")).toBe("2026-08-16");
    expect(() => assertDateOnly("2026-08-16T00:00:00Z")).toThrow("Expected YYYY-MM-DD date");
  });
});
