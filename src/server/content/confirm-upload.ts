import "server-only";

import {
  PublicationStatus,
  ResourceType,
  Role,
  UploadStatus,
} from "@/generated/prisma/enums";
import { requireRole } from "@/server/auth/guards";
import { normalizeResourceContentForStorage } from "@/modules/content/domain/resource-document";
import { ContentUploadError } from "@/server/content/upload-errors";
import { prisma } from "@/server/db/prisma";
import { syncResourceContentImages } from "@/server/content/content-image-references";
import {
  copyR2Object,
  deleteR2Object,
  headR2Object,
} from "@/server/storage/r2";

const MAX_CONFIRMATION_ATTEMPTS = 3;

function isPreconditionFailure(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "$metadata" in error &&
    (error as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode === 412
  );
}

function serializeResource(resource: {
  id: string;
  title: string;
  type: ResourceType;
  publicationStatus: PublicationStatus;
}) {
  return {
    id: resource.id,
    title: resource.title,
    type: resource.type,
    publicationStatus: resource.publicationStatus,
  };
}

export async function confirmContentUpload(uploadId: string) {
  const user = await requireRole([Role.COLLABORATOR, Role.ADMIN]);
  const existing = await prisma.uploadIntent.findUnique({
    where: { id: uploadId },
    include: { resource: true },
  });

  if (!existing) {
    throw new ContentUploadError(
      "UPLOAD_NOT_FOUND",
      "La carga no existe.",
      404,
    );
  }

  if (user.role !== Role.ADMIN && existing.createdById !== user.id) {
    throw new ContentUploadError(
      "UPLOAD_FORBIDDEN",
      "No puedes confirmar esta carga.",
      403,
    );
  }

  if (existing.resource) {
    return {
      state:
        existing.status === UploadStatus.CLEANUP_PENDING
          ? "CLEANUP_PENDING"
          : "CONFIRMED",
      resource: serializeResource(existing.resource),
    } as const;
  }

  if (existing.status === UploadStatus.PROCESSING) {
    return { state: "PROCESSING", resource: null } as const;
  }

  if (existing.expiresAt <= new Date()) {
    await prisma.uploadIntent.updateMany({
      where: { id: existing.id, status: { not: UploadStatus.CONFIRMED } },
      data: { status: UploadStatus.EXPIRED, failureCode: "UPLOAD_EXPIRED" },
    });
    throw new ContentUploadError(
      "UPLOAD_EXPIRED",
      "La URL de carga ya expiro.",
      410,
    );
  }

  const claimed = await prisma.uploadIntent.updateMany({
    where: {
      id: existing.id,
      status: { in: [UploadStatus.PENDING, UploadStatus.FAILED] },
      expiresAt: { gt: new Date() },
      attemptCount: { lt: MAX_CONFIRMATION_ATTEMPTS },
    },
    data: {
      status: UploadStatus.PROCESSING,
      processingStartedAt: new Date(),
      lastAttemptAt: new Date(),
      attemptCount: { increment: 1 },
      failureCode: null,
    },
  });

  if (claimed.count !== 1) {
    const current = await prisma.uploadIntent.findUnique({
      where: { id: existing.id },
      include: { resource: true },
    });

    if (current?.resource) {
      return {
        state: "CONFIRMED",
        resource: serializeResource(current.resource),
      } as const;
    }

    if (
      current?.status === UploadStatus.FAILED ||
      current?.status === UploadStatus.EXPIRED
    ) {
      throw new ContentUploadError(
        current.failureCode ?? "UPLOAD_CONFIRMATION_FAILED",
        "La carga no puede confirmarse en su estado actual.",
        current.status === UploadStatus.EXPIRED ? 410 : 409,
      );
    }

    return { state: "PROCESSING", resource: null } as const;
  }

  const intent = await prisma.uploadIntent.findUniqueOrThrow({
    where: { id: existing.id },
  });

  try {
    const head = await headR2Object(intent.temporaryStorageKey);
    const etag = head.ETag;
    const actualLength =
      head.ContentLength === undefined ? null : BigInt(head.ContentLength);

    if (!etag) {
      throw new ContentUploadError(
        "MISSING_ETAG",
        "R2 no devolvio el identificador del objeto.",
        409,
      );
    }

    if (
      actualLength !== intent.expectedSizeBytes ||
      head.ContentType !== intent.expectedMimeType
    ) {
      throw new ContentUploadError(
        "OBJECT_METADATA_MISMATCH",
        "El archivo cargado no coincide con la carga autorizada.",
        409,
      );
    }

    await prisma.uploadIntent.update({
      where: { id: intent.id },
      data: { temporaryObjectEtag: etag },
    });

    try {
      await copyR2Object({
        sourceKey: intent.temporaryStorageKey,
        destinationKey: intent.permanentStorageKey,
        sourceEtag: etag,
        contentType: intent.expectedMimeType,
        originalName: intent.originalName,
      });
    } catch (error) {
      if (isPreconditionFailure(error)) {
        throw new ContentUploadError(
          "SOURCE_OBJECT_CHANGED",
          "El archivo cambio durante la confirmacion.",
          409,
        );
      }
      throw error;
    }

    const now = new Date();
    const resource = await prisma.$transaction(async (tx) => {
      const created = await tx.resource.create({
        data: {
          id: intent.reservedResourceId,
          moduleId: intent.moduleId,
          uploadIntentId: intent.id,
          type: intent.resourceType,
          title: intent.title,
          instructions: intent.instructions,
          content: normalizeResourceContentForStorage(intent.content),
          estimatedMinutes: intent.estimatedMinutes,
          createdById: intent.createdById,
          publicationStatus: intent.targetPublicationStatus,
          submittedForReviewAt:
            intent.targetPublicationStatus === PublicationStatus.IN_REVIEW
              ? now
              : null,
          publishedById:
            intent.targetPublicationStatus === PublicationStatus.PUBLISHED
              ? intent.createdById
              : null,
          publishedAt:
            intent.targetPublicationStatus === PublicationStatus.PUBLISHED
              ? now
              : null,
          pdfResource:
            intent.resourceType === ResourceType.PDF
              ? {
                  create: {
                    storageKey: intent.permanentStorageKey,
                    originalName: intent.originalName,
                    mimeType: intent.expectedMimeType,
                    sizeBytes: intent.expectedSizeBytes,
                  },
                }
              : undefined,
          imageResource:
            intent.resourceType === ResourceType.IMAGE
              ? {
                  create: {
                    storageKey: intent.permanentStorageKey,
                    originalName: intent.originalName,
                    mimeType: intent.expectedMimeType,
                    sizeBytes: intent.expectedSizeBytes,
                    altText: intent.altText,
                  },
                }
              : undefined,
        },
      });

      await syncResourceContentImages(tx, {
        resourceId: created.id,
        editorSessionId: intent.editorSessionId,
        actorId: intent.createdById,
        content: intent.content,
        isNewResource: true,
      });

      await tx.uploadIntent.update({
        where: { id: intent.id },
        data: {
          status: UploadStatus.CONFIRMED,
          confirmedAt: new Date(),
          processingStartedAt: null,
          failureCode: null,
        },
      });

      return created;
    });

    try {
      await deleteR2Object(intent.temporaryStorageKey);
    } catch {
      await prisma.uploadIntent.update({
        where: { id: intent.id },
        data: {
          status: UploadStatus.CLEANUP_PENDING,
          failureCode: "TEMPORARY_DELETE_FAILED",
        },
      });

      return {
        state: "CLEANUP_PENDING",
        resource: serializeResource(resource),
      } as const;
    }

    return {
      state: "CONFIRMED",
      resource: serializeResource(resource),
    } as const;
  } catch (error) {
    const uploadError =
      error instanceof ContentUploadError
        ? error
        : new ContentUploadError(
            "UPLOAD_CONFIRMATION_FAILED",
            "No fue posible confirmar el archivo.",
            502,
          );

    await prisma.uploadIntent.updateMany({
      where: { id: intent.id, status: UploadStatus.PROCESSING },
      data: {
        status: UploadStatus.FAILED,
        processingStartedAt: null,
        failureCode: uploadError.code,
      },
    });

    throw uploadError;
  }
}
