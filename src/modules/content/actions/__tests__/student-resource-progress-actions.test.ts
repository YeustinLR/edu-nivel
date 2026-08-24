import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ContentAudience,
  PublicationStatus,
  Role,
} from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireRole: vi.fn(),
  getPremiumAccessDecision: vi.fn(),
  resourceFindFirst: vi.fn(),
  progressUpsert: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/server/auth/guards", () => ({
  requireRole: mocks.requireRole,
  getPremiumAccessDecision: mocks.getPremiumAccessDecision,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    resource: { findFirst: mocks.resourceFindFirst },
    resourceProgress: { upsert: mocks.progressUpsert },
  },
}));

import {
  recordStudentResourceViewedAction,
  setStudentResourceCompletedAction,
} from "@/modules/content/actions/student-resource-progress-actions";

describe("student resource progress actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({
      id: "student-1",
      role: Role.STUDENT,
      selectedLevelId: "level-7",
    });
    mocks.getPremiumAccessDecision.mockResolvedValue({
      decision: { allowed: true },
    });
    mocks.resourceFindFirst.mockResolvedValue({ id: "resource-1" });
    mocks.progressUpsert.mockResolvedValue({ id: "progress-1" });
  });

  it("records the latest view without changing completion", async () => {
    const result = await recordStudentResourceViewedAction("resource-1");

    expect(mocks.requireRole).toHaveBeenCalledWith(Role.STUDENT);
    expect(mocks.resourceFindFirst).toHaveBeenCalledWith({
      where: {
        id: "resource-1",
        isActive: true,
        publicationStatus: PublicationStatus.PUBLISHED,
        module: {
          isActive: true,
          publicationStatus: PublicationStatus.PUBLISHED,
          audience: {
            in: [ContentAudience.STUDENT, ContentAudience.BOTH],
          },
          subject: {
            levelId: "level-7",
            isActive: true,
            level: { id: "level-7", isActive: true },
          },
        },
      },
      select: { id: true },
    });
    expect(mocks.progressUpsert).toHaveBeenCalledWith({
      where: {
        userId_resourceId: {
          userId: "student-1",
          resourceId: "resource-1",
        },
      },
      create: {
        userId: "student-1",
        resourceId: "resource-1",
        lastViewedAt: expect.any(Date),
      },
      update: { lastViewedAt: expect.any(Date) },
    });
    expect(result).toEqual({ status: "success" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("marks completion atomically and revalidates learner surfaces", async () => {
    const result = await setStudentResourceCompletedAction({
      resourceId: "resource-1",
      completed: true,
    });

    expect(mocks.progressUpsert).toHaveBeenCalledWith({
      where: {
        userId_resourceId: {
          userId: "student-1",
          resourceId: "resource-1",
        },
      },
      create: {
        userId: "student-1",
        resourceId: "resource-1",
        completed: true,
        completedAt: expect.any(Date),
        lastViewedAt: expect.any(Date),
      },
      update: {
        completed: true,
        completedAt: expect.any(Date),
        lastViewedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({ status: "success", completed: true });
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(3);
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(
      1,
      "/dashboard/student",
    );
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(
      2,
      "/dashboard/student/content",
    );
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(
      3,
      "/dashboard/student/recent",
    );
  });

  it("allows correcting completion without deleting viewing history", async () => {
    const result = await setStudentResourceCompletedAction({
      resourceId: "resource-1",
      completed: false,
    });

    expect(mocks.progressUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          completed: false,
          completedAt: null,
        }),
      }),
    );
    expect(result).toEqual({ status: "success", completed: false });
  });

  it("does not write progress without active content access", async () => {
    mocks.getPremiumAccessDecision.mockResolvedValue({
      decision: { allowed: false, code: "SUBSCRIPTION_REQUIRED" },
    });

    const result = await setStudentResourceCompletedAction({
      resourceId: "resource-1",
      completed: true,
    });

    expect(result).toMatchObject({
      status: "error",
      code: "CONTENT_ACCESS_REQUIRED",
    });
    expect(mocks.resourceFindFirst).not.toHaveBeenCalled();
    expect(mocks.progressUpsert).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("validates input before authorization", async () => {
    const result = await recordStudentResourceViewedAction("");

    expect(result).toEqual({ status: "error", code: "INVALID_INPUT" });
    expect(mocks.requireRole).not.toHaveBeenCalled();
  });

  it("returns a recoverable error and does not revalidate after a database failure", async () => {
    mocks.progressUpsert.mockRejectedValue(new Error("database unavailable"));

    const result = await setStudentResourceCompletedAction({
      resourceId: "resource-1",
      completed: true,
    });

    expect(result).toMatchObject({
      status: "error",
      code: "PROGRESS_FAILED",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
