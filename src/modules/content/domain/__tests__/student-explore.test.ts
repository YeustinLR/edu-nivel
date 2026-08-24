import { describe, expect, it } from "vitest";

import {
  ResourceType,
  SubscriptionProduct,
  SubscriptionStatus,
} from "@/generated/prisma/enums";
import {
  educationStageForLevel,
  getStudentExploreAccess,
  summarizeResourceTypes,
} from "@/modules/content/domain/student-explore";

const now = new Date("2026-08-12T12:00:00.000Z");

function subscription(status: SubscriptionStatus, end = "2026-09-01T00:00:00.000Z") {
  return {
    id: "subscription-7",
    product: SubscriptionProduct.STUDENT_PREMIUM,
    status,
    currentPeriodStart: new Date("2026-08-01T00:00:00.000Z"),
    currentPeriodEnd: new Date(end),
    hasConfirmedPayment: true,
  };
}

describe("student explore domain", () => {
  it("separates the documented primary and secondary ranges", () => {
    expect(educationStageForLevel(1)).toBe("primary");
    expect(educationStageForLevel(6)).toBe("primary");
    expect(educationStageForLevel(7)).toBe("secondary");
    expect(educationStageForLevel(11)).toBe("secondary");
  });

  it("orders resource types by frequency and caps the visible summary", () => {
    expect(
      summarizeResourceTypes([
        ResourceType.NOTE,
        ResourceType.PDF,
        ResourceType.NOTE,
        ResourceType.YOUTUBE,
        ResourceType.AUDIO,
      ]),
    ).toEqual({
      resourceTypes: [ResourceType.NOTE, ResourceType.AUDIO, ResourceType.PDF],
      additionalResourceTypeCount: 1,
    });
  });

  it("grants included, active and canceled-but-paid access", () => {
    expect(getStudentExploreAccess({ requiresSubscription: false, emailVerified: true, subscription: null, pendingPaymentId: null, now }).status).toBe("INCLUDED");
    expect(getStudentExploreAccess({ requiresSubscription: true, emailVerified: true, subscription: subscription(SubscriptionStatus.ACTIVE), pendingPaymentId: null, now }).status).toBe("ACTIVE");
    expect(getStudentExploreAccess({ requiresSubscription: true, emailVerified: true, subscription: subscription(SubscriptionStatus.CANCELED), pendingPaymentId: null, now }).status).toBe("CANCELED_ACTIVE");
  });

  it("distinguishes expired access and an open payment", () => {
    expect(getStudentExploreAccess({ requiresSubscription: true, emailVerified: true, subscription: subscription(SubscriptionStatus.CANCELED, "2026-08-12T12:00:00.000Z"), pendingPaymentId: null, now }).status).toBe("EXPIRED");
    expect(getStudentExploreAccess({ requiresSubscription: true, emailVerified: true, subscription: null, pendingPaymentId: "payment-7", now })).toMatchObject({ status: "PENDING", pendingPaymentId: "payment-7" });
  });
});
