import "server-only";

import { randomUUID } from "node:crypto";

import { ResourceType, Role, UploadStatus } from "@/generated/prisma/enums";
import {
  canCreateResource,
  canEditEditorialContent,
} from "@/modules/content/domain/content-permissions";
import {
  FilePolicyError,
  getFilePolicy,
} from "@/modules/content/domain/file-policy";
import type { CreateContentImageIntentInput } from "@/modules/content/schemas/content-image.schema";
import { requireRole } from "@/server/auth/guards";
import { ContentUploadError } from "@/server/content/upload-errors";
import { prisma } from "@/server/db/prisma";
import {
  copyR2Object,
  createPresignedUploadUrl,
  deleteR2Object,
  headR2Object,
  isR2UploadEnabled,
} from "@/server/storage/r2";

const MAX_CONFIRMATION_ATTEMPTS = 3;
const ORPHAN_TTL_MS = 24 * 60 * 60 * 1_000;

function isPreconditionFailure(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "$metadata" in error &&
    (error as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode === 412
  );
}

async function assertUploadContext(
  input: CreateContentImageIntentInput,
  user: { id: string; role: Role },
) {
  if (input.resourceId) {
    const resource = await prisma.resource.findUnique({
      where: { id: input.resourceId },
      select: { createdById: true, publicationStatus: true },
    });
    if (!resource) {
      throw new ContentUploadError("RESOURCE_NOT_FOUND", "El recurso ya no existe.", 404);
    }
    if (!canEditEditorialContent(user, resource)) {
      throw new ContentUploadError(
        "RESOURCE_NOT_EDITABLE",
        "No puedes agregar imágenes a este recurso en su estado actual.",
        403,
      );
    }
    return;
  }

  const moduleRecord = await prisma.module.findUnique({
    where: { id: input.moduleId! },
    select: {
      createdById: true,
      publicationStatus: true,
      isActive: true,
      subject: {
        select: { isActive: true, level: { select: { isActive: true } } },
      },
    },
  });
  if (
    !moduleRecord ||
    !moduleRecord.isActive ||
    !moduleRecord.subject.isActive ||
    !moduleRecord.subject.level.isActive
  ) {
    throw new ContentUploadError(
      "MODULE_NOT_AVAILABLE",
      "El módulo seleccionado no está disponible.",
      404,
    );
  }
  if (!canCreateResource(user, moduleRecord)) {
    throw new ContentUploadError(
      "MODULE_NOT_EDITABLE",
      "No puedes agregar contenido a este módulo.",
      403,
    );
  }
}

export async function createContentImageIntent(
  input: CreateContentImageIntentInput,
) {
  if (!isR2UploadEnabled()) {
    throw new ContentUploadError(
      "R2_UPLOADS_DISABLED",
      "Las cargas de imágenes no están habilitadas en este entorno.",
      503,
    );
  }
  const user = await requireRole([Role.COLLABORATOR, Role.ADMIN]);
  await assertUploadContext(input, user);
  let policy;
  try {
    policy = getFilePolicy(input.mimeType, input.sizeBytes, ResourceType.IMAGE);
  } catch (error) {
    if (error instanceof FilePolicyError) {
      throw new ContentUploadError(error.code, error.message, 400);
    }
    throw error;
  }
  const imageId = randomUUID();
  const objectId = randomUUID();
  const temporaryStorageKey = `pending/content-images/${imageId}/${objectId}.${policy.extension}`;
  const storageKey = `content-images/${imageId}/${objectId}.${policy.extension}`;
  const uploadExpiresAt = new Date(Date.now() + 10 * 60 * 1_000);

  const image = await prisma.contentImage.create({
    data: {
      id: imageId,
      createdById: user.id,
      editorSessionId: input.editorSessionId,
      temporaryStorageKey,
      storageKey,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: BigInt(input.sizeBytes),
      uploadExpiresAt,
    },
  });

  try {
    return {
      imageId: image.id,
      uploadUrl: await createPresignedUploadUrl({
        key: temporaryStorageKey,
        contentType: input.mimeType,
      }),
      expiresAt: image.uploadExpiresAt,
    };
  } catch (error) {
    await prisma.contentImage.delete({ where: { id: image.id } });
    throw error;
  }
}

