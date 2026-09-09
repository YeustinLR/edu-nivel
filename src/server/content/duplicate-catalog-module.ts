import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { PublicationStatus, Role } from "@/generated/prisma/enums";
import type { DuplicateModuleInput } from "@/modules/content/schemas/content-workspace.schema";
import { prisma } from "@/server/db/prisma";

export class DuplicateModuleError extends Error {
  constructor(
    public readonly code: "FORBIDDEN" | "NOT_FOUND" | "DUPLICATE",
    message: string,
  ) {
    super(message);
    this.name = "DuplicateModuleError";
  }
}

function copyTitle(title: string, existingTitles: Set<string>) {
  const base = `${title} (copia)`;
  if (!existingTitles.has(base)) return base;
  for (let index = 2; index <= 100; index += 1) {
    const candidate = `${title} (copia ${index})`;
    if (!existingTitles.has(candidate)) return candidate;
  }
  throw new DuplicateModuleError(
    "DUPLICATE",
    "Hay demasiadas copias de este módulo. Cambia el título de una antes de continuar.",
  );
}

export async function duplicateCatalogModule(
  input: DuplicateModuleInput,
  actor: { id: string; role: Role },
) {
  if (actor.role !== Role.ADMIN) {
    throw new DuplicateModuleError(
      "FORBIDDEN",
      "Solo un administrador puede duplicar módulos.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const source = await tx.module.findFirst({
      where: { id: input.moduleId, subjectId: input.subjectId },
      select: {
        title: true,
        description: true,
        audience: true,
        resources: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            type: true,
            title: true,
            instructions: true,
            content: true,
            estimatedMinutes: true,
            order: true,
            isRequired: true,
            quiz: {
              select: {
                passingScore: true,
                maxAttempts: true,
                shuffleQuestions: true,
                questions: true,
              },
            },
            youtubeVideo: {
              select: { videoId: true, duration: true, startAt: true, endAt: true },
            },
            pdfResource: {
              select: {
                storageKey: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                pageCount: true,
              },
            },
            fileResource: {
              select: {
                storageKey: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
              },
            },
            linkResource: { select: { url: true, openInNewTab: true } },
            gameResource: { select: { gameType: true, config: true } },
            imageResource: {
              select: {
                storageKey: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                width: true,
                height: true,
                altText: true,
                caption: true,
              },
            },
            audioResource: {
              select: {
                storageKey: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                duration: true,
                transcript: true,
              },
            },
            contentImages: { select: { contentImageId: true } },
          },
        },
      },
    });
    if (!source) {
      throw new DuplicateModuleError(
        "NOT_FOUND",
        "El módulo no pertenece a la materia seleccionada.",
      );
    }

    const siblings = await tx.module.findMany({
      where: { subjectId: input.subjectId },
      select: { title: true, order: true },
    });
    const title = copyTitle(
      source.title,
      new Set(siblings.map((sibling) => sibling.title)),
    );
    const order = siblings.reduce(
      (maximum, sibling) => Math.max(maximum, sibling.order),
      -1,
    ) + 1;

    const duplicate = await tx.module.create({
      data: {
        subjectId: input.subjectId,
        title,
        description: source.description,
        audience: source.audience,
        publicationStatus: PublicationStatus.DRAFT,
        createdById: actor.id,
        order,
        resources: {
          create: source.resources.map((resource) => ({
            type: resource.type,
            title: resource.title,
            instructions: resource.instructions,
            content: resource.content,
            estimatedMinutes: resource.estimatedMinutes,
            publicationStatus: PublicationStatus.DRAFT,
            createdById: actor.id,
            order: resource.order,
            isRequired: resource.isRequired,
            quiz: resource.quiz
              ? {
                  create: {
                    ...resource.quiz,
                    questions: resource.quiz.questions as Prisma.InputJsonValue,
                  },
                }
              : undefined,
            youtubeVideo: resource.youtubeVideo
              ? { create: resource.youtubeVideo }
              : undefined,
            pdfResource: resource.pdfResource
              ? { create: resource.pdfResource }
              : undefined,
            fileResource: resource.fileResource
              ? { create: resource.fileResource }
              : undefined,
            linkResource: resource.linkResource
              ? { create: resource.linkResource }
              : undefined,
            gameResource: resource.gameResource
              ? {
                  create: {
                    ...resource.gameResource,
                    config: resource.gameResource.config as Prisma.InputJsonValue,
                  },
                }
              : undefined,
            imageResource: resource.imageResource
              ? { create: resource.imageResource }
              : undefined,
            audioResource: resource.audioResource
              ? { create: resource.audioResource }
              : undefined,
            contentImages: resource.contentImages.length
              ? {
                  create: resource.contentImages.map(({ contentImageId }) => ({
                    contentImage: { connect: { id: contentImageId } },
                  })),
                }
              : undefined,
          })),
        },
      },
      select: { id: true, title: true },
    });

    return duplicate;
  });
}
