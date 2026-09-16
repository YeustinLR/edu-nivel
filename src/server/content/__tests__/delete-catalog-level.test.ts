import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  levelFindUnique: vi.fn(),
  queryRaw: vi.fn(),
  subscriptionCount: vi.fn(),
  paymentCount: vi.fn(),
  notificationRecipientUpdateMany: vi.fn(),
  subscriptionDeleteMany: vi.fn(),
  uploadIntentDeleteMany: vi.fn(),
  levelDeleteMany: vi.fn(),
  contentImageFindMany: vi.fn(),
  contentImageDeleteMany: vi.fn(),
  storageObjectCleanupCreateMany: vi.fn(),
  cleanupQueuedStorageObjects: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/storage/r2", () => ({ isR2UploadEnabled: () => false }));
vi.mock("@/server/content/cleanup-storage-objects", () => ({
  cleanupQueuedStorageObjects: mocks.cleanupQueuedStorageObjects,
}));
vi.mock("@/server/db/prisma", () => {
  const tx = {
    $queryRaw: mocks.queryRaw,
    level: {
      findUnique: mocks.levelFindUnique,
      deleteMany: mocks.levelDeleteMany,
    },
    notificationRecipient: {
      updateMany: mocks.notificationRecipientUpdateMany,
    },
    subscription: {
      count: mocks.subscriptionCount,
      deleteMany: mocks.subscriptionDeleteMany,
    },
    payment: { count: mocks.paymentCount },
    uploadIntent: { deleteMany: mocks.uploadIntentDeleteMany },
    contentImage: {
      findMany: mocks.contentImageFindMany,
      deleteMany: mocks.contentImageDeleteMany,
    },
    storageObjectCleanup: {
      createMany: mocks.storageObjectCleanupCreateMany,
    },
  };
  return {
    prisma: {
      level: { findUnique: mocks.levelFindUnique },
      subscription: { count: mocks.subscriptionCount },
      payment: { count: mocks.paymentCount },
      $transaction: vi.fn((operation: (client: typeof tx) => unknown) =>
        operation(tx),
      ),
    },
  };
});

import {
  CatalogLevelDeletionError,
  deleteCatalogLevel,
  getLevelDeletionEligibility,
} from "@/server/content/delete-catalog-level";

const actor = { id: "admin-1", role: Role.ADMIN };
const input = { levelId: "level-7", confirmationLabel: "Nivel 7" };

describe("deleteCatalogLevel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.levelFindUnique
      .mockResolvedValueOnce({ levelNumber: 7 })
      .mockResolvedValueOnce({
        id: "level-7",
        levelNumber: 7,
        subjects: [],
        subscriptions: [{ id: "subscription-1" }],
      });
    mocks.queryRaw.mockResolvedValue([{ id: "level-7" }]);
    mocks.subscriptionCount.mockResolvedValue(0);
    mocks.paymentCount.mockResolvedValue(0);
    mocks.levelDeleteMany.mockResolvedValue({ count: 1 });
  });

  it("removes inactive subscriptions and deletes an eligible level", async () => {
    await expect(deleteCatalogLevel(input, actor)).resolves.toBeUndefined();

    expect(mocks.notificationRecipientUpdateMany).toHaveBeenCalledWith({
      where: { subscriptionId: { in: ["subscription-1"] } },
      data: { subscriptionId: null },
    });
    expect(mocks.subscriptionDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["subscription-1"] } },
    });
    expect(mocks.levelDeleteMany).toHaveBeenCalledWith({
      where: { id: "level-7" },
    });
  });

  it.each([
    [1, 0, "a current subscription"],
    [0, 1, "an unresolved payment"],
  ])("blocks deletion when the level has %s subscription(s) and %s payment(s): %s", async (subscriptions, payments) => {
    mocks.subscriptionCount.mockResolvedValue(subscriptions);
    mocks.paymentCount.mockResolvedValue(payments);

    await expect(deleteCatalogLevel(input, actor)).rejects.toMatchObject({
      code: "DEPENDENCY_BLOCKED",
    });
    expect(mocks.subscriptionDeleteMany).not.toHaveBeenCalled();
    expect(mocks.levelDeleteMany).not.toHaveBeenCalled();
  });

  it("reports the dependencies used to disable deletion in the UI", async () => {
    mocks.subscriptionCount.mockResolvedValue(2);
    mocks.paymentCount.mockResolvedValue(1);

    await expect(
      getLevelDeletionEligibility("level-7", new Date("2026-09-16T12:00:00.000Z")),
    ).resolves.toEqual({
      activeSubscriptionCount: 2,
      unresolvedPaymentCount: 1,
      canDelete: false,
    });
  });

  it("requires the exact level label", async () => {
    await expect(
      deleteCatalogLevel(
        { ...input, confirmationLabel: "7" },
        actor,
      ),
    ).rejects.toBeInstanceOf(CatalogLevelDeletionError);
    expect(mocks.levelDeleteMany).not.toHaveBeenCalled();
  });

  it("only permits administrators", async () => {
    await expect(
      deleteCatalogLevel(input, { id: "user-1", role: Role.COLLABORATOR }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.levelFindUnique).not.toHaveBeenCalled();
  });
});
