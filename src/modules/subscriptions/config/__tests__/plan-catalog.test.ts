import { describe, expect, it } from "vitest";

import {
  amountMinorToCRC,
  getSubscriptionPlan,
  getSubscriptionPlansForRole,
  SUBSCRIPTION_PLAN_CATALOG,
  SUBSCRIPTION_PLAN_CODES,
} from "@/modules/subscriptions/config/plan-catalog";

describe("subscription plan catalog", () => {
  it("contains exactly the four MVP plans", () => {
    expect(SUBSCRIPTION_PLAN_CODES).toEqual([
      "STUDENT_MONTHLY",
      "STUDENT_YEARLY",
      "TEACHER_MONTHLY",
      "TEACHER_YEARLY",
    ]);
  });

  it("stores the expected amounts in CRC minor units", () => {
    expect(SUBSCRIPTION_PLAN_CATALOG.STUDENT_MONTHLY.amountMinor).toBe(
      350_000,
    );
    expect(SUBSCRIPTION_PLAN_CATALOG.STUDENT_YEARLY.amountMinor).toBe(
      3_360_000,
    );
    expect(SUBSCRIPTION_PLAN_CATALOG.TEACHER_MONTHLY.amountMinor).toBe(
      650_000,
    );
    expect(SUBSCRIPTION_PLAN_CATALOG.TEACHER_YEARLY.amountMinor).toBe(
      6_240_000,
    );
  });

  it("keeps product and role compatibility explicit", () => {
    expect(SUBSCRIPTION_PLAN_CATALOG.STUDENT_MONTHLY).toMatchObject({
      product: "STUDENT_PREMIUM",
      requiredRole: "STUDENT",
    });
    expect(SUBSCRIPTION_PLAN_CATALOG.TEACHER_YEARLY).toMatchObject({
      product: "TEACHER_PREMIUM",
      requiredRole: "TEACHER",
    });
  });

  it("returns only the plans allowed for each learner role", () => {
    expect(getSubscriptionPlansForRole("STUDENT").map((plan) => plan.code)).toEqual([
      "STUDENT_MONTHLY",
      "STUDENT_YEARLY",
    ]);
    expect(getSubscriptionPlansForRole("TEACHER").map((plan) => plan.code)).toEqual([
      "TEACHER_MONTHLY",
      "TEACHER_YEARLY",
    ]);
  });

  it("uses one or twelve calendar months", () => {
    expect(SUBSCRIPTION_PLAN_CATALOG.STUDENT_MONTHLY.durationMonths).toBe(1);
    expect(SUBSCRIPTION_PLAN_CATALOG.STUDENT_YEARLY.durationMonths).toBe(12);
  });

  it("rejects unknown or quarterly plan codes", () => {
    expect(getSubscriptionPlan("STUDENT_QUARTERLY")).toBeNull();
    expect(getSubscriptionPlan("UNKNOWN")).toBeNull();
  });

  it("converts ONVO minor units for public price display", () => {
    expect(amountMinorToCRC(350_000)).toBe(3_500);
    expect(amountMinorToCRC(6_240_000)).toBe(62_400);
  });
});
