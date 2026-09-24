import { describe, expect, it } from "vitest";

import {
  calculateCurrentLearnerStreak,
  costaRicaCalendarDay,
  getLearnerStreakColorLevel,
} from "@/modules/dashboard/domain/learner-streak";

describe("learner streak", () => {
  it("uses Costa Rica's calendar day at the UTC boundary", () => {
    expect(costaRicaCalendarDay(new Date("2026-09-17T05:59:59.000Z")))
      .toEqual(new Date("2026-09-16T00:00:00.000Z"));
    expect(costaRicaCalendarDay(new Date("2026-09-17T06:00:00.000Z")))
      .toEqual(new Date("2026-09-17T00:00:00.000Z"));
  });

  it("counts consecutive persisted days and stops at the first gap", () => {
    const now = new Date("2026-09-17T18:00:00.000Z");

    expect(calculateCurrentLearnerStreak([
      new Date("2026-09-17T00:00:00.000Z"),
      new Date("2026-09-16T00:00:00.000Z"),
      new Date("2026-09-15T00:00:00.000Z"),
      new Date("2026-09-13T00:00:00.000Z"),
    ], now)).toBe(3);
  });

  it("does not count an old streak after a missed day", () => {
    expect(calculateCurrentLearnerStreak([
      new Date("2026-09-15T00:00:00.000Z"),
      new Date("2026-09-14T00:00:00.000Z"),
    ], new Date("2026-09-17T18:00:00.000Z"))).toBe(0);
  });

  it.each([
    [1, 0], [4, 0], [5, 1], [9, 1], [10, 2], [15, 3], [20, 4], [100, 4],
  ])("changes visual level every five days (%i days)", (days, level) => {
    expect(getLearnerStreakColorLevel(days)).toBe(level);
  });
});
