import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PaymentStatus,
  PlanCode,
  Role,
  SubscriptionProduct,
  SubscriptionStatus,
} from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/db/prisma", () => ({
  prisma: { user: { findUnique: mocks.findUnique } },
}));

import { getAdminUserDetail } from "@/server/users/admin-user-detail-queries";

describe("getAdminUserDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
  });

  it("requires ADMIN before reading the target user", async () => {
    mocks.requireRole.mockRejectedValue(new Error("FORBIDDEN"));

    await expect(getAdminUserDetail("user-1")).rejects.toThrow("FORBIDDEN");
    expect(mocks.requireRole).toHaveBeenCalledWith(Role.ADMIN);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("returns null for an unknown user", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await expect(getAdminUserDetail("missing")).resolves.toBeNull();
  });

  it("maps only administrative summaries", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Ana Docente",
      email: "ana@example.com",
      emailVerified: true,
      role: Role.TEACHER,
      selectedLevel: {
        levelNumber: 7,
      },
      createdAt: new Date("2026-07-01T12:00:00.000Z"),
      updatedAt: new Date("2026-08-01T12:00:00.000Z"),
      _count: {
        createdModules: 2,
        createdResources: 4,
        subscriptions: 1,
        payments: 1,
        sessions: 2,
      },
      sessions: [
        {
          id: "session-1",
          createdAt: new Date("2026-08-01T00:00:00.000Z"),
          updatedAt: new Date("2026-08-02T00:00:00.000Z"),
          expiresAt: new Date("2026-08-10T00:00:00.000Z"),
        },
      ],
      subscriptions: [
        {
          id: "subscription-1",
          product: SubscriptionProduct.TEACHER_PREMIUM,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: new Date("2026-08-01T00:00:00.000Z"),
          currentPeriodEnd: new Date("2026-09-01T00:00:00.000Z"),
          level: { levelNumber: 7 },
        },
      ],
      payments: [
        {
          id: "payment-1",
          planCode: PlanCode.TEACHER_MONTHLY,
          status: PaymentStatus.SUCCEEDED,
          expectedAmountMinor: 650_000,
          createdAt: new Date("2026-08-01T00:00:00.000Z"),
          level: { levelNumber: 7 },
        },
      ],
    });

    const result = await getAdminUserDetail("user-1");

    expect(mocks.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } }),
    );
    expect(result).toMatchObject({
      id: "user-1",
      counts: {
        modules: 2,
        resources: 4,
        subscriptions: 1,
        payments: 1,
        sessions: 2,
      },
      recentSessions: [{ id: "session-1" }],
      subscriptions: [{ id: "subscription-1", levelNumber: 7 }],
      recentPayments: [{ id: "payment-1", levelNumber: 7 }],
    });
  });
});
