import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ProviderMode,
  Role,
  SubscriptionProduct,
  SubscriptionStatus,
} from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  subscriptionFindMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    subscription: { findMany: mocks.subscriptionFindMany },
  },
}));

import { getAccessibleLearnerLevels } from "@/server/subscriptions/learner-level-access-queries";

const now = new Date("2026-09-15T12:00:00.000Z");
const levels = [
  {
    id: "free",
    levelNumber: 1,
    description: null,
    requiresSubscription: false,
    isActive: true,
  },
  {
    id: "active-paid",
    levelNumber: 2,
    description: null,
    requiresSubscription: true,
    isActive: true,
  },
  {
    id: "inactive-paid",
    levelNumber: 3,
    description: null,
    requiresSubscription: true,
    isActive: true,
  },
];

describe("accessible learner levels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ONVO_ENV = "test";
    mocks.subscriptionFindMany.mockResolvedValue([
      { levelId: "active-paid", level: levels[1] },
    ]);
  });

  it("returns every active level and identifies which ones have full access", async () => {
    const result = await getAccessibleLearnerLevels({
      userId: "student-1",
      role: Role.STUDENT,
      levels,
      now,
    });

    expect(result.map((level) => level.id)).toEqual([
      "free",
      "active-paid",
      "inactive-paid",
    ]);
    expect(result.map((level) => [level.id, level.hasFullAccess])).toEqual([
      ["free", true],
      ["active-paid", true],
      ["inactive-paid", false],
    ]);
    expect(mocks.subscriptionFindMany).toHaveBeenCalledWith({
      where: {
        userId: "student-1",
        product: SubscriptionProduct.STUDENT_PREMIUM,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELED],
        },
        currentPeriodStart: { lte: now },
        currentPeriodEnd: { gt: now },
        payments: {
          some: {
            providerMode: ProviderMode.TEST,
            status: { in: ["SUCCEEDED", "REQUIRES_REVIEW"] },
            appliedAt: { not: null },
          },
        },
      },
      select: {
        levelId: true,
        level: {
          select: {
            id: true,
            levelNumber: true,
            description: true,
            requiresSubscription: true,
            isActive: true,
          },
        },
      },
    });
  });

  it("includes an archived paid level while its subscription remains valid", async () => {
    const archived = {
      id: "archived-paid",
      levelNumber: 4,
      description: "Retirado de nuevas compras",
      requiresSubscription: true,
      isActive: false,
    };
    mocks.subscriptionFindMany.mockResolvedValue([
      { levelId: archived.id, level: archived },
    ]);

    const result = await getAccessibleLearnerLevels({
      userId: "student-1",
      role: Role.STUDENT,
      levels,
      now,
    });

    expect(result.map((level) => level.id)).toEqual([
      "free",
      "active-paid",
      "inactive-paid",
      "archived-paid",
    ]);
    expect(result[3]).toMatchObject({ isActive: false, hasFullAccess: true });
  });
});
