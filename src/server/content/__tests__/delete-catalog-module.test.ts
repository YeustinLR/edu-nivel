import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ContentAudience,
  PublicationStatus,
  Role,
} from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  initialFindUnique: vi.fn(),
  archiveModule: vi.fn(),
  transaction: vi.fn(),
  lockModule: vi.fn(),
  targetFindUnique: vi.fn(),
  enqueueStorageCleanup: vi.fn(),
  deleteUploadIntents: vi.fn(),
  deleteModule: vi.fn(),
  deleteContentImages: vi.fn(),
  isR2UploadEnabled: vi.fn(),
  cleanupQueuedStorageObjects: vi.fn(),
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
    module: {
      findUnique: mocks.initialFindUnique,
      updateMany: mocks.archiveModule,
    },
    $transaction: mocks.transaction,
  },
}));

import { deleteCatalogModule } from "@/server/content/delete-catalog-module";

const actor = { id: "admin-1", role: Role.ADMIN };
const input = {
  moduleId: "module-1",
  confirmationTitle: "Números naturales",
};

function createTarget(
  overrides: Partial<{
    publicationStatus: PublicationStatus;
    isActive: boolean;
  }> = {},
) {
  return {
    id: "module-1",
    title: "Números naturales",
    subjectId: "subject-1",
    audience: ContentAudience.STUDENT,
    publicationStatus: PublicationStatus.DRAFT,
    isActive: false,
    uploadIntents: [
      {
        temporaryStorageKey: "temporary/module-1/file.pdf",
        permanentStorageKey: "modules/module-1/file.pdf",
      },
    ],
    resources: [
      {
        pdfResource: { storageKey: "modules/module-1/file.pdf" },
        fileResource: null,
        imageResource: { storageKey: "modules/module-1/image.png" },
        audioResource: null,
        contentImages: [],
      },
    ],
    ...overrides,
  };
}

describe("deleteCatalogModule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.initialFindUnique.mockResolvedValue({
      title: "Números naturales",
      publicationStatus: PublicationStatus.DRAFT,
    });
    mocks.archiveModule.mockResolvedValue({ count: 1 });
    mocks.lockModule.mockResolvedValue([{ id: "module-1" }]);
    mocks.targetFindUnique.mockResolvedValue(createTarget());
    mocks.enqueueStorageCleanup.mockResolvedValue({ count: 3 });
    mocks.deleteUploadIntents.mockResolvedValue({ count: 1 });
    mocks.deleteModule.mockResolvedValue({ count: 1 });
    mocks.deleteContentImages.mockResolvedValue({ count: 0 });
    mocks.isR2UploadEnabled.mockReturnValue(true);
    mocks.cleanupQueuedStorageObjects.mockResolvedValue({
      examined: 3,
      cleaned: 3,
      retained: 0,
      failed: 0,
    });
    mocks.transaction.mockImplementation(
      async (operation: (transactionClient: unknown) => unknown) =>
        operation({
          $queryRaw: mocks.lockModule,
          module: {
            findUnique: mocks.targetFindUnique,
            deleteMany: mocks.deleteModule,
          },
          uploadIntent: { deleteMany: mocks.deleteUploadIntents },
          contentImage: { deleteMany: mocks.deleteContentImages },
          storageObjectCleanup: { createMany: mocks.enqueueStorageCleanup },
        }),
    );
  });

  it("commits the deletion before processing its queued R2 objects", async () => {
    await expect(deleteCatalogModule(input, actor)).resolves.toEqual({
      subjectId: "subject-1",
      audience: ContentAudience.STUDENT,
    });

    expect(mocks.archiveModule).toHaveBeenCalledWith({
      where: {
        id: "module-1",
        publicationStatus: {
          in: ["DRAFT", "CHANGES_REQUESTED", "UNPUBLISHED"],
        },
      },
      data: { isActive: false },
    });
    expect(mocks.enqueueStorageCleanup).toHaveBeenCalledWith({
      data: [
        { storageKey: "temporary/module-1/file.pdf" },
        { storageKey: "modules/module-1/file.pdf" },
        { storageKey: "modules/module-1/image.png" },
      ],
      skipDuplicates: true,
    });
    expect(mocks.deleteUploadIntents).toHaveBeenCalledWith({
      where: { moduleId: "module-1" },
    });
    expect(mocks.deleteModule).toHaveBeenCalledOnce();
    expect(mocks.cleanupQueuedStorageObjects).toHaveBeenCalledWith([
      "temporary/module-1/file.pdf",
      "modules/module-1/file.pdf",
      "modules/module-1/image.png",
    ]);
  });

  it("rejects published modules before changing data or storage", async () => {
    mocks.initialFindUnique.mockResolvedValueOnce({
      title: "Números naturales",
      publicationStatus: PublicationStatus.PUBLISHED,
    });

    await expect(deleteCatalogModule(input, actor)).rejects.toMatchObject({
      code: "INVALID_STATE",
      message: "Despublica el módulo antes de eliminarlo.",
    });
    expect(mocks.archiveModule).not.toHaveBeenCalled();
    expect(mocks.cleanupQueuedStorageObjects).not.toHaveBeenCalled();
  });

  it("requires the exact module title before archiving it", async () => {
    await expect(
      deleteCatalogModule(
        { ...input, confirmationTitle: "Numeros naturales" },
        actor,
      ),
    ).rejects.toMatchObject({ code: "TITLE_MISMATCH" });
    expect(mocks.archiveModule).not.toHaveBeenCalled();
  });

  it("keeps the committed cleanup task when immediate processing cannot start", async () => {
    mocks.cleanupQueuedStorageObjects.mockRejectedValueOnce(
      new Error("R2 unavailable"),
    );

    await expect(deleteCatalogModule(input, actor)).resolves.toEqual({
      subjectId: "subject-1",
      audience: ContentAudience.STUDENT,
    });
    expect(mocks.enqueueStorageCleanup).toHaveBeenCalledOnce();
    expect(mocks.deleteModule).toHaveBeenCalledOnce();
  });

  it("does not start R2 cleanup when the database transaction rolls back", async () => {
    mocks.transaction.mockRejectedValueOnce(new Error("commit failed"));

    await expect(deleteCatalogModule(input, actor)).rejects.toThrow("commit failed");
    expect(mocks.cleanupQueuedStorageObjects).not.toHaveBeenCalled();
  });

  it("deletes database records without storage calls when R2 is disabled", async () => {
    mocks.isR2UploadEnabled.mockReturnValueOnce(false);

    await deleteCatalogModule(input, actor);

    expect(mocks.enqueueStorageCleanup).not.toHaveBeenCalled();
    expect(mocks.cleanupQueuedStorageObjects).not.toHaveBeenCalled();
    expect(mocks.deleteModule).toHaveBeenCalledOnce();
  });

  it("reserves permanent deletion for administrators", async () => {
    await expect(
      deleteCatalogModule(input, {
        id: "collaborator-1",
        role: Role.COLLABORATOR,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.initialFindUnique).not.toHaveBeenCalled();
  });
});
