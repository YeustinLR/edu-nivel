import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    learnerActivityDay: {
      findMany: mocks.findMany,
      upsert: mocks.upsert,
    },
  },
}));

import { recordLearnerDashboardVisit } from "@/server/dashboard/learner-streak";

describe("recordLearnerDashboardVisit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upsert.mockResolvedValue({});
  });

  it("records one Costa Rican calendar day and returns the persisted streak", async () => {
    mocks.findMany.mockResolvedValue([
      { activityDate: new Date("2026-09-17T00:00:00.000Z") },
      { activityDate: new Date("2026-09-16T00:00:00.000Z") },
    ]);

    const result = await recordLearnerDashboardVisit(
      "student-1",
      new Date("2026-09-17T18:00:00.000Z"),
    );

    expect(mocks.upsert).toHaveBeenCalledWith({
      where: {
        userId_activityDate: {
          userId: "student-1",
          activityDate: new Date("2026-09-17T00:00:00.000Z"),
        },
      },
      create: {
        userId: "student-1",
        activityDate: new Date("2026-09-17T00:00:00.000Z"),
      },
      update: {},
    });
    expect(result).toBe(2);
  });

  it("uses an idempotent upsert when the same day is visited again", async () => {
    mocks.findMany.mockResolvedValue([
      { activityDate: new Date("2026-09-16T00:00:00.000Z") },
    ]);

    await recordLearnerDashboardVisit(
      "teacher-1",
      new Date("2026-09-17T02:00:00.000Z"),
    );

    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId_activityDate: {
          userId: "teacher-1",
          activityDate: new Date("2026-09-16T00:00:00.000Z"),
        },
      },
      update: {},
    }));
  });
});
