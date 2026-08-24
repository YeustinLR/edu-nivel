import { describe, expect, it } from "vitest";

import {
  PlanCode,
  SubscriptionStatus,
} from "@/generated/prisma/enums";
import { getPrimarySubscription } from "@/modules/subscriptions/lib/learner-subscription-presentation";
import type { LearnerSubscriptionItem } from "@/modules/subscriptions/types/learner-subscription";

function subscription(
  id: string,
  options: { selected?: boolean; canStudy?: boolean } = {},
): LearnerSubscriptionItem {
  return {
    id,
    level: {
      id: `level-${id}`,
      levelNumber: Number(id),
      description: null,
      isActive: true,
      requiresSubscription: true,
    },
    persistedStatus: SubscriptionStatus.ACTIVE,
    effectiveStatus: "ACTIVE",
    currentPeriodStart: "2026-01-01T00:00:00.000Z",
    currentPeriodEnd: "2027-01-01T00:00:00.000Z",
    lastPlanCode: PlanCode.STUDENT_MONTHLY,
    hasConfirmedPayment: true,
    isSelectedLevel: options.selected ?? false,
    canStudy: options.canStudy ?? false,
    canRenew: true,
    latestPayment: null,
    openPayment: null,
  };
}

describe("getPrimarySubscription", () => {
  it("prioritizes the selected level", () => {
    const usable = subscription("7", { canStudy: true });
    const selected = subscription("8", { selected: true, canStudy: true });

    expect(getPrimarySubscription([usable, selected])).toBe(selected);
  });

  it("falls back to the first usable access and then the first item", () => {
    const expired = subscription("7");
    const usable = subscription("8", { canStudy: true });

    expect(getPrimarySubscription([expired, usable])).toBe(usable);
    expect(getPrimarySubscription([expired])).toBe(expired);
    expect(getPrimarySubscription([])).toBeNull();
  });
});