export async function confirmContentImage(imageId: string) {
  const user = await requireRole([Role.COLLABORATOR, Role.ADMIN]);
  const existing = await prisma.contentImage.findUnique({ where: { id: imageId } });
  if (!existing) {
    throw new ContentUploadError("IMAGE_NOT_FOUND", "La imagen no existe.", 404);
  }
  if (user.role !== Role.ADMIN && existing.createdById !== user.id) {
    throw new ContentUploadError("IMAGE_FORBIDDEN", "No puedes confirmar esta imagen.", 403);
  }
  if (
    existing.status === UploadStatus.CONFIRMED ||
    existing.status === UploadStatus.CLEANUP_PENDING
  ) {
    return { state: "CONFIRMED", imageId: existing.id } as const;
  }
  if (existing.status === UploadStatus.PROCESSING) {
    return { state: "PROCESSING", imageId: existing.id } as const;
  }
  if (existing.uploadExpiresAt <= new Date()) {
    await prisma.contentImage.updateMany({
      where: { id: existing.id },
      data: { status: UploadStatus.EXPIRED, failureCode: "UPLOAD_EXPIRED" },
    });
    throw new ContentUploadError("UPLOAD_EXPIRED", "La carga de imagen expiró.", 410);
  }

  const claimed = await prisma.contentImage.updateMany({
    where: {
      id: existing.id,
      status: { in: [UploadStatus.PENDING, UploadStatus.FAILED] },
      attemptCount: { lt: MAX_CONFIRMATION_ATTEMPTS },
      uploadExpiresAt: { gt: new Date() },
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
    const current = await prisma.contentImage.findUnique({ where: { id: imageId } });
    if (
      current?.status === UploadStatus.CONFIRMED ||
      current?.status === UploadStatus.CLEANUP_PENDING
    ) {
      return { state: "CONFIRMED", imageId: current.id } as const;
    }
    if (current?.status === UploadStatus.PROCESSING) {
      return { state: "PROCESSING", imageId: current.id } as const;
    }
    throw new ContentUploadError(
      "IMAGE_CONFIRMATION_CONFLICT",
      "La imagen no puede confirmarse en su estado actual.",
      409,
    );
  }

  const image = await prisma.contentImage.findUniqueOrThrow({ where: { id: imageId } });
  try {
    const head = await headR2Object(image.temporaryStorageKey);
    if (
      !head.ETag ||
      head.ContentType !== image.mimeType ||
      head.ContentLength === undefined ||
      BigInt(head.ContentLength) !== image.sizeBytes
    ) {
      throw new ContentUploadError(
        "OBJECT_METADATA_MISMATCH",
        "La imagen cargada no coincide con la carga autorizada.",
        409,
      );
    }
    await copyR2Object({
      sourceKey: image.temporaryStorageKey,
      destinationKey: image.storageKey,
      sourceEtag: head.ETag,
      contentType: image.mimeType,
      originalName: image.originalName,
    });
    await prisma.contentImage.update({
      where: { id: image.id },
      data: {
        temporaryObjectEtag: head.ETag,
        status: UploadStatus.CONFIRMED,
        confirmedAt: new Date(),
        orphanExpiresAt: new Date(Date.now() + ORPHAN_TTL_MS),
        processingStartedAt: null,
        failureCode: null,
      },
    });

    try {
      await deleteR2Object(image.temporaryStorageKey);
    } catch {
      await prisma.contentImage.update({
        where: { id: image.id },
        data: {
          status: UploadStatus.CLEANUP_PENDING,
          failureCode: "TEMPORARY_DELETE_FAILED",
        },
      });
    }
    return { state: "CONFIRMED", imageId: image.id } as const;
  } catch (error) {
    const uploadError =
      error instanceof ContentUploadError
        ? error
        : isPreconditionFailure(error)
          ? new ContentUploadError(
              "SOURCE_OBJECT_CHANGED",
              "La imagen cambió durante la confirmación.",
              409,
            )
          : new ContentUploadError(
              "IMAGE_CONFIRMATION_FAILED",
              "No fue posible confirmar la imagen.",
              502,
            );
    await prisma.contentImage.updateMany({
      where: { id: image.id, status: UploadStatus.PROCESSING },
      data: {
        status: UploadStatus.FAILED,
        processingStartedAt: null,
        failureCode: uploadError.code,
      },
    });
    throw uploadError;
  }
}
