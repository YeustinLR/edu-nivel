import "server-only";

import type { User } from "@/generated/prisma/client";
import { PublicationStatus, Role } from "@/generated/prisma/enums";
import {
  getEditorialTransitionTarget,
  isEditorialTransitionAllowed,
  type EditorialTransition,
} from "@/modules/content/domain/editorial-workflow";
import { prisma } from "@/server/db/prisma";

export type EditorialTargetType = "module" | "resource";

export type EditorialTransitionErrorCode =
  | "TARGET_NOT_FOUND"
  | "RELATION_MISMATCH"
  | "FORBIDDEN"
  | "INVALID_TRANSITION"
  | "REVIEW_NOTE_REQUIRED"
  | "TRANSITION_CONFLICT";

export class EditorialTransitionError extends Error {
  constructor(
    public readonly code: EditorialTransitionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "EditorialTransitionError";
  }
}

type EditorialActor = Pick<User, "id" | "role">;

type EditorialTarget = {
  id: string;
  createdById: string;
  parentId: string;
  publicationStatus: PublicationStatus;
};

async function getEditorialTarget(
  targetType: EditorialTargetType,
  targetId: string,
): Promise<EditorialTarget | null> {
  if (targetType === "module") {
    const moduleRecord = await prisma.module.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        createdById: true,
        subjectId: true,
        publicationStatus: true,
      },
    });

    return moduleRecord
      ? {
          id: moduleRecord.id,
          createdById: moduleRecord.createdById,
          parentId: moduleRecord.subjectId,
          publicationStatus: moduleRecord.publicationStatus,
        }
      : null;
  }

  const resource = await prisma.resource.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      createdById: true,
      moduleId: true,
      publicationStatus: true,
    },
  });

  return resource
    ? {
        id: resource.id,
        createdById: resource.createdById,
        parentId: resource.moduleId,
        publicationStatus: resource.publicationStatus,
      }
    : null;
}

function assertTransitionPermission(
  actor: EditorialActor,
  target: EditorialTarget,
  targetType: EditorialTargetType,
  transition: EditorialTransition,
) {
  if (actor.role === Role.ADMIN) return;

  const collaboratorTransition =
    targetType === "module"
      ? transition === "PUBLISH_DIRECT"
      : transition === "SUBMIT_FOR_REVIEW" || transition === "WITHDRAW_REVIEW";

  if (
    actor.role !== Role.COLLABORATOR ||
    !collaboratorTransition ||
    target.createdById !== actor.id
  ) {
    throw new EditorialTransitionError(
      "FORBIDDEN",
      "No tienes permisos para realizar esta transición.",
    );
  }
}

function getTransitionData(
  transition: EditorialTransition,
  actor: EditorialActor,
  reviewNote: string | null,
) {
  const now = new Date();

  switch (transition) {
    case "SUBMIT_FOR_REVIEW":
      return {
        publicationStatus: PublicationStatus.IN_REVIEW,
        submittedForReviewAt: now,
        reviewedById: null,
        reviewedAt: null,
        reviewNote: null,
      };
    case "WITHDRAW_REVIEW":
      return {
        publicationStatus: PublicationStatus.DRAFT,
        submittedForReviewAt: null,
      };
    case "PUBLISH_DIRECT":
      return {
        publicationStatus: PublicationStatus.PUBLISHED,
        submittedForReviewAt: null,
        reviewedById: null,
        reviewedAt: null,
        reviewNote: null,
        publishedById: actor.id,
        publishedAt: now,
      };
    case "PUBLISH":
      return {
        publicationStatus: PublicationStatus.PUBLISHED,
        reviewedById: actor.id,
        reviewedAt: now,
        reviewNote,
        publishedById: actor.id,
        publishedAt: now,
      };
    case "REQUEST_CHANGES":
      return {
        publicationStatus: PublicationStatus.CHANGES_REQUESTED,
        reviewedById: actor.id,
        reviewedAt: now,
        reviewNote,
      };
    case "UNPUBLISH":
      return {
        publicationStatus: PublicationStatus.UNPUBLISHED,
      };
  }
}

export async function applyEditorialTransition({
  targetType,
  targetId,
  expectedParentId,
  transition,
  reviewNote,
  actor,
}: {
  targetType: EditorialTargetType;
  targetId: string;
  expectedParentId?: string;
  transition: EditorialTransition;
  reviewNote?: string | null;
  actor: EditorialActor;
}) {
  const target = await getEditorialTarget(targetType, targetId);

  if (!target) {
    throw new EditorialTransitionError(
      "TARGET_NOT_FOUND",
      "El contenido solicitado no existe.",
    );
  }

  if (expectedParentId && target.parentId !== expectedParentId) {
    throw new EditorialTransitionError(
      "RELATION_MISMATCH",
      "El contenido no pertenece al contexto seleccionado.",
    );
  }

  assertTransitionPermission(actor, target, targetType, transition);

  const normalizedNote = reviewNote?.trim() || null;
  if (transition === "REQUEST_CHANGES" && !normalizedNote) {
    throw new EditorialTransitionError(
      "REVIEW_NOTE_REQUIRED",
      "Debes indicar los cambios solicitados.",
    );
  }

  const destination = getEditorialTransitionTarget(targetType, transition);

  if (target.publicationStatus === destination) {
    return { outcome: "ALREADY_APPLIED" as const, publicationStatus: destination };
  }

  if (
    !isEditorialTransitionAllowed(
      targetType,
      target.publicationStatus,
      transition,
    )
  ) {
    throw new EditorialTransitionError(
      "INVALID_TRANSITION",
      "La transición no es válida para el estado actual.",
    );
  }

  const data = getTransitionData(transition, actor, normalizedNote);
  const updated =
    targetType === "module"
      ? await prisma.module.updateMany({
          where: {
            id: target.id,
            publicationStatus: target.publicationStatus,
          },
          data,
        })
      : await prisma.resource.updateMany({
          where: {
            id: target.id,
            publicationStatus: target.publicationStatus,
          },
          data,
        });

  if (updated.count !== 1) {
    const current = await getEditorialTarget(targetType, target.id);

    if (current?.publicationStatus === destination) {
      return {
        outcome: "ALREADY_APPLIED" as const,
        publicationStatus: destination,
      };
    }

    throw new EditorialTransitionError(
      "TRANSITION_CONFLICT",
      "El contenido cambió mientras se procesaba la acción. Actualiza e inténtalo nuevamente.",
    );
  }

  return { outcome: "APPLIED" as const, publicationStatus: destination };
}
