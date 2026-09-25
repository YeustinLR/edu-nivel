import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  initialFindUnique: vi.fn(),
  transaction: vi.fn(),
  lockResource: vi.fn(),
  targetFindUnique: vi.fn(),
  deleteResource: vi.fn(),
  deleteUploadIntent: vi.fn(),
  findOrphanImages: vi.fn(),
  deleteContentImages: vi.fn(),
  enqueueStorageCleanup: vi.fn(),
  cleanupQueuedStorageObjects: vi.fn(),
  isR2UploadEnabled: vi.fn(),
  subscriptionCount: vi.fn(),
  paymentCount: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/storage/r2", () => ({
  isR2UploadEnabled: mocks.isR2UploadEnabled,
}));
vi.mock("@/server/content/cleanup-storage-objects", () => ({
  cleanupQueuedStorageObjects: mocks.cleanupQueuedStorageObjects,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    resource: { findUnique: mocks.initialFindUnique },
    $transaction: mocks.transaction,
  },
}));

import { deleteCatalogResource } from "@/server/content/delete-catalog-resource";

const actor = { id: "admin-1", role: Role.ADMIN };
const input = {
  resourceId: "resource-1",
  confirmationTitle: "Guía de números naturales",
};

function target() {
  return {
    id: "resource-1",
    title: "Guía de números naturales",
    moduleId: "module-1",
    module: { subject: { levelId: "level-1" } },
    uploadIntent: {
      id: "upload-1",
      temporaryStorageKey: "temporary/resource-1/guide.pdf",
      permanentStorageKey: "resources/resource-1/guide.pdf",
    },
    pdfResource: { storageKey: "resources/resource-1/guide.pdf" },
    fileResource: null,
    imageResource: null,
    audioResource: null,
    contentImages: [
      {
        contentImage: {
          id: "image-1",
          temporaryStorageKey: "temporary/resource-1/image.png",
          storageKey: "content/resource-1/image.png",
        },
      },
    ],
  };
}

describe("deleteCatalogResource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.initialFindUnique.mockResolvedValue({
      title: "Guía de números naturales",
    });
    mocks.lockResource.mockResolvedValue([{ id: "resource-1" }]);
    mocks.targetFindUnique.mockResolvedValue(target());
    mocks.deleteResource.mockResolvedValue({ count: 1 });
    mocks.deleteUploadIntent.mockResolvedValue({ count: 1 });
    mocks.findOrphanImages.mockResolvedValue([
      {
        id: "image-1",
        temporaryStorageKey: "temporary/resource-1/image.png",
        storageKey: "content/resource-1/image.png",
      },
    ]);
    mocks.deleteContentImages.mockResolvedValue({ count: 1 });
    mocks.enqueueStorageCleanup.mockResolvedValue({ count: 4 });
    mocks.cleanupQueuedStorageObjects.mockResolvedValue({});
    mocks.isR2UploadEnabled.mockReturnValue(true);
    mocks.subscriptionCount.mockResolvedValue(0);
    mocks.paymentCount.mockResolvedValue(0);
    mocks.transaction.mockImplementation(
      async (operation: (transactionClient: unknown) => unknown) =>
        operation({
          $queryRaw: mocks.lockResource,
          resource: {
            findUnique: mocks.targetFindUnique,
            deleteMany: mocks.deleteResource,
          },
          uploadIntent: { deleteMany: mocks.deleteUploadIntent },
          contentImage: {
            findMany: mocks.findOrphanImages,
            deleteMany: mocks.deleteContentImages,
          },
          storageObjectCleanup: { createMany: mocks.enqueueStorageCleanup },
          subscription: { count: mocks.subscriptionCount },
          payment: { count: mocks.paymentCount },
        }),
    );
  });

  it("deletes the resource and queues only its unreferenced files", async () => {
    await expect(deleteCatalogResource(input, actor)).resolves.toEqual({
      moduleId: "module-1",
    });

    expect(mocks.deleteResource).toHaveBeenCalledWith({
      where: { id: "resource-1" },
    });
    expect(mocks.deleteUploadIntent).toHaveBeenCalledWith({
      where: { id: "upload-1" },
    });
    expect(mocks.enqueueStorageCleanup).toHaveBeenCalledWith({
      data: [
        { storageKey: "temporary/resource-1/guide.pdf" },
        { storageKey: "resources/resource-1/guide.pdf" },
        { storageKey: "temporary/resource-1/image.png" },
        { storageKey: "content/resource-1/image.png" },
      ],
      skipDuplicates: true,
    });
  });

  it("requires the exact resource title and an administrator", async () => {
    await expect(
      deleteCatalogResource(
        { ...input, confirmationTitle: "Guia de números naturales" },
        actor,
      ),
    ).rejects.toMatchObject({ code: "TITLE_MISMATCH" });
    await expect(
      deleteCatalogResource(input, {
        id: "collaborator-1",
        role: Role.COLLABORATOR,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks deletion when the parent level has an unresolved payment", async () => {
    mocks.paymentCount.mockResolvedValueOnce(1);

    await expect(deleteCatalogResource(input, actor)).rejects.toMatchObject({
      code: "DEPENDENCY_BLOCKED",
    });
    expect(mocks.deleteResource).not.toHaveBeenCalled();
  });

  it("keeps the committed cleanup task if immediate R2 cleanup fails", async () => {
    mocks.cleanupQueuedStorageObjects.mockRejectedValueOnce(
      new Error("R2 unavailable"),
    );

    await expect(deleteCatalogResource(input, actor)).resolves.toEqual({
      moduleId: "module-1",
    });
    expect(mocks.enqueueStorageCleanup).toHaveBeenCalledOnce();
  });
});
