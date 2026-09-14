import { describe, expect, it } from "vitest";

import {
  costaRicaMonthKey,
  getAdminPaymentHistoryStart,
  getAdminPaymentReportingPeriods,
  paymentMetricPercentage,
} from "@/modules/payments/domain/admin-payment-reporting";

describe("admin payment reporting periods", () => {
  it("uses Costa Rican calendar boundaries and compares equal elapsed time", () => {
    const now = new Date("2026-09-13T18:30:00.000Z");
    const periods = getAdminPaymentReportingPeriods(now);

    expect(periods.currentMonth).toEqual({
      start: new Date("2026-09-01T06:00:00.000Z"),
      end: now,
    });
    expect(periods.previousComparableMonth).toEqual({
      start: new Date("2026-08-01T06:00:00.000Z"),
      end: new Date("2026-08-13T18:30:00.000Z"),
    });
    expect(periods.trend.start).toEqual(new Date("2026-04-01T06:00:00.000Z"));
  });

  it("clamps a comparison when the previous month is shorter", () => {
    const periods = getAdminPaymentReportingPeriods(
      new Date("2026-03-31T20:00:00.000Z"),
    );
    expect(periods.previousComparableMonth.end).toEqual(
      new Date("2026-03-01T06:00:00.000Z"),
    );
  });

  it("handles year boundaries and stable month keys", () => {
    const periods = getAdminPaymentReportingPeriods(
      new Date("2026-01-01T05:30:00.000Z"),
    );
    expect(periods.currentMonth.start).toEqual(
      new Date("2025-12-01T06:00:00.000Z"),
    );
    expect(costaRicaMonthKey(new Date("2026-01-01T05:30:00.000Z"))).toBe(
      "2025-12",
    );
  });

  it("creates bounded history periods and safe percentage comparisons", () => {
    const now = new Date("2026-09-13T18:30:00.000Z");
    expect(getAdminPaymentHistoryStart("30d", now)).toEqual(
      new Date(now.getTime() - 30 * 86_400_000),
    );
    expect(getAdminPaymentHistoryStart("12m", now)).toEqual(
      new Date("2025-09-13T18:30:00.000Z"),
    );
    expect(getAdminPaymentHistoryStart("all", now)).toBeUndefined();
    expect(paymentMetricPercentage(120, 100)).toBe(20);
    expect(paymentMetricPercentage(100, 0)).toBeNull();
  });
});
