import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import type { AdminLevelDeleteInput } from "@/modules/content/schemas/admin-level-delete.schema";
import { cleanupQueuedStorageObjects } from "@/server/content/cleanup-storage-objects";
import {
  getLevelDeletionDependencyCounts,
  hasLevelDeletionDependencies,
} from "@/server/content/catalog-deletion-dependencies";
import { prisma } from "@/server/db/prisma";
import { isR2UploadEnabled } from "@/server/storage/r2";

export type CatalogLevelDeletionErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "LABEL_MISMATCH"
  | "DEPENDENCY_BLOCKED"
  | "CONCURRENT_OPERATION";

export class CatalogLevelDeletionError extends Error {
  constructor(
    public readonly code: CatalogLevelDeletionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CatalogLevelDeletionError";
  }
}

const levelDeletionSelect = {
  id: true,
  levelNumber: true,
  subjects: {
    select: {
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
    },
  },
  subscriptions: { select: { id: true } },
} satisfies Prisma.LevelSelect;

type LevelDeletionTarget = Prisma.LevelGetPayload<{
  select: typeof levelDeletionSelect;
}>;

function confirmationLabel(levelNumber: number) {
  return `Nivel ${levelNumber}`;
}

export type LevelDeletionEligibility = {
  activeSubscriptionCount: number;
  unresolvedPaymentCount: number;
  canDelete: boolean;
};

export async function getLevelDeletionEligibility(
  levelId: string,
  now = new Date(),
): Promise<LevelDeletionEligibility> {
  const { activeSubscriptionCount, unresolvedPaymentCount } =
    await getLevelDeletionDependencyCounts(prisma, levelId, now);

  return {
    activeSubscriptionCount,
    unresolvedPaymentCount,
    canDelete: activeSubscriptionCount === 0 && unresolvedPaymentCount === 0,
  };
}

function assertDeletionDependencies(
  activeSubscriptionCount: number,
  unresolvedPaymentCount: number,
) {
  if (
    !hasLevelDeletionDependencies({
      activeSubscriptionCount,
      unresolvedPaymentCount,
    })
  ) return;

  throw new CatalogLevelDeletionError(
    "DEPENDENCY_BLOCKED",
    "No puedes eliminar el nivel mientras tenga suscripciones vigentes o pagos pendientes.",
  );
}

function getDeletionAssets(target: LevelDeletionTarget) {
  const storageKeys = new Set<string>();
  const contentImageIds = new Set<string>();

  for (const subject of target.subjects) {
    for (const moduleRecord of subject.modules) {
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
  }

  return {
    storageKeys: [...storageKeys],
    contentImageIds: [...contentImageIds],
  };
}

export async function deleteCatalogLevel(
  input: AdminLevelDeleteInput,
  actor: { id: string; role: Role },
) {
  if (actor.role !== Role.ADMIN) {
    throw new CatalogLevelDeletionError(
      "FORBIDDEN",
      "Solo un administrador puede eliminar niveles.",
    );
  }

  const initial = await prisma.level.findUnique({
    where: { id: input.levelId },
    select: { levelNumber: true },
  });
  if (!initial) {
    throw new CatalogLevelDeletionError("NOT_FOUND", "El nivel ya no existe.");
  }
  if (input.confirmationLabel !== confirmationLabel(initial.levelNumber)) {
    throw new CatalogLevelDeletionError(
      "LABEL_MISMATCH",
      "El nombre de confirmación no coincide.",
    );
  }

  try {
    const deletion = await prisma.$transaction(
      async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "level" WHERE "id" = ${input.levelId} FOR UPDATE
        `;
        if (locked.length !== 1) {
          throw new CatalogLevelDeletionError(
            "NOT_FOUND",
            "El nivel ya no existe.",
          );
        }

        const target = await tx.level.findUnique({
          where: { id: input.levelId },
          select: levelDeletionSelect,
        });
        if (!target) {
          throw new CatalogLevelDeletionError(
            "NOT_FOUND",
            "El nivel ya no existe.",
          );
        }
        if (input.confirmationLabel !== confirmationLabel(target.levelNumber)) {
          throw new CatalogLevelDeletionError(
            "LABEL_MISMATCH",
            "El nombre de confirmación no coincide.",
          );
        }

        const { activeSubscriptionCount, unresolvedPaymentCount } =
          await getLevelDeletionDependencyCounts(tx, target.id);
        assertDeletionDependencies(
          activeSubscriptionCount,
          unresolvedPaymentCount,
        );

        const { storageKeys, contentImageIds } = getDeletionAssets(target);

        const subscriptionIds = target.subscriptions.map(({ id }) => id);
        if (subscriptionIds.length) {
          await tx.notificationRecipient.updateMany({
            where: { subscriptionId: { in: subscriptionIds } },
            data: { subscriptionId: null },
          });
          await tx.subscription.deleteMany({
            where: { id: { in: subscriptionIds } },
          });
        }

        await tx.uploadIntent.deleteMany({
          where: { module: { subject: { levelId: target.id } } },
        });

        const deleted = await tx.level.deleteMany({
          where: { id: target.id },
        });
        if (deleted.count !== 1) {
          throw new CatalogLevelDeletionError(
            "CONCURRENT_OPERATION",
            "El nivel cambió durante la eliminación. Inténtalo nuevamente.",
          );
        }

        let orphanContentImages: Array<{
          id: string;
          temporaryStorageKey: string;
          storageKey: string;
        }> = [];
        if (contentImageIds.length) {
          orphanContentImages = await tx.contentImage.findMany({
            where: {
              id: { in: contentImageIds },
              resources: { none: {} },
            },
            select: {
              id: true,
              temporaryStorageKey: true,
              storageKey: true,
            },
          });
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

        return queuedStorageKeys;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 60_000,
      },
    );

    if (deletion.length) {
      await cleanupQueuedStorageObjects(deletion).catch((error) => {
        console.error("Deferred R2 cleanup could not start", error);
      });
    }
  } catch (error) {
    if (error instanceof CatalogLevelDeletionError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new CatalogLevelDeletionError(
        "CONCURRENT_OPERATION",
        "El nivel cambió durante la eliminación. Inténtalo nuevamente.",
      );
    }
    throw error;
  }
}
