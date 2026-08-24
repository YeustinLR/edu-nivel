import { describe, expect, it } from "vitest";

import { SubscriptionStatus } from "@/generated/prisma/client";
import {
  addUtcCalendarMonths,
  resolveSubscriptionPeriod,
} from "@/modules/subscriptions/domain/subscription-period";

describe("addUtcCalendarMonths", () => {
  it("adds a regular calendar month", () => {
    expect(
      addUtcCalendarMonths(new Date("2026-07-22T15:30:00.000Z"), 1),
    ).toEqual(new Date("2026-08-22T15:30:00.000Z"));
  });

  it("clamps January 31 to the last day of February", () => {
    expect(
      addUtcCalendarMonths(new Date("2026-01-31T10:00:00.000Z"), 1),
    ).toEqual(new Date("2026-02-28T10:00:00.000Z"));
  });

  it("preserves February 29 when the target year is a leap year", () => {
    expect(
      addUtcCalendarMonths(new Date("2023-02-28T10:00:00.000Z"), 12),
    ).toEqual(new Date("2024-02-28T10:00:00.000Z"));
    expect(
      addUtcCalendarMonths(new Date("2024-01-31T10:00:00.000Z"), 1),
    ).toEqual(new Date("2024-02-29T10:00:00.000Z"));
  });

  it("clamps February 29 when adding a year", () => {
    expect(
      addUtcCalendarMonths(new Date("2024-02-29T10:00:00.000Z"), 12),
    ).toEqual(new Date("2025-02-28T10:00:00.000Z"));
  });

  it("rejects invalid durations", () => {
    expect(() => addUtcCalendarMonths(new Date(), 0)).toThrow(RangeError);
    expect(() => addUtcCalendarMonths(new Date(), 1.5)).toThrow(RangeError);
  });
});

describe("resolveSubscriptionPeriod", () => {
  const confirmedAt = new Date("2026-07-23T18:00:00.000Z");

  it("starts a new monthly period at the provider confirmation time", () => {
    expect(resolveSubscriptionPeriod(null, confirmedAt, 1)).toEqual({
      currentPeriodStart: confirmedAt,
      currentPeriodEnd: new Date("2026-08-23T18:00:00.000Z"),
    });
  });

  it("renews an active period from its current end without losing paid time", () => {
    expect(
      resolveSubscriptionPeriod(
        {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date("2026-07-01T12:00:00.000Z"),
          currentPeriodEnd: new Date("2026-08-01T12:00:00.000Z"),
        },
        confirmedAt,
        1,
      ),
    ).toEqual({
      currentPeriodStart: new Date("2026-07-01T12:00:00.000Z"),
      currentPeriodEnd: new Date("2026-09-01T12:00:00.000Z"),
    });
  });

  it("adds a yearly purchase after the end of an active monthly period", () => {
    expect(
      resolveSubscriptionPeriod(
        {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date("2026-07-01T12:00:00.000Z"),
          currentPeriodEnd: new Date("2026-08-01T12:00:00.000Z"),
        },
        confirmedAt,
        12,
      ),
    ).toEqual({
      currentPeriodStart: new Date("2026-07-01T12:00:00.000Z"),
      currentPeriodEnd: new Date("2027-08-01T12:00:00.000Z"),
    });
  });

  it("renews a canceled but still-paid period without losing remaining days", () => {
    expect(
      resolveSubscriptionPeriod(
        {
          status: SubscriptionStatus.CANCELED,
          currentPeriodStart: new Date("2026-07-01T12:00:00.000Z"),
          currentPeriodEnd: new Date("2026-08-01T12:00:00.000Z"),
        },
        confirmedAt,
        1,
      ),
    ).toEqual({
      currentPeriodStart: new Date("2026-07-01T12:00:00.000Z"),
      currentPeriodEnd: new Date("2026-09-01T12:00:00.000Z"),
    });
  });

  it.each([
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.EXPIRED,
  ])(
    "restarts at confirmation when the previous %s period cannot carry time",
    (status) => {
      expect(
        resolveSubscriptionPeriod(
          {
            status,
            currentPeriodStart: new Date("2026-05-01T12:00:00.000Z"),
            currentPeriodEnd: new Date("2026-06-01T12:00:00.000Z"),
          },
          confirmedAt,
          1,
        ),
      ).toEqual({
        currentPeriodStart: confirmedAt,
        currentPeriodEnd: new Date("2026-08-23T18:00:00.000Z"),
      });
    },
  );
});
