import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicationStatus, Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  subjectFindUnique: vi.fn(),
  transaction: vi.fn(),
  lockSubject: vi.fn(),
  targetFindUnique: vi.fn(),
  deleteUploadIntents: vi.fn(),
  deleteSubject: vi.fn(),
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
    subject: {
      findUnique: mocks.subjectFindUnique,
    },
    subscription: { count: mocks.subscriptionCount },
    payment: { count: mocks.paymentCount },
    $transaction: mocks.transaction,
  },
}));

import {
  deleteCatalogSubject,
  getSubjectDeletionEligibility,
} from "@/server/content/delete-catalog-subject";

const actor = { id: "admin-1", role: Role.ADMIN };
const input = { subjectId: "subject-1", confirmationName: "Matemáticas" };

function target(status: PublicationStatus = PublicationStatus.DRAFT) {
  return {
    id: "subject-1",
    name: "Matemáticas",
    levelId: "level-1",
    modules: [
      {
        publicationStatus: status,
        uploadIntents: [
          {
            temporaryStorageKey: "pending/file.pdf",
            permanentStorageKey: "resources/file.pdf",
          },
        ],
        resources: [
          {
            pdfResource: { storageKey: "resources/file.pdf" },
            fileResource: null,
            imageResource: null,
            audioResource: null,
            contentImages: [
              {
                contentImage: {
                  id: "image-1",
                  temporaryStorageKey: "pending/image.png",
                  storageKey: "content/image.png",
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("deleteCatalogSubject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subjectFindUnique.mockResolvedValue({
      name: "Matemáticas",
    });
    mocks.lockSubject.mockResolvedValue([{ id: "subject-1" }]);
    mocks.targetFindUnique.mockResolvedValue(target());
    mocks.deleteUploadIntents.mockResolvedValue({ count: 1 });
    mocks.deleteSubject.mockResolvedValue({ count: 1 });
    mocks.findOrphanImages.mockResolvedValue([
      {
        id: "image-1",
        temporaryStorageKey: "pending/image.png",
        storageKey: "content/image.png",
      },
    ]);
    mocks.deleteContentImages.mockResolvedValue({ count: 1 });
    mocks.enqueueStorageCleanup.mockResolvedValue({ count: 4 });
    mocks.cleanupQueuedStorageObjects.mockResolvedValue({});
    mocks.isR2UploadEnabled.mockReturnValue(true);
    mocks.subscriptionCount.mockResolvedValue(0);
    mocks.paymentCount.mockResolvedValue(0);
    mocks.transaction.mockImplementation(
      async (operation: (client: unknown) => unknown) =>
        operation({
          $queryRaw: mocks.lockSubject,
          subject: {
            findUnique: mocks.targetFindUnique,
            deleteMany: mocks.deleteSubject,
          },
          uploadIntent: { deleteMany: mocks.deleteUploadIntents },
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

  it("deletes the subject hierarchy and queues its unreferenced objects", async () => {
    await expect(deleteCatalogSubject(input, actor)).resolves.toEqual({
      levelId: "level-1",
    });

    expect(mocks.deleteUploadIntents).toHaveBeenCalledWith({
      where: { module: { subjectId: "subject-1" } },
    });
    expect(mocks.deleteSubject).toHaveBeenCalledWith({
      where: { id: "subject-1" },
    });
    expect(mocks.enqueueStorageCleanup).toHaveBeenCalledWith({
      data: [
        { storageKey: "pending/file.pdf" },
        { storageKey: "resources/file.pdf" },
        { storageKey: "pending/image.png" },
        { storageKey: "content/image.png" },
      ],
      skipDuplicates: true,
    });
  });

  it("deletes the hierarchy even when a module is published", async () => {
    mocks.targetFindUnique.mockResolvedValueOnce(
      target(PublicationStatus.PUBLISHED),
    );

    await expect(deleteCatalogSubject(input, actor)).resolves.toEqual({
      levelId: "level-1",
    });
    expect(mocks.deleteSubject).toHaveBeenCalledOnce();
  });

  it("requires an exact name and an administrator", async () => {
    await expect(
      deleteCatalogSubject(
        { ...input, confirmationName: "Matematicas" },
        actor,
      ),
    ).rejects.toMatchObject({ code: "NAME_MISMATCH" });
    await expect(
      deleteCatalogSubject(input, { id: "collaborator-1", role: Role.COLLABORATOR }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reports module and resource counts used by the UI", async () => {
    mocks.subjectFindUnique.mockResolvedValueOnce({
      levelId: "level-1",
      modules: [
        {
          _count: { resources: 2 },
        },
        {
          _count: { resources: 3 },
        },
      ],
    });

    await expect(getSubjectDeletionEligibility("subject-1")).resolves.toEqual({
      moduleCount: 2,
      resourceCount: 5,
      activeSubscriptionCount: 0,
      unresolvedPaymentCount: 0,
      canDelete: true,
    });
  });

  it("blocks deletion when the parent level has an active subscription", async () => {
    mocks.subscriptionCount.mockResolvedValueOnce(1);

    await expect(deleteCatalogSubject(input, actor)).rejects.toMatchObject({
      code: "DEPENDENCY_BLOCKED",
    });
    expect(mocks.deleteSubject).not.toHaveBeenCalled();
  });
});
