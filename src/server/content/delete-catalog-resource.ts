import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import type { AdminResourceDeleteInput } from "@/modules/content/schemas/admin-resource-delete.schema";
import {
  catalogDeletionDependencyMessage,
  getLevelDeletionDependencyCounts,
  hasLevelDeletionDependencies,
} from "@/server/content/catalog-deletion-dependencies";
import { cleanupQueuedStorageObjects } from "@/server/content/cleanup-storage-objects";
import { prisma } from "@/server/db/prisma";
import { isR2UploadEnabled } from "@/server/storage/r2";

export type CatalogResourceDeletionErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "TITLE_MISMATCH"
  | "DEPENDENCY_BLOCKED"
  | "CONCURRENT_OPERATION";

export class CatalogResourceDeletionError extends Error {
  constructor(
    public readonly code: CatalogResourceDeletionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CatalogResourceDeletionError";
  }
}

const resourceDeletionSelect = {
  id: true,
  title: true,
  moduleId: true,
  module: {
    select: { subject: { select: { levelId: true } } },
  },
  uploadIntent: {
    select: {
      id: true,
      temporaryStorageKey: true,
      permanentStorageKey: true,
    },
  },
  pdfResource: { select: { storageKey: true } },
  fileResource: { select: { storageKey: true } },
  imageResource: { select: { storageKey: true } },
  audioResource: { select: { storageKey: true } },
  contentImages: {
    select: {
      contentImage: {
        select: {
          id: true,
          temporaryStorageKey: true,
          storageKey: true,
        },
      },
    },
  },
} satisfies Prisma.ResourceSelect;

type ResourceDeletionTarget = Prisma.ResourceGetPayload<{
  select: typeof resourceDeletionSelect;
}>;

function getDeletionAssets(target: ResourceDeletionTarget) {
  const storageKeys = new Set<string>();
  if (target.uploadIntent) {
    storageKeys.add(target.uploadIntent.temporaryStorageKey);
    storageKeys.add(target.uploadIntent.permanentStorageKey);
  }
  for (const stored of [
    target.pdfResource,
    target.fileResource,
    target.imageResource,
    target.audioResource,
  ]) {
    if (stored?.storageKey) storageKeys.add(stored.storageKey);
  }
  return {
    storageKeys: [...storageKeys],
    contentImageIds: target.contentImages.map(
      (reference) => reference.contentImage.id,
    ),
  };
}

export async function deleteCatalogResource(
  input: AdminResourceDeleteInput,
  actor: { id: string; role: Role },
): Promise<{ moduleId: string }> {
  if (actor.role !== Role.ADMIN) {
    throw new CatalogResourceDeletionError(
      "FORBIDDEN",
      "Solo un administrador puede eliminar recursos.",
    );
  }

  const initial = await prisma.resource.findUnique({
    where: { id: input.resourceId },
    select: { title: true },
  });
  if (!initial) {
    throw new CatalogResourceDeletionError(
      "NOT_FOUND",
      "El recurso ya no existe.",
    );
  }
  if (initial.title !== input.confirmationTitle) {
    throw new CatalogResourceDeletionError(
      "TITLE_MISMATCH",
      "El título de confirmación no coincide.",
    );
  }

  try {
    const deletion = await prisma.$transaction(
      async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "resource" WHERE "id" = ${input.resourceId} FOR UPDATE
        `;
        if (locked.length !== 1) {
          throw new CatalogResourceDeletionError(
            "NOT_FOUND",
            "El recurso ya no existe.",
          );
        }

        const target = await tx.resource.findUnique({
          where: { id: input.resourceId },
          select: resourceDeletionSelect,
        });
        if (!target) {
          throw new CatalogResourceDeletionError(
            "NOT_FOUND",
            "El recurso ya no existe.",
          );
        }
        if (target.title !== input.confirmationTitle) {
          throw new CatalogResourceDeletionError(
            "TITLE_MISMATCH",
            "El título de confirmación no coincide.",
          );
        }

        const dependencies = await getLevelDeletionDependencyCounts(
          tx,
          target.module.subject.levelId,
        );
        if (hasLevelDeletionDependencies(dependencies)) {
          throw new CatalogResourceDeletionError(
            "DEPENDENCY_BLOCKED",
            catalogDeletionDependencyMessage,
          );
        }

        const { storageKeys, contentImageIds } = getDeletionAssets(target);
        const deleted = await tx.resource.deleteMany({
          where: { id: target.id },
        });
        if (deleted.count !== 1) {
          throw new CatalogResourceDeletionError(
            "CONCURRENT_OPERATION",
            "El recurso cambió durante la eliminación. Inténtalo nuevamente.",
          );
        }
        if (target.uploadIntent) {
          await tx.uploadIntent.deleteMany({
            where: { id: target.uploadIntent.id },
          });
        }

        const orphanContentImages = contentImageIds.length
          ? await tx.contentImage.findMany({
              where: {
                id: { in: contentImageIds },
                resources: { none: {} },
              },
              select: {
                id: true,
                temporaryStorageKey: true,
                storageKey: true,
              },
            })
          : [];
        if (orphanContentImages.length) {
          await tx.contentImage.deleteMany({
            where: {
              id: { in: orphanContentImages.map(({ id }) => id) },
            },
          });
        }

        const queuedStorageKeys = isR2UploadEnabled()
          ? [
              ...new Set([
                ...storageKeys,
                ...orphanContentImages.flatMap((image) => [
                  image.temporaryStorageKey,
                  image.storageKey,
                ]),
              ]),
            ]
          : [];
        if (queuedStorageKeys.length) {
          await tx.storageObjectCleanup.createMany({
            data: queuedStorageKeys.map((storageKey) => ({ storageKey })),
            skipDuplicates: true,
          });
        }

        return { moduleId: target.moduleId, storageKeys: queuedStorageKeys };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 60_000,
      },
    );

    if (deletion.storageKeys.length) {
      await cleanupQueuedStorageObjects(deletion.storageKeys).catch((error) => {
        console.error("Deferred R2 cleanup could not start", error);
      });
    }
    return { moduleId: deletion.moduleId };
  } catch (error) {
    if (error instanceof CatalogResourceDeletionError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new CatalogResourceDeletionError(
        "CONCURRENT_OPERATION",
        "El recurso cambió durante la eliminación. Inténtalo nuevamente.",
      );
    }
    throw error;
  }
}
