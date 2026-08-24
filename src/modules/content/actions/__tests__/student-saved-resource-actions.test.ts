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
  savedUpsert: vi.fn(),
  savedDeleteMany: vi.fn(),
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
    savedResource: {
      upsert: mocks.savedUpsert,
      deleteMany: mocks.savedDeleteMany,
    },
  },
}));

import { setStudentResourceSavedAction } from "@/modules/content/actions/student-saved-resource-actions";

describe("setStudentResourceSavedAction", () => {
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
    mocks.savedUpsert.mockResolvedValue({ id: "saved-1" });
    mocks.savedDeleteMany.mockResolvedValue({ count: 1 });
  });

  it("rejects malformed input before authentication or database access", async () => {
    const result = await setStudentResourceSavedAction({
      resourceId: "",
      saved: true,
    });

    expect(result).toMatchObject({ status: "error", code: "INVALID_INPUT" });
    expect(mocks.requireRole).not.toHaveBeenCalled();
    expect(mocks.resourceFindFirst).not.toHaveBeenCalled();
  });

  it("does not inspect or mutate resources when level access is denied", async () => {
    mocks.getPremiumAccessDecision.mockResolvedValue({
      decision: { allowed: false, code: "SUBSCRIPTION_REQUIRED" },
    });

    const result = await setStudentResourceSavedAction({
      resourceId: "resource-1",
      saved: true,
    });

    expect(mocks.requireRole).toHaveBeenCalledWith(Role.STUDENT);
    expect(result).toMatchObject({
      status: "error",
      code: "CONTENT_ACCESS_REQUIRED",
    });
    expect(mocks.resourceFindFirst).not.toHaveBeenCalled();
    expect(mocks.savedUpsert).not.toHaveBeenCalled();
  });

  it("verifies the complete learner visibility tree before saving", async () => {
    const result = await setStudentResourceSavedAction({
      resourceId: "resource-1",
      saved: true,
    });

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
    expect(mocks.savedUpsert).toHaveBeenCalledWith({
      where: {
        userId_resourceId: {
          userId: "student-1",
          resourceId: "resource-1",
        },
      },
      create: { userId: "student-1", resourceId: "resource-1" },
      update: {},
    });
    expect(result).toEqual({ status: "success", saved: true });
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(2);
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(
      1,
      "/dashboard/student",
    );
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(
      2,
      "/dashboard/student/saved",
    );
  });

  it("removes a saved resource idempotently and only for the current student", async () => {
    const result = await setStudentResourceSavedAction({
      resourceId: "resource-1",
      saved: false,
    });

    expect(mocks.savedDeleteMany).toHaveBeenCalledWith({
      where: { userId: "student-1", resourceId: "resource-1" },
    });
    expect(mocks.savedUpsert).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "success", saved: false });
  });

  it("does not reveal whether an unavailable resource exists", async () => {
    mocks.resourceFindFirst.mockResolvedValue(null);

    const result = await setStudentResourceSavedAction({
      resourceId: "resource-private",
      saved: true,
    });

    expect(result).toMatchObject({
      status: "error",
      code: "RESOURCE_UNAVAILABLE",
    });
    expect(mocks.savedUpsert).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns a recoverable error and does not revalidate after a database failure", async () => {
    mocks.savedUpsert.mockRejectedValue(new Error("database unavailable"));

    const result = await setStudentResourceSavedAction({
      resourceId: "resource-1",
      saved: true,
    });

    expect(result).toMatchObject({ status: "error", code: "SAVE_FAILED" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
