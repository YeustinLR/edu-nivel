import "server-only";

import { Prisma } from "@/generated/prisma/client";
import {
  ContentRevisionKind,
  ContentRevisionStatus,
  ResourceType,
  Role,
} from "@/generated/prisma/enums";
import type {
  UpdateModuleInput,
  UpdateResourceInput,
} from "@/modules/content/schemas/content-edit.schema";
import { parseQuizQuestionsJson } from "@/modules/content/domain/quiz";
import { prisma } from "@/server/db/prisma";
import { syncResourceContentImages } from "@/server/content/content-image-references";

export type ContentRevisionActor = { id: string; role: Role };
export type ContentRevisionTargetType = "module" | "resource";

export class ContentRevisionError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "INVALID_STATE"
      | "EDIT_CONFLICT"
      | "REVIEW_NOTE_REQUIRED",
    message: string,
  ) {
    super(message);
    this.name = "ContentRevisionError";
  }
}

export type ModuleRevisionPayload = {
  title: string;
  description: string | null;
  audience: "STUDENT" | "TEACHER" | "BOTH";
};

export type ResourceRevisionPayload = {
  title: string;
  instructions: string | null;
  content: string | null;
  estimatedMinutes: number | null;
  videoId: string | null;
  startAt: number | null;
  url: string | null;
  openInNewTab: boolean;
  altText: string | null;
  quizQuestions: Prisma.JsonValue[] | null;
  passingScore: number | null;
  maxAttempts: number | null;
  shuffleQuestions: boolean;
};

export function asModuleRevisionPayload(value: Prisma.JsonValue): ModuleRevisionPayload {
  const payload = value as Partial<ModuleRevisionPayload>;
  if (
    typeof payload.title !== "string" ||
    !["STUDENT", "TEACHER", "BOTH"].includes(String(payload.audience))
  ) {
    throw new ContentRevisionError("INVALID_STATE", "La revisión del módulo no es válida.");
  }
  return {
    title: payload.title,
    description: typeof payload.description === "string" ? payload.description : null,
    audience: payload.audience as ModuleRevisionPayload["audience"],
  };
}

export function asResourceRevisionPayload(value: Prisma.JsonValue): ResourceRevisionPayload {
  const payload = value as Partial<ResourceRevisionPayload>;
  if (typeof payload.title !== "string") {
    throw new ContentRevisionError("INVALID_STATE", "La revisión del recurso no es válida.");
  }
  return {
    title: payload.title,
    instructions: typeof payload.instructions === "string" ? payload.instructions : null,
    content: typeof payload.content === "string" ? payload.content : null,
    estimatedMinutes: typeof payload.estimatedMinutes === "number" ? payload.estimatedMinutes : null,
    videoId: typeof payload.videoId === "string" ? payload.videoId : null,
    startAt: typeof payload.startAt === "number" ? payload.startAt : null,
    url: typeof payload.url === "string" ? payload.url : null,
    openInNewTab: payload.openInNewTab === true,
    altText: typeof payload.altText === "string" ? payload.altText : null,
    quizQuestions: Array.isArray(payload.quizQuestions) ? payload.quizQuestions : null,
    passingScore: typeof payload.passingScore === "number" ? payload.passingScore : null,
    maxAttempts: typeof payload.maxAttempts === "number" ? payload.maxAttempts : null,
    shuffleQuestions: payload.shuffleQuestions === true,
  };
}

export async function getModuleContentRevision(moduleId: string) {
  const revision = await prisma.contentRevision.findUnique({
    where: { moduleId },
    include: { updatedBy: { select: { name: true } } },
  });
  return revision
    ? { ...revision, payload: asModuleRevisionPayload(revision.payload) }
    : null;
}

export async function getResourceContentRevision(resourceId: string) {
  const revision = await prisma.contentRevision.findUnique({
    where: { resourceId },
    include: { updatedBy: { select: { name: true } } },
  });
  return revision
    ? { ...revision, payload: asResourceRevisionPayload(revision.payload) }
    : null;
}

