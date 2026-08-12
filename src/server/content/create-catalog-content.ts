import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { cache } from "react";
import type {
  CreateLevelInput,
  CreateModuleInput,
  CreateSubjectInput,
} from "@/modules/content/schemas/admin-content-creation.schema";
import { getModuleCreationStatus } from "@/modules/content/domain/content-creation";
import { prisma } from "@/server/db/prisma";

export type CatalogCreationErrorCode =
  | "DUPLICATE_LEVEL"
  | "DUPLICATE_SUBJECT"
  | "DUPLICATE_MODULE"
  | "LEVEL_NOT_FOUND"
  | "LEVEL_NOT_ACTIVE"
  | "SUBJECT_NOT_FOUND"
  | "SUBJECT_NOT_ACTIVE";

export class CatalogCreationError extends Error {
  constructor(
    public readonly code: CatalogCreationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CatalogCreationError";
  }
}

function isPrismaError(error: unknown, code: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

export async function createCatalogLevel(input: CreateLevelInput) {
  try {
    return await prisma.level.create({
      data: {
        levelNumber: input.levelNumber,
        description: input.description ?? null,
        requiresSubscription: input.requiresSubscription,
      },
      select: { id: true, levelNumber: true },
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new CatalogCreationError(
        "DUPLICATE_LEVEL",
        "Ya existe un nivel con ese número.",
      );
    }

    throw error;
  }
}

export async function createCatalogSubject(input: CreateSubjectInput) {
  const level = await prisma.level.findUnique({
    where: { id: input.levelId },
    select: { id: true, isActive: true },
  });

  if (!level) {
    throw new CatalogCreationError(
      "LEVEL_NOT_FOUND",
      "El nivel seleccionado ya no existe.",
    );
  }

  if (!level.isActive) {
    throw new CatalogCreationError(
      "LEVEL_NOT_ACTIVE",
      "Solo puedes crear materias dentro de un nivel activo.",
    );
  }

  try {
    const subject = await prisma.subject.create({
      data: {
        levelId: level.id,
        name: input.name,
        description: input.description ?? null,
      },
      select: { id: true, name: true },
    });

    return { ...subject, levelId: level.id };
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new CatalogCreationError(
        "DUPLICATE_SUBJECT",
        "Ya existe una materia con ese nombre dentro del nivel.",
      );
    }
    if (isPrismaError(error, "P2003")) {
      throw new CatalogCreationError(
        "LEVEL_NOT_FOUND",
        "El nivel seleccionado ya no existe.",
      );
    }

    throw error;
  }
}

export async function createCatalogModule(
  input: CreateModuleInput,
  createdById: string,
) {
  const subject = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    select: {
      id: true,
      isActive: true,
      level: { select: { id: true, isActive: true } },
    },
  });

  if (!subject) {
    throw new CatalogCreationError(
      "SUBJECT_NOT_FOUND",
      "La materia seleccionada ya no existe.",
    );
  }

  if (!subject.isActive || !subject.level.isActive) {
    throw new CatalogCreationError(
      "SUBJECT_NOT_ACTIVE",
      "Solo puedes crear módulos dentro de una materia y un nivel activos.",
    );
  }

  try {
    const publicationStatus = getModuleCreationStatus(input.disposition);
    const now = publicationStatus === "PUBLISHED" ? new Date() : null;
    const moduleRecord = await prisma.module.create({
      data: {
        subjectId: subject.id,
        title: input.title,
        description: input.description ?? null,
        audience: input.audience,
        createdById,
        publicationStatus,
        publishedById: now ? createdById : null,
        publishedAt: now,
      },
      select: { id: true, title: true, publicationStatus: true },
    });

    return {
      ...moduleRecord,
      levelId: subject.level.id,
      subjectId: subject.id,
    };
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new CatalogCreationError(
        "DUPLICATE_MODULE",
        "Ya existe un módulo con ese título dentro de la materia.",
      );
    }
    if (isPrismaError(error, "P2003")) {
      throw new CatalogCreationError(
        "SUBJECT_NOT_FOUND",
        "La materia seleccionada ya no existe.",
      );
    }

    throw error;
  }
}

export const getLevelCreationContext = cache(async (levelId: string) => {
  return prisma.level.findUnique({
    where: { id: levelId },
    select: {
      id: true,
      levelNumber: true,
      isActive: true,
    },
  });
});

export async function getSubjectCreationContext(subjectId: string) {
  return prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      id: true,
      name: true,
      isActive: true,
      level: {
        select: {
          id: true,
          levelNumber: true,
          isActive: true,
        },
      },
    },
  });
}
