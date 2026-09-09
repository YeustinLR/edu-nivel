import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { ContentAudience, Role } from "@/generated/prisma/enums";
import { isModulePermanentlyDeletable } from "@/modules/content/domain/content-permissions";
import type { AdminModuleDeleteInput } from "@/modules/content/schemas/admin-module-delete.schema";
import { prisma } from "@/server/db/prisma";
import {
  deleteR2Object,
  isR2UploadEnabled,
} from "@/server/storage/r2";

export type CatalogModuleDeletionErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "TITLE_MISMATCH"
  | "INVALID_STATE"
  | "STORAGE_CLEANUP_FAILED"
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
  audience: true,
  publicationStatus: true,
  isActive: true,
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

function assertDeletionAllowed(
  target: Pick<DeletionTarget, "publicationStatus">,
) {
  if (!isModulePermanentlyDeletable(target.publicationStatus)) {
    throw new CatalogModuleDeletionError(
      "INVALID_STATE",
      target.publicationStatus === "PUBLISHED"
        ? "Despublica el módulo antes de eliminarlo."
        : "Retira el módulo de revisión antes de eliminarlo.",
    );
  }
}

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

async function deleteStoredObjects(target: DeletionTarget) {
  if (!isR2UploadEnabled()) return;

  const candidateKeys = getStorageKeys(target);
  const sharedResources = await prisma.resource.findMany({
    where: {
      moduleId: { not: target.id },
      OR: [
        { pdfResource: { storageKey: { in: candidateKeys } } },
        { fileResource: { storageKey: { in: candidateKeys } } },
        { imageResource: { storageKey: { in: candidateKeys } } },
        { audioResource: { storageKey: { in: candidateKeys } } },
      ],
    },
    select: {
      pdfResource: { select: { storageKey: true } },
      fileResource: { select: { storageKey: true } },
      imageResource: { select: { storageKey: true } },
      audioResource: { select: { storageKey: true } },
    },
  });
  const sharedContentImages = await prisma.contentImage.findMany({
    where: {
      OR: [
        { storageKey: { in: candidateKeys } },
        { temporaryStorageKey: { in: candidateKeys } },
      ],
      resources: { some: { resource: { moduleId: { not: target.id } } } },
    },
    select: { storageKey: true, temporaryStorageKey: true },
  });
  const sharedKeys = new Set(
    [
      ...sharedResources.flatMap((resource) =>
        [
        resource.pdfResource?.storageKey,
        resource.fileResource?.storageKey,
        resource.imageResource?.storageKey,
        resource.audioResource?.storageKey,
        ].filter((key): key is string => Boolean(key)),
      ),
      ...sharedContentImages.flatMap((image) => [
        image.storageKey,
        image.temporaryStorageKey,
      ]),
    ],
  );
  const keys = candidateKeys.filter((key) => !sharedKeys.has(key));
  const results = await Promise.allSettled(
    keys.map((key) => deleteR2Object(key)),
  );
  if (results.some((result) => result.status === "rejected")) {
    throw new CatalogModuleDeletionError(
      "STORAGE_CLEANUP_FAILED",
      "No se pudieron eliminar todos los archivos. El módulo quedó archivado; inténtalo nuevamente.",
    );
  }
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
    select: {
      title: true,
      publicationStatus: true,
    },
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
  assertDeletionAllowed(initial);

  const archived = await prisma.module.updateMany({
    where: {
      id: input.moduleId,
      publicationStatus: {
        in: ["DRAFT", "CHANGES_REQUESTED", "UNPUBLISHED"],
      },
    },
    data: { isActive: false },
  });
  if (archived.count !== 1) {
    throw new CatalogModuleDeletionError(
      "CONCURRENT_OPERATION",
      "El módulo cambió durante la eliminación. Actualiza la página e inténtalo nuevamente.",
    );
  }

  try {
    return await prisma.$transaction(
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
        assertDeletionAllowed(target);
        if (target.isActive) {
          throw new CatalogModuleDeletionError(
            "CONCURRENT_OPERATION",
            "El módulo fue reactivado durante la eliminación. Inténtalo nuevamente.",
          );
        }

        await deleteStoredObjects(target);
        await tx.uploadIntent.deleteMany({
          where: { moduleId: target.id },
        });
        const deleted = await tx.module.deleteMany({
          where: {
            id: target.id,
            isActive: false,
            publicationStatus: {
              in: ["DRAFT", "CHANGES_REQUESTED", "UNPUBLISHED"],
            },
          },
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
          subjectId: target.subjectId,
          audience: target.audience,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 60_000,
      },
    );
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
