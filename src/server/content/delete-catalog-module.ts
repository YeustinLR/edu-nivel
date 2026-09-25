import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { ContentAudience, Role } from "@/generated/prisma/enums";
import type { AdminModuleDeleteInput } from "@/modules/content/schemas/admin-module-delete.schema";
import {
  catalogDeletionDependencyMessage,
  getLevelDeletionDependencyCounts,
  hasLevelDeletionDependencies,
} from "@/server/content/catalog-deletion-dependencies";
import { cleanupQueuedStorageObjects } from "@/server/content/cleanup-storage-objects";
import { prisma } from "@/server/db/prisma";
import { isR2UploadEnabled } from "@/server/storage/r2";

export type CatalogModuleDeletionErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "TITLE_MISMATCH"
  | "DEPENDENCY_BLOCKED"
  | "CONCURRENT_OPERATION";

export class CatalogModuleDeletionError extends Error {
  constructor(
    public readonly code: CatalogModuleDeletionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CatalogModuleDeletionError";
  }
}

const moduleDeletionSelect = {
  id: true,
  title: true,
  subjectId: true,
  subject: { select: { levelId: true } },
  audience: true,
  uploadIntents: {
    select: {
      temporaryStorageKey: true,
      permanentStorageKey: true,
    },
  },
  resources: {
    select: {
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
    },
  },
} satisfies Prisma.ModuleSelect;

type DeletionTarget = Prisma.ModuleGetPayload<{
  select: typeof moduleDeletionSelect;
}>;

function getStorageKeys(target: DeletionTarget) {
  const keys = new Set<string>();

  for (const intent of target.uploadIntents) {
    keys.add(intent.temporaryStorageKey);
    keys.add(intent.permanentStorageKey);
  }

  for (const resource of target.resources) {
    const storedResources = [
      resource.pdfResource,
      resource.fileResource,
      resource.imageResource,
      resource.audioResource,
    ];
    for (const stored of storedResources) {
      if (stored?.storageKey) keys.add(stored.storageKey);
    }
    for (const reference of resource.contentImages) {
      keys.add(reference.contentImage.temporaryStorageKey);
      keys.add(reference.contentImage.storageKey);
    }
  }

  return [...keys];
}

export async function deleteCatalogModule(
  input: AdminModuleDeleteInput,
  actor: { id: string; role: Role },
): Promise<{ subjectId: string; audience: ContentAudience }> {
  if (actor.role !== Role.ADMIN) {
    throw new CatalogModuleDeletionError(
      "FORBIDDEN",
      "Solo un administrador puede eliminar módulos.",
    );
  }

  const initial = await prisma.module.findUnique({
    where: { id: input.moduleId },
    select: { title: true },
  });
  if (!initial) {
    throw new CatalogModuleDeletionError(
      "NOT_FOUND",
      "El módulo ya no existe.",
    );
  }
  if (initial.title !== input.confirmationTitle) {
    throw new CatalogModuleDeletionError(
      "TITLE_MISMATCH",
      "El título de confirmación no coincide.",
    );
  }

  try {
    const deletion = await prisma.$transaction(
      async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "module" WHERE "id" = ${input.moduleId} FOR UPDATE
        `;
        if (locked.length !== 1) {
          throw new CatalogModuleDeletionError(
            "NOT_FOUND",
            "El módulo ya no existe.",
          );
        }

        const target = await tx.module.findUnique({
          where: { id: input.moduleId },
          select: moduleDeletionSelect,
        });
        if (!target) {
          throw new CatalogModuleDeletionError(
            "NOT_FOUND",
            "El módulo ya no existe.",
          );
        }
        if (target.title !== input.confirmationTitle) {
          throw new CatalogModuleDeletionError(
            "TITLE_MISMATCH",
            "El título de confirmación no coincide.",
          );
        }
        const dependencies = await getLevelDeletionDependencyCounts(
          tx,
          target.subject.levelId,
        );
        if (hasLevelDeletionDependencies(dependencies)) {
          throw new CatalogModuleDeletionError(
            "DEPENDENCY_BLOCKED",
            catalogDeletionDependencyMessage,
          );
        }

        const storageKeys = isR2UploadEnabled() ? getStorageKeys(target) : [];
        if (storageKeys.length) {
          await tx.storageObjectCleanup.createMany({
            data: storageKeys.map((storageKey) => ({ storageKey })),
            skipDuplicates: true,
          });
        }
        await tx.uploadIntent.deleteMany({
          where: { moduleId: target.id },
        });
        const deleted = await tx.module.deleteMany({
          where: { id: target.id },
        });
        if (deleted.count !== 1) {
          throw new CatalogModuleDeletionError(
            "CONCURRENT_OPERATION",
            "El módulo cambió durante la eliminación. Inténtalo nuevamente.",
          );
        }

        const contentImageIds = target.resources.flatMap((resource) =>
          resource.contentImages.map((reference) => reference.contentImage.id),
        );
        if (contentImageIds.length) {
          await tx.contentImage.deleteMany({
            where: {
              id: { in: contentImageIds },
              resources: { none: {} },
            },
          });
        }

        return {
          result: {
            subjectId: target.subjectId,
            audience: target.audience,
          },
          storageKeys,
        };
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
    return deletion.result;
  } catch (error) {
    if (error instanceof CatalogModuleDeletionError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new CatalogModuleDeletionError(
        "CONCURRENT_OPERATION",
        "El módulo cambió durante la eliminación. Inténtalo nuevamente.",
      );
    }
    throw error;
  }
}
