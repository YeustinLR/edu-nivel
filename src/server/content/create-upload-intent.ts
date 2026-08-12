import "server-only";

import { randomUUID } from "node:crypto";

import { ResourceType, Role } from "@/generated/prisma/enums";
import { getResourceCreationStatus } from "@/modules/content/domain/content-creation";
import { canCreateResource } from "@/modules/content/domain/content-permissions";
import {
  FilePolicyError,
  getFilePolicy,
} from "@/modules/content/domain/file-policy";
import type { CreateUploadIntentInput } from "@/modules/content/schemas/upload-intent.schema";
import { requireRole } from "@/server/auth/guards";
import { ContentUploadError } from "@/server/content/upload-errors";
import { prisma } from "@/server/db/prisma";
import {
  createPresignedUploadUrl,
  isR2UploadEnabled,
} from "@/server/storage/r2";

export async function createContentUploadIntent(
  input: CreateUploadIntentInput,
) {
  if (!isR2UploadEnabled()) {
    throw new ContentUploadError(
      "R2_UPLOADS_DISABLED",
      "Las cargas de archivos no estan habilitadas en este entorno.",
      503,
    );
  }

  const user = await requireRole([Role.COLLABORATOR, Role.ADMIN]);
  const targetPublicationStatus = getResourceCreationStatus(
    user.role,
    input.disposition,
  );
  if (!targetPublicationStatus) {
    throw new ContentUploadError(
      "INVALID_DISPOSITION",
      "La acción de creación no está permitida para tu rol.",
      403,
    );
  }
  const resourceType =
    input.resourceType === "PDF" ? ResourceType.PDF : ResourceType.IMAGE;
  let policy;
  try {
    policy = getFilePolicy(input.mimeType, input.sizeBytes, resourceType);
  } catch (error) {
    if (error instanceof FilePolicyError) {
      throw new ContentUploadError(error.code, error.message, 400);
    }
    throw error;
  }
  const moduleRecord = await prisma.module.findUnique({
    where: { id: input.moduleId },
    include: {
      subject: {
        select: {
          isActive: true,
          level: { select: { isActive: true } },
        },
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
      "El modulo seleccionado no esta disponible.",
      404,
    );
  }

  if (
    !canCreateResource(user, {
      createdById: moduleRecord.createdById,
      publicationStatus: moduleRecord.publicationStatus,
    })
  ) {
    throw new ContentUploadError(
      "MODULE_NOT_EDITABLE",
      "No puedes agregar recursos a este modulo.",
      403,
    );
  }

  const uploadId = randomUUID();
  const reservedResourceId = randomUUID();
  const objectId = randomUUID();
  const temporaryStorageKey = `pending/${uploadId}/${objectId}.${policy.extension}`;
  const permanentStorageKey = `resources/${reservedResourceId}/${objectId}.${policy.extension}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1_000);

  const intent = await prisma.uploadIntent.create({
    data: {
      id: uploadId,
      createdById: user.id,
      moduleId: moduleRecord.id,
      reservedResourceId,
      resourceType,
      targetPublicationStatus,
      title: input.title,
      description: input.description || null,
      originalName: input.originalName,
      altText: input.altText || null,
      temporaryStorageKey,
      permanentStorageKey,
      expectedMimeType: input.mimeType,
      expectedSizeBytes: BigInt(input.sizeBytes),
      expiresAt,
    },
  });

  try {
    const uploadUrl = await createPresignedUploadUrl({
      key: temporaryStorageKey,
      contentType: input.mimeType,
    });

    return {
      uploadId: intent.id,
      uploadUrl,
      expiresAt: intent.expiresAt,
    };
  } catch (error) {
    await prisma.uploadIntent.delete({ where: { id: intent.id } });
    throw error;
  }
}
