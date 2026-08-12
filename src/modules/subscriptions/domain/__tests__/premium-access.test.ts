import { describe, expect, it } from "vitest";

import {
  Role,
  SubscriptionProduct,
  SubscriptionStatus,
} from "@/generated/prisma/client";
import { evaluatePremiumAccess } from "@/modules/subscriptions/domain/premium-access";

const now = new Date("2026-07-22T12:00:00.000Z");

function activeStudentSubscription() {
  return {
    product: SubscriptionProduct.STUDENT_PREMIUM,
    status: SubscriptionStatus.ACTIVE,
    currentPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
    currentPeriodEnd: new Date("2026-08-01T00:00:00.000Z"),
    hasConfirmedPayment: true,
  };
}

describe("evaluatePremiumAccess", () => {
  it("allows an eligible user with an active paid subscription", () => {
    expect(
      evaluatePremiumAccess({
        role: Role.STUDENT,
        emailVerified: true,
        subscription: activeStudentSubscription(),
        now,
      }),
    ).toEqual({ allowed: true });
  });

  it("allows a teacher only with the matching active paid product", () => {
    expect(
      evaluatePremiumAccess({
        role: Role.TEACHER,
        emailVerified: true,
        subscription: {
          ...activeStudentSubscription(),
          product: SubscriptionProduct.TEACHER_PREMIUM,
        },
        now,
      }),
    ).toEqual({ allowed: true });
  });

  it("rejects an unverified user even when the subscription is active", () => {
    expect(
      evaluatePremiumAccess({
        role: Role.STUDENT,
        emailVerified: false,
        subscription: activeStudentSubscription(),
        now,
      }),
    ).toEqual({ allowed: false, code: "EMAIL_NOT_VERIFIED" });
  });

  it("rejects users without subscriptions", () => {
    expect(
      evaluatePremiumAccess({
        role: Role.STUDENT,
        emailVerified: true,
        subscription: null,
        now,
      }),
    ).toEqual({ allowed: false, code: "SUBSCRIPTION_REQUIRED" });
  });

  it("rejects subscriptions that have not started", () => {
    expect(
      evaluatePremiumAccess({
        role: Role.STUDENT,
        emailVerified: true,
        subscription: {
          ...activeStudentSubscription(),
          currentPeriodStart: new Date("2026-07-23T00:00:00.000Z"),
        },
        now,
      }),
    ).toEqual({ allowed: false, code: "SUBSCRIPTION_NOT_STARTED" });
  });

  it("rejects expired subscriptions", () => {
    expect(
      evaluatePremiumAccess({
        role: Role.STUDENT,
        emailVerified: true,
        subscription: {
          ...activeStudentSubscription(),
          currentPeriodEnd: now,
        },
        now,
      }),
    ).toEqual({ allowed: false, code: "SUBSCRIPTION_EXPIRED" });
  });

  it("rejects canceled subscriptions", () => {
    expect(
      evaluatePremiumAccess({
        role: Role.STUDENT,
        emailVerified: true,
        subscription: {
          ...activeStudentSubscription(),
          status: SubscriptionStatus.CANCELED,
        },
        now,
      }),
    ).toEqual({ allowed: false, code: "SUBSCRIPTION_INACTIVE" });
  });

  it("rejects a teacher product for a student", () => {
    expect(
      evaluatePremiumAccess({
        role: Role.STUDENT,
        emailVerified: true,
        subscription: {
          ...activeStudentSubscription(),
          product: SubscriptionProduct.TEACHER_PREMIUM,
        },
        now,
      }),
    ).toEqual({
      allowed: false,
      code: "SUBSCRIPTION_PRODUCT_MISMATCH",
    });
  });

  it("rejects subscriptions without an applied confirmed payment", () => {
    expect(
      evaluatePremiumAccess({
        role: Role.STUDENT,
        emailVerified: true,
        subscription: {
          ...activeStudentSubscription(),
          hasConfirmedPayment: false,
        },
        now,
      }),
    ).toEqual({
      allowed: false,
      code: "SUBSCRIPTION_PAYMENT_UNCONFIRMED",
    });
  });

  it("does not grant subscription access to administrators", () => {
    expect(
      evaluatePremiumAccess({
        role: Role.ADMIN,
        emailVerified: true,
        subscription: null,
        now,
      }),
    ).toEqual({ allowed: false, code: "ROLE_NOT_ELIGIBLE" });
  });
});
