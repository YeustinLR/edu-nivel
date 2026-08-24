import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PublicationStatus,
  ResourceType,
  Role,
  UploadStatus,
} from "@/generated/prisma/enums";
import { normalizeResourceContentForStorage } from "@/modules/content/domain/resource-document";

const {
  copyMock,
  deleteMock,
  headMock,
  requireRoleMock,
  transactionMock,
  uploadFindUniqueMock,
  uploadFindUniqueOrThrowMock,
  uploadUpdateManyMock,
  uploadUpdateMock,
  txResourceCreateMock,
  txUploadUpdateMock,
} = vi.hoisted(() => ({
  copyMock: vi.fn(),
  deleteMock: vi.fn(),
  headMock: vi.fn(),
  requireRoleMock: vi.fn(),
  transactionMock: vi.fn(),
  uploadFindUniqueMock: vi.fn(),
  uploadFindUniqueOrThrowMock: vi.fn(),
  uploadUpdateManyMock: vi.fn(),
  uploadUpdateMock: vi.fn(),
  txResourceCreateMock: vi.fn(),
  txUploadUpdateMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({ requireRole: requireRoleMock }));
vi.mock("@/server/storage/r2", () => ({
  copyR2Object: copyMock,
  deleteR2Object: deleteMock,
  headR2Object: headMock,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    uploadIntent: {
      findUnique: uploadFindUniqueMock,
      findUniqueOrThrow: uploadFindUniqueOrThrowMock,
      updateMany: uploadUpdateManyMock,
      update: uploadUpdateMock,
    },
    $transaction: transactionMock,
  },
}));

import { confirmContentUpload } from "@/server/content/confirm-upload";

const intent = {
  id: "upload_1",
  createdById: "collaborator_1",
  moduleId: "module_1",
  reservedResourceId: "resource_1",
  resourceType: ResourceType.PDF,
  targetPublicationStatus: PublicationStatus.DRAFT,
  title: "Guía",
  instructions: "Resuelve los ejercicios después de leer",
  content: "Contenido de la guía",
  estimatedMinutes: 10,
  originalName: "guia.pdf",
  altText: null,
  temporaryStorageKey: "pending/upload_1/file.pdf",
  permanentStorageKey: "resources/resource_1/file.pdf",
  expectedMimeType: "application/pdf",
  expectedSizeBytes: BigInt(1_024),
  temporaryObjectEtag: null,
  status: UploadStatus.PENDING,
  expiresAt: new Date(Date.now() + 60_000),
  confirmedAt: null,
  processingStartedAt: null,
  cleanupLeaseUntil: null,
  attemptCount: 0,
  lastAttemptAt: null,
  failureCode: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("confirmContentUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRoleMock.mockResolvedValue({
      id: "admin_1",
      role: Role.ADMIN,
    });
    uploadFindUniqueMock.mockResolvedValue({ ...intent, resource: null });
    uploadFindUniqueOrThrowMock.mockResolvedValue(intent);
    uploadUpdateManyMock.mockResolvedValue({ count: 1 });
    uploadUpdateMock.mockResolvedValue(intent);
    headMock.mockResolvedValue({
      ETag: '"etag-a"',
      ContentLength: 1_024,
      ContentType: "application/pdf",
    });
    copyMock.mockResolvedValue({});
    deleteMock.mockResolvedValue(undefined);
    txResourceCreateMock.mockResolvedValue({
      id: "resource_1",
      title: "Guía",
      type: ResourceType.PDF,
      publicationStatus: PublicationStatus.DRAFT,
    });
    txUploadUpdateMock.mockResolvedValue(intent);
    transactionMock.mockImplementation((callback) =>
      callback({
        resource: { create: txResourceCreateMock },
        uploadIntent: { update: txUploadUpdateMock },
      }),
    );
  });

  it("confirma una carga y crea un solo recurso en borrador", async () => {
    await expect(confirmContentUpload(intent.id)).resolves.toMatchObject({
      state: "CONFIRMED",
      resource: { id: intent.reservedResourceId },
    });
    expect(copyMock).toHaveBeenCalledWith(
      expect.objectContaining({ sourceEtag: '"etag-a"' }),
    );
    expect(txResourceCreateMock).toHaveBeenCalledTimes(1);
    expect(txResourceCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        instructions: "Resuelve los ejercicios después de leer",
        content: normalizeResourceContentForStorage("Contenido de la guía"),
        estimatedMinutes: 10,
      }),
    });
  });

  it.each([
    [PublicationStatus.PUBLISHED, "publishedAt"],
    [PublicationStatus.IN_REVIEW, "submittedForReviewAt"],
  ] as const)(
    "crea el recurso con estado objetivo %s",
    async (targetPublicationStatus, timestampField) => {
      const targetedIntent = { ...intent, targetPublicationStatus };
      uploadFindUniqueMock.mockResolvedValue({
        ...targetedIntent,
        resource: null,
      });
      uploadFindUniqueOrThrowMock.mockResolvedValue(targetedIntent);
      txResourceCreateMock.mockResolvedValue({
        id: "resource_1",
        title: "Guía",
        type: ResourceType.PDF,
        publicationStatus: targetPublicationStatus,
      });

      await confirmContentUpload(intent.id);

      expect(txResourceCreateMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          publicationStatus: targetPublicationStatus,
          [timestampField]: expect.any(Date),
        }),
      });
    },
  );

  it("rechaza la copia cuando el objeto cambia después de HEAD", async () => {
    copyMock.mockRejectedValue({
      $metadata: { httpStatusCode: 412 },
    });

    await expect(confirmContentUpload(intent.id)).rejects.toMatchObject({
      code: "SOURCE_OBJECT_CHANGED",
      status: 409,
    });
    expect(transactionMock).not.toHaveBeenCalled();
    expect(uploadUpdateManyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: UploadStatus.FAILED,
          failureCode: "SOURCE_OBJECT_CHANGED",
        }),
      }),
    );
  });

  it("devuelve el recurso existente sin repetir operaciones R2", async () => {
    uploadFindUniqueMock.mockResolvedValue({
      ...intent,
      status: UploadStatus.CONFIRMED,
      resource: {
        id: "resource_1",
        title: "Guía",
        type: ResourceType.PDF,
        publicationStatus: PublicationStatus.DRAFT,
      },
    });

    await expect(confirmContentUpload(intent.id)).resolves.toMatchObject({
      state: "CONFIRMED",
      resource: { id: "resource_1" },
    });
    expect(headMock).not.toHaveBeenCalled();
    expect(copyMock).not.toHaveBeenCalled();
  });
});
