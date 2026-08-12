"use server";

import { Role } from "@/generated/prisma/enums";
import type { EditorialTransition } from "@/modules/content/domain/editorial-workflow";
import { editorialActionSchema } from "@/modules/content/schemas/editorial-action.schema";
import type { EditorialActionState } from "@/modules/content/types/editorial-action-state";
import { AuthGuardError, requireRole } from "@/server/auth/guards";
import {
  applyEditorialTransition,
  EditorialTransitionError,
} from "@/server/content/apply-editorial-transition";
import { revalidateContentPages } from "@/server/content/revalidate-content";

const successMessages: Record<EditorialTransition, string> = {
  SUBMIT_FOR_REVIEW: "El contenido fue enviado a revisión.",
  WITHDRAW_REVIEW: "El contenido fue retirado de revisión.",
  PUBLISH_DIRECT: "El contenido fue publicado directamente.",
  PUBLISH: "El contenido fue publicado.",
  REQUEST_CHANGES: "Los cambios fueron solicitados.",
  UNPUBLISH: "El contenido fue despublicado.",
};

export async function transitionEditorialContentAction(
  _previousState: EditorialActionState,
  formData: FormData,
): Promise<EditorialActionState> {
  const parsed = editorialActionSchema.safeParse({
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
    parentId: formData.get("parentId"),
    transition: formData.get("transition"),
    reviewNote: formData.get("reviewNote") || undefined,
    reviewConfirmed: formData.get("reviewConfirmed"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      status: "error",
      message: "Revisa los datos de la acción editorial.",
      fieldErrors: { reviewNote: fieldErrors.reviewNote },
    };
  }

  let actor;
  try {
    actor = await requireRole([Role.ADMIN, Role.COLLABORATOR]);
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  try {
    await applyEditorialTransition({
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      expectedParentId: parsed.data.parentId,
      transition: parsed.data.transition,
      reviewNote: parsed.data.reviewNote,
      actor,
    });
    revalidateContentPages();

    return {
      status: "success",
      message: successMessages[parsed.data.transition],
    };
  } catch (error) {
    if (error instanceof EditorialTransitionError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
}
