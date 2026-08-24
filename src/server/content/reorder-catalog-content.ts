import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import type {
  ReorderModulesInput,
  ReorderResourcesInput,
} from "@/modules/content/schemas/content-workspace.schema";
import { prisma } from "@/server/db/prisma";

export class ContentReorderError extends Error {
  constructor(
    public readonly code: "FORBIDDEN" | "CONTEXT_MISMATCH" | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "ContentReorderError";
  }
}

function assertAdmin(actor: { role: Role }) {
  if (actor.role !== Role.ADMIN) {
    throw new ContentReorderError(
      "FORBIDDEN",
      "Solo un administrador puede reordenar el catálogo.",
    );
  }
}

function sameIdentifiers(actual: string[], requested: string[]) {
  if (actual.length !== requested.length) return false;
  const requestedIds = new Set(requested);
  return actual.every((id) => requestedIds.has(id));
}

export async function reorderCatalogModules(
  input: ReorderModulesInput,
  actor: { id: string; role: Role },
) {
  assertAdmin(actor);

  try {
    await prisma.$transaction(
      async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "module"
          WHERE "subjectId" = ${input.subjectId}
          ORDER BY "order", "title", "id"
          FOR UPDATE
        `;
        const actualIds = locked.map((row) => row.id);
        if (!sameIdentifiers(actualIds, input.moduleIds)) {
          throw new ContentReorderError(
            "CONTEXT_MISMATCH",
            "La lista de módulos cambió. Actualiza e inténtalo nuevamente.",
          );
        }

        await Promise.all(
          input.moduleIds.map((id, order) =>
            tx.module.update({ where: { id }, data: { order } }),
          ),
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof ContentReorderError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new ContentReorderError(
        "CONFLICT",
        "Otro usuario modificó el orden. Inténtalo nuevamente.",
      );
    }
    throw error;
  }
}

export async function reorderCatalogResources(
  input: ReorderResourcesInput,
  actor: { id: string; role: Role },
) {
  assertAdmin(actor);

  try {
    await prisma.$transaction(
      async (tx) => {
        const moduleRecord = await tx.module.findFirst({
          where: { id: input.moduleId, subjectId: input.subjectId },
          select: { id: true },
        });
        if (!moduleRecord) {
          throw new ContentReorderError(
            "CONTEXT_MISMATCH",
            "El módulo no pertenece a la materia seleccionada.",
          );
        }

        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "resource"
          WHERE "moduleId" = ${input.moduleId}
          ORDER BY "order", "createdAt", "id"
          FOR UPDATE
        `;
        const actualIds = locked.map((row) => row.id);
        if (!sameIdentifiers(actualIds, input.resourceIds)) {
          throw new ContentReorderError(
            "CONTEXT_MISMATCH",
            "La lista de recursos cambió. Actualiza e inténtalo nuevamente.",
          );
        }

        await Promise.all(
          input.resourceIds.map((id, order) =>
            tx.resource.update({ where: { id }, data: { order } }),
          ),
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof ContentReorderError) throw error;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new ContentReorderError(
        "CONFLICT",
        "Otro usuario modificó el orden. Inténtalo nuevamente.",
      );
    }
    throw error;
  }
}