function assertCollaborator(actor: ContentRevisionActor) {
  if (actor.role !== Role.COLLABORATOR) {
    throw new ContentRevisionError("FORBIDDEN", "Solo un colaborador crea revisiones editoriales.");
  }
}

function isPrismaError(error: unknown, code: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

async function audit(
  transaction: Prisma.TransactionClient,
  input: {
    actorId: string;
    kind: ContentRevisionKind;
    entityId: string;
    action: string;
    revisionId?: string;
    changes?: Prisma.InputJsonValue;
  },
) {
  await transaction.contentAuditLog.create({ data: input });
}

export async function savePublishedModuleRevision(
  input: UpdateModuleInput,
  actor: ContentRevisionActor,
) {
  assertCollaborator(actor);
  const moduleRecord = await prisma.module.findUnique({
    where: { id: input.id },
    select: { id: true, publicationStatus: true, updatedAt: true },
  });
  if (!moduleRecord) throw new ContentRevisionError("NOT_FOUND", "El módulo ya no existe.");
  if (moduleRecord.publicationStatus !== "PUBLISHED") {
    throw new ContentRevisionError("INVALID_STATE", "El módulo ya no está publicado.");
  }
  const existing = await prisma.contentRevision.findUnique({ where: { moduleId: input.id } });
  if (existing?.status === ContentRevisionStatus.IN_REVIEW) {
    throw new ContentRevisionError("INVALID_STATE", "Retira la revisión antes de editarla.");
  }
  const expected = new Date(input.expectedUpdatedAt).getTime();
  const current = existing?.updatedAt ?? moduleRecord.updatedAt;
  if (current.getTime() !== expected) {
    throw new ContentRevisionError("EDIT_CONFLICT", "El módulo cambió mientras lo editabas. Actualiza e inténtalo nuevamente.");
  }
  const payload: ModuleRevisionPayload = {
    title: input.title,
    description: input.description ?? null,
    audience: input.audience,
  };

  try {
    return await prisma.$transaction(async (transaction) => {
      let revision;
      if (existing) {
        const updated = await transaction.contentRevision.updateMany({
          where: { id: existing.id, updatedAt: existing.updatedAt },
          data: {
            payload: payload as Prisma.InputJsonValue,
            updatedById: actor.id,
            reviewNote: null,
          },
        });
        if (updated.count !== 1) {
          throw new ContentRevisionError(
            "EDIT_CONFLICT",
            "El módulo cambió mientras lo editabas. Actualiza e inténtalo nuevamente.",
          );
        }
        revision = await transaction.contentRevision.findUnique({
          where: { id: existing.id },
        });
        if (!revision) {
          throw new ContentRevisionError("NOT_FOUND", "La revisión ya no existe.");
        }
      } else {
        revision = await transaction.contentRevision.create({
          data: {
            kind: ContentRevisionKind.MODULE,
            moduleId: input.id,
            payload,
            baseUpdatedAt: moduleRecord.updatedAt,
            createdById: actor.id,
            updatedById: actor.id,
          },
        });
      }
      await audit(transaction, {
        actorId: actor.id,
        kind: ContentRevisionKind.MODULE,
        entityId: input.id,
        revisionId: revision.id,
        action: existing ? "REVISION_UPDATED" : "REVISION_CREATED",
      });
      return revision;
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new ContentRevisionError(
        "EDIT_CONFLICT",
        "Otra persona creó una revisión mientras editabas. Actualiza e inténtalo nuevamente.",
      );
    }
    throw error;
  }
}

export async function savePublishedResourceRevision(
  input: UpdateResourceInput,
  actor: ContentRevisionActor,
) {
  assertCollaborator(actor);
  const resource = await prisma.resource.findUnique({
    where: { id: input.id },
    select: { id: true, publicationStatus: true, updatedAt: true, type: true },
  });
  if (!resource) throw new ContentRevisionError("NOT_FOUND", "El recurso ya no existe.");
  if (resource.publicationStatus !== "PUBLISHED") {
    throw new ContentRevisionError("INVALID_STATE", "El recurso ya no está publicado.");
  }
  if (resource.type !== input.resourceType) {
    throw new ContentRevisionError("INVALID_STATE", "El tipo del recurso cambió.");
  }
  const existing = await prisma.contentRevision.findUnique({ where: { resourceId: input.id } });
  if (existing?.status === ContentRevisionStatus.IN_REVIEW) {
    throw new ContentRevisionError("INVALID_STATE", "Retira la revisión antes de editarla.");
  }
  const expected = new Date(input.expectedUpdatedAt).getTime();
  const current = existing?.updatedAt ?? resource.updatedAt;
  if (current.getTime() !== expected) {
    throw new ContentRevisionError("EDIT_CONFLICT", "El recurso cambió mientras lo editabas. Actualiza e inténtalo nuevamente.");
  }
  const parsedQuiz = input.resourceType === ResourceType.QUIZ
    ? parseQuizQuestionsJson(input.quizQuestions ?? "")
    : null;
  if (parsedQuiz && !parsedQuiz.success) {
    throw new ContentRevisionError("INVALID_STATE", "Las preguntas no tienen un formato válido.");
  }
  const payload: ResourceRevisionPayload = {
    title: input.title,
    instructions: input.instructions ?? null,
    content: input.content?.trim() || null,
    estimatedMinutes: input.estimatedMinutes ?? null,
    videoId: input.videoId ?? null,
    startAt: input.startAt ?? null,
    url: input.url ?? null,
    openInNewTab: input.openInNewTab ?? false,
    altText: input.altText?.trim() || null,
    quizQuestions: parsedQuiz?.success ? parsedQuiz.data : null,
    passingScore: input.passingScore ?? null,
    maxAttempts: input.maxAttempts ?? null,
    shuffleQuestions: input.shuffleQuestions ?? false,
  };

  try {
    return await prisma.$transaction(async (transaction) => {
      let revision;
      if (existing) {
        const updated = await transaction.contentRevision.updateMany({
          where: { id: existing.id, updatedAt: existing.updatedAt },
          data: { payload, updatedById: actor.id, reviewNote: null },
        });
        if (updated.count !== 1) {
          throw new ContentRevisionError(
            "EDIT_CONFLICT",
            "El recurso cambió mientras lo editabas. Actualiza e inténtalo nuevamente.",
          );
        }
        revision = await transaction.contentRevision.findUnique({
          where: { id: existing.id },
        });
        if (!revision) {
          throw new ContentRevisionError("NOT_FOUND", "La revisión ya no existe.");
        }
      } else {
        revision = await transaction.contentRevision.create({
          data: {
            kind: ContentRevisionKind.RESOURCE,
            resourceId: input.id,
            payload: payload as Prisma.InputJsonValue,
            baseUpdatedAt: resource.updatedAt,
            createdById: actor.id,
            updatedById: actor.id,
          },
        });
      }
      await audit(transaction, {
        actorId: actor.id,
        kind: ContentRevisionKind.RESOURCE,
        entityId: input.id,
        revisionId: revision.id,
        action: existing ? "REVISION_UPDATED" : "REVISION_CREATED",
      });
      return revision;
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new ContentRevisionError(
        "EDIT_CONFLICT",
        "Otra persona creó una revisión mientras editabas. Actualiza e inténtalo nuevamente.",
      );
    }
    throw error;
  }
}

export async function transitionPublishedRevision(input: {
  targetType: ContentRevisionTargetType;
  targetId: string;
  transition: "SUBMIT_FOR_REVIEW" | "WITHDRAW_REVIEW" | "PUBLISH" | "REQUEST_CHANGES";
  reviewNote?: string | null;
  actor: ContentRevisionActor;
}) {
  const revision = await prisma.contentRevision.findFirst({
    where: input.targetType === "module"
      ? { moduleId: input.targetId }
      : { resourceId: input.targetId },
  });
  if (!revision) return null;

  const isAdminDecision = input.transition === "PUBLISH" || input.transition === "REQUEST_CHANGES";
  if ((isAdminDecision && input.actor.role !== Role.ADMIN) || (!isAdminDecision && input.actor.role !== Role.COLLABORATOR)) {
    throw new ContentRevisionError("FORBIDDEN", "No tienes permisos para realizar esta transición.");
  }
  const editableRevisionStatuses: readonly ContentRevisionStatus[] = [ContentRevisionStatus.DRAFT, ContentRevisionStatus.CHANGES_REQUESTED];
  const allowed =
    (input.transition === "SUBMIT_FOR_REVIEW" && editableRevisionStatuses.includes(revision.status)) ||
    (input.transition === "WITHDRAW_REVIEW" && revision.status === ContentRevisionStatus.IN_REVIEW) ||
    ((input.transition === "PUBLISH" || input.transition === "REQUEST_CHANGES") && revision.status === ContentRevisionStatus.IN_REVIEW);
  if (!allowed) throw new ContentRevisionError("INVALID_STATE", "La transición no es válida para esta revisión.");
  const note = input.reviewNote?.trim() || null;
  if (input.transition === "REQUEST_CHANGES" && !note) {
    throw new ContentRevisionError("REVIEW_NOTE_REQUIRED", "Debes indicar los cambios solicitados.");
  }

  if (input.transition === "PUBLISH") {
    return approvePublishedRevision(revision.id, input.actor);
  }

  const status = input.transition === "SUBMIT_FOR_REVIEW"
    ? ContentRevisionStatus.IN_REVIEW
    : input.transition === "WITHDRAW_REVIEW"
      ? ContentRevisionStatus.DRAFT
      : ContentRevisionStatus.CHANGES_REQUESTED;
  await prisma.$transaction(async (transaction) => {
    const updated = await transaction.contentRevision.updateMany({
      where: { id: revision.id, updatedAt: revision.updatedAt, status: revision.status },
      data: {
        status,
        submittedById: input.transition === "SUBMIT_FOR_REVIEW" ? input.actor.id : revision.submittedById,
        submittedAt: input.transition === "SUBMIT_FOR_REVIEW" ? new Date() : input.transition === "WITHDRAW_REVIEW" ? null : revision.submittedAt,
        reviewedById: input.transition === "REQUEST_CHANGES" ? input.actor.id : null,
        reviewedAt: input.transition === "REQUEST_CHANGES" ? new Date() : null,
        reviewNote: input.transition === "REQUEST_CHANGES" ? note : null,
      },
    });
    if (updated.count !== 1) throw new ContentRevisionError("EDIT_CONFLICT", "La revisión cambió mientras se procesaba la acción.");
    await audit(transaction, {
      actorId: input.actor.id,
      kind: revision.kind,
      entityId: input.targetId,
      revisionId: revision.id,
      action: input.transition,
    });
  });
  return { outcome: "APPLIED" as const, publicationStatus: status };
}

async function approvePublishedRevision(revisionId: string, actor: ContentRevisionActor) {
  try {
    return await prisma.$transaction(async (transaction) => {
    const revision = await transaction.contentRevision.findUnique({ where: { id: revisionId } });
    if (!revision || revision.status !== ContentRevisionStatus.IN_REVIEW) {
      throw new ContentRevisionError("EDIT_CONFLICT", "La revisión ya no está pendiente.");
    }
    const claimed = await transaction.contentRevision.updateMany({
      where: {
        id: revision.id,
        status: ContentRevisionStatus.IN_REVIEW,
        updatedAt: revision.updatedAt,
      },
      data: { reviewedById: actor.id, reviewedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new ContentRevisionError(
        "EDIT_CONFLICT",
        "La revisión cambió mientras se aprobaba.",
      );
    }
    if (revision.kind === ContentRevisionKind.MODULE && revision.moduleId) {
      const payload = asModuleRevisionPayload(revision.payload);
      const updated = await transaction.module.updateMany({
        where: { id: revision.moduleId, updatedAt: revision.baseUpdatedAt, publicationStatus: "PUBLISHED" },
        data: { ...payload, updatedById: revision.updatedById, reviewedById: actor.id, reviewedAt: new Date(), reviewNote: null },
      });
      if (updated.count !== 1) throw new ContentRevisionError("EDIT_CONFLICT", "El módulo publicado cambió desde que se creó la revisión.");
    } else if (revision.kind === ContentRevisionKind.RESOURCE && revision.resourceId) {
      const payload = asResourceRevisionPayload(revision.payload);
      const resource = await transaction.resource.findUnique({
        where: { id: revision.resourceId },
        select: { type: true },
      });
      if (!resource) throw new ContentRevisionError("NOT_FOUND", "El recurso ya no existe.");
      const updated = await transaction.resource.updateMany({
        where: { id: revision.resourceId, updatedAt: revision.baseUpdatedAt, publicationStatus: "PUBLISHED" },
        data: {
          title: payload.title,
          instructions: payload.instructions,
          content: payload.content,
          estimatedMinutes: payload.estimatedMinutes,
          updatedById: revision.updatedById,
          reviewedById: actor.id,
          reviewedAt: new Date(),
          reviewNote: null,
        },
      });
      if (updated.count !== 1) throw new ContentRevisionError("EDIT_CONFLICT", "El recurso publicado cambió desde que se creó la revisión.");
      if (resource.type === ResourceType.YOUTUBE) {
        if (!payload.videoId) {
          throw new ContentRevisionError("INVALID_STATE", "La revisión no contiene un video válido.");
        }
        await transaction.youtubeVideo.update({ where: { resourceId: revision.resourceId }, data: { videoId: payload.videoId, startAt: payload.startAt ?? 0 } });
      } else if (resource.type === ResourceType.LINK) {
        if (!payload.url) {
          throw new ContentRevisionError("INVALID_STATE", "La revisión no contiene un enlace válido.");
        }
        await transaction.linkResource.update({ where: { resourceId: revision.resourceId }, data: { url: payload.url, openInNewTab: payload.openInNewTab } });
      } else if (resource.type === ResourceType.IMAGE) {
        await transaction.imageResource.updateMany({ where: { resourceId: revision.resourceId }, data: { altText: payload.altText } });
      } else if (resource.type === ResourceType.QUIZ && payload.quizQuestions) {
        await transaction.quiz.update({
          where: { resourceId: revision.resourceId },
          data: {
            questions: payload.quizQuestions as Prisma.InputJsonValue,
            passingScore: payload.passingScore ?? 70,
            maxAttempts: payload.maxAttempts,
            shuffleQuestions: payload.shuffleQuestions,
          },
        });
      }
      const revisionActors = await transaction.contentAuditLog.findMany({
        where: { revisionId: revision.id },
        select: { actorId: true },
      });
      await syncResourceContentImages(transaction, {
        resourceId: revision.resourceId,
        editorSessionId: revision.resourceId,
        actorId: revision.updatedById,
        allowedActorIds: [
          ...new Set([
            revision.createdById,
            revision.updatedById,
            ...revisionActors.map(({ actorId }) => actorId),
          ]),
        ],
        content: payload.content,
      });
    } else {
      throw new ContentRevisionError("INVALID_STATE", "La revisión no tiene un destino válido.");
    }
    const entityId = revision.moduleId ?? revision.resourceId!;
    await audit(transaction, {
      actorId: actor.id,
      kind: revision.kind,
      entityId,
      revisionId: revision.id,
      action: "REVISION_APPROVED",
    });
    await transaction.contentRevision.delete({ where: { id: revision.id } });
    return { outcome: "APPLIED" as const, publicationStatus: "PUBLISHED" as const };
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      throw new ContentRevisionError(
        "INVALID_STATE",
        "No se puede aprobar la revisión porque ya existe contenido con ese título.",
      );
    }
    throw error;
  }
}
