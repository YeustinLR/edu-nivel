import { describe, expect, it } from "vitest";

import {
  buildWeeklyCollectionTrend,
  collectedInPeriod,
  getAdminDashboardPeriods,
  getMetricDelta,
  isInPeriod,
} from "@/modules/dashboard/domain/admin-dashboard";

describe("admin dashboard presentation domain", () => {
  const now = new Date("2026-09-10T18:00:00.000Z");

  it("builds adjacent half-open comparison periods", () => {
    const periods = getAdminDashboardPeriods(now);

    expect(periods.current30Days).toEqual({
      start: new Date("2026-08-11T18:00:00.000Z"),
      end: now,
    });
    expect(periods.previous30Days.end).toEqual(periods.current30Days.start);
    expect(periods.current7Days.start).toEqual(
      new Date("2026-09-03T18:00:00.000Z"),
    );
    expect(periods.previous7Days.end).toEqual(periods.current7Days.start);
  });

  it("includes the start and excludes the end of a period", () => {
    const period = getAdminDashboardPeriods(now).current30Days;

    expect(isInPeriod(period.start, period)).toBe(true);
    expect(isInPeriod(new Date(period.end.getTime() - 1), period)).toBe(true);
    expect(isInPeriod(period.end, period)).toBe(false);
  });

  it("sums only payment events within the selected period", () => {
    const period = getAdminDashboardPeriods(now).current30Days;
    const payments = [
      { amountMinor: 10_000, occurredAt: period.start },
      { amountMinor: 2_000, occurredAt: new Date("2026-09-01T12:00:00.000Z") },
      { amountMinor: 50_000, occurredAt: period.end },
    ];
    expect(collectedInPeriod(payments, period)).toBe(12_000);
  });

  it("does not calculate a misleading percentage from a zero baseline", () => {
    expect(getMetricDelta({ current: 4, previous: 0 })).toEqual({
      absolute: 4,
      percentage: null,
      direction: "up",
    });
    expect(getMetricDelta({ current: 4, previous: null })).toBeNull();
  });

  it("groups the 30-day movement into Costa Rican calendar weeks", () => {
    const period = getAdminDashboardPeriods(now).current30Days;
    const trend = buildWeeklyCollectionTrend(
      [
        { amountMinor: 10_000, occurredAt: new Date("2026-09-08T12:00:00.000Z") },
        { amountMinor: 5_000, occurredAt: new Date("2026-09-01T12:00:00.000Z") },
      ],
      period,
    );

    expect(trend.length).toBeGreaterThanOrEqual(5);
    expect(trend.reduce((total, bucket) => total + bucket.amountMinor, 0)).toBe(15_000);
    expect(trend[0]?.start).toEqual(period.start);
    expect(trend.at(-1)?.end).toEqual(period.end);
  });
});
