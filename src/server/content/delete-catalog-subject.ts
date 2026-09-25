import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import type { AdminSubjectDeleteInput } from "@/modules/content/schemas/admin-subject-delete.schema";
import {
  catalogDeletionDependencyMessage,
  getLevelDeletionDependencyCounts,
  hasLevelDeletionDependencies,
} from "@/server/content/catalog-deletion-dependencies";
import { cleanupQueuedStorageObjects } from "@/server/content/cleanup-storage-objects";
import { prisma } from "@/server/db/prisma";
import { isR2UploadEnabled } from "@/server/storage/r2";

export type CatalogSubjectDeletionErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "NAME_MISMATCH"
  | "DEPENDENCY_BLOCKED"
  | "CONCURRENT_OPERATION";

export class CatalogSubjectDeletionError extends Error {
  constructor(
    public readonly code: CatalogSubjectDeletionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CatalogSubjectDeletionError";
  }
}

const subjectDeletionSelect = {
  id: true,
  name: true,
  levelId: true,
  modules: {
    select: {
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
    },
  },
} satisfies Prisma.SubjectSelect;

type SubjectDeletionTarget = Prisma.SubjectGetPayload<{
  select: typeof subjectDeletionSelect;
}>;

function getDeletionAssets(target: SubjectDeletionTarget) {
  const storageKeys = new Set<string>();
  const contentImageIds = new Set<string>();

  for (const moduleRecord of target.modules) {
    for (const intent of moduleRecord.uploadIntents) {
      storageKeys.add(intent.temporaryStorageKey);
      storageKeys.add(intent.permanentStorageKey);
    }
    for (const resource of moduleRecord.resources) {
      for (const stored of [
        resource.pdfResource,
        resource.fileResource,
        resource.imageResource,
        resource.audioResource,
      ]) {
        if (stored?.storageKey) storageKeys.add(stored.storageKey);
      }
      for (const reference of resource.contentImages) {
        contentImageIds.add(reference.contentImage.id);
      }
    }
  }

  return {
    storageKeys: [...storageKeys],
    contentImageIds: [...contentImageIds],
  };
}

export type SubjectDeletionEligibility = {
  moduleCount: number;
  resourceCount: number;
  activeSubscriptionCount: number;
  unresolvedPaymentCount: number;
  canDelete: boolean;
};

export async function getSubjectDeletionEligibility(
  subjectId: string,
): Promise<SubjectDeletionEligibility> {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      levelId: true,
      modules: {
        select: {
          _count: { select: { resources: true } },
        },
      },
    },
  });
  const modules = subject?.modules ?? [];
  const dependencies = subject
    ? await getLevelDeletionDependencyCounts(prisma, subject.levelId)
    : { activeSubscriptionCount: 0, unresolvedPaymentCount: 0 };

  return {
    moduleCount: modules.length,
    resourceCount: modules.reduce(
      (total, moduleRecord) => total + moduleRecord._count.resources,
      0,
    ),
    ...dependencies,
    canDelete: !hasLevelDeletionDependencies(dependencies),
  };
}

export async function deleteCatalogSubject(
  input: AdminSubjectDeleteInput,
  actor: { id: string; role: Role },
): Promise<{ levelId: string }> {
  if (actor.role !== Role.ADMIN) {
    throw new CatalogSubjectDeletionError(
      "FORBIDDEN",
      "Solo un administrador puede eliminar materias.",
    );
  }

  const initial = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    select: { name: true },
  });
  if (!initial) {
    throw new CatalogSubjectDeletionError(
      "NOT_FOUND",
      "La materia ya no existe.",
    );
  }
  if (initial.name !== input.confirmationName) {
    throw new CatalogSubjectDeletionError(
      "NAME_MISMATCH",
      "El nombre de confirmación no coincide.",
    );
  }

  try {
    const deletion = await prisma.$transaction(
      async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "subject" WHERE "id" = ${input.subjectId} FOR UPDATE
        `;
        if (locked.length !== 1) {
          throw new CatalogSubjectDeletionError(
            "NOT_FOUND",
            "La materia ya no existe.",
          );
        }

        const target = await tx.subject.findUnique({
          where: { id: input.subjectId },
          select: subjectDeletionSelect,
        });
        if (!target) {
          throw new CatalogSubjectDeletionError(
            "NOT_FOUND",
            "La materia ya no existe.",
          );
        }
        if (target.name !== input.confirmationName) {
          throw new CatalogSubjectDeletionError(
            "NAME_MISMATCH",
            "El nombre de confirmación no coincide.",
          );
        }
        const dependencies = await getLevelDeletionDependencyCounts(
          tx,
          target.levelId,
        );
        if (hasLevelDeletionDependencies(dependencies)) {
          throw new CatalogSubjectDeletionError(
            "DEPENDENCY_BLOCKED",
            catalogDeletionDependencyMessage,
          );
        }
        const { storageKeys, contentImageIds } = getDeletionAssets(target);
        await tx.uploadIntent.deleteMany({
          where: { module: { subjectId: target.id } },
        });
        const deleted = await tx.subject.deleteMany({
          where: { id: target.id },
        });
        if (deleted.count !== 1) {
          throw new CatalogSubjectDeletionError(
            "CONCURRENT_OPERATION",
            "La materia cambió durante la eliminación. Inténtalo nuevamente.",
          );
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

        return { levelId: target.levelId, storageKeys: queuedStorageKeys };
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
    return { levelId: deletion.levelId };
  } catch (error) {
    if (error instanceof CatalogSubjectDeletionError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new CatalogSubjectDeletionError(
        "CONCURRENT_OPERATION",
        "La materia cambió durante la eliminación. Inténtalo nuevamente.",
      );
    }
    throw error;
  }
}
