import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteR2Object: vi.fn(),
  taskFindMany: vi.fn(),
  taskDeleteMany: vi.fn(),
  taskUpdateMany: vi.fn(),
  uploadFindFirst: vi.fn(),
  resourceFindFirst: vi.fn(),
  imageFindFirst: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/storage/r2", () => ({
  deleteR2Object: mocks.deleteR2Object,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    storageObjectCleanup: {
      findMany: mocks.taskFindMany,
      deleteMany: mocks.taskDeleteMany,
      updateMany: mocks.taskUpdateMany,
    },
    uploadIntent: { findFirst: mocks.uploadFindFirst },
    resource: { findFirst: mocks.resourceFindFirst },
    contentImage: { findFirst: mocks.imageFindFirst },
  },
}));

import { cleanupQueuedStorageObjects } from "@/server/content/cleanup-storage-objects";

describe("cleanupQueuedStorageObjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.taskFindMany.mockResolvedValue([
      { id: "task-1", storageKey: "modules/module-1/file.pdf" },
    ]);
    mocks.taskDeleteMany.mockResolvedValue({ count: 1 });
    mocks.taskUpdateMany.mockResolvedValue({ count: 1 });
    mocks.uploadFindFirst.mockResolvedValue(null);
    mocks.resourceFindFirst.mockResolvedValue(null);
    mocks.imageFindFirst.mockResolvedValue(null);
    mocks.deleteR2Object.mockResolvedValue(undefined);
  });

  it("deletes an unreferenced object and completes its durable task", async () => {
    await expect(cleanupQueuedStorageObjects()).resolves.toEqual({
      examined: 1,
      cleaned: 1,
      retained: 0,
      failed: 0,
    });
    expect(mocks.deleteR2Object).toHaveBeenCalledWith(
      "modules/module-1/file.pdf",
    );
    expect(mocks.taskDeleteMany).toHaveBeenCalledWith({
      where: { id: "task-1" },
    });
  });

  it("keeps a referenced object and removes only the cleanup task", async () => {
    mocks.resourceFindFirst.mockResolvedValue({ id: "resource-2" });

    await expect(cleanupQueuedStorageObjects()).resolves.toEqual({
      examined: 1,
      cleaned: 0,
      retained: 1,
      failed: 0,
    });
    expect(mocks.deleteR2Object).not.toHaveBeenCalled();
    expect(mocks.taskDeleteMany).toHaveBeenCalledOnce();
  });

  it("retains the task with failure details when R2 is unavailable", async () => {
    mocks.deleteR2Object.mockRejectedValue(new Error("R2 unavailable"));

    await expect(cleanupQueuedStorageObjects()).resolves.toEqual({
      examined: 1,
      cleaned: 0,
      retained: 0,
      failed: 1,
    });
    expect(mocks.taskUpdateMany).toHaveBeenCalledWith({
      where: { id: "task-1" },
      data: expect.objectContaining({
        attemptCount: { increment: 1 },
        lastAttemptAt: expect.any(Date),
        lastError: "R2 unavailable",
      }),
    });
  });
});
