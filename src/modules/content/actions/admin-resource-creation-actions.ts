"use server";

import { ResourceType, Role } from "@/generated/prisma/enums";
import {
  createValidationError,
  toActionValues,
} from "@/modules/content/actions/form-action-state-helpers";
import {
  createAdminStructuredResourceSchema,
  getAdminStructuredResourceFormValues,
} from "@/modules/content/schemas/admin-resource-creation.schema";
import type {
  ResourceCreationActionState,
  ResourceCreationValues,
} from "@/modules/content/types/resource-creation-action-state";
import { AuthGuardError, requireRole } from "@/server/auth/guards";
import {
  createCatalogStructuredResource,
  ResourceCreationError,
} from "@/server/content/create-catalog-resource";
import { revalidateContentPages } from "@/server/content/revalidate-content";

export async function createAdminStructuredResourceAction(
  _previousState: ResourceCreationActionState,
  formData: FormData,
): Promise<ResourceCreationActionState> {
  const values = getAdminStructuredResourceFormValues(formData);
  const actionValues: ResourceCreationValues = toActionValues(values);
  const parsed = createAdminStructuredResourceSchema.safeParse(values);

  if (!parsed.success) {
    return createValidationError(parsed.error.flatten().fieldErrors, actionValues);
  }

  try {
    const actor = await requireRole([Role.ADMIN, Role.COLLABORATOR]);
    if (
      actor.role === Role.COLLABORATOR &&
      parsed.data.resourceType !== ResourceType.NOTE
    ) {
      return {
        status: "error",
        message: "Tu rol solo puede crear notas sin adjunto desde este formulario.",
        values: actionValues,
      };
    }
    const resource = await createCatalogStructuredResource(parsed.data, actor);
    revalidateContentPages(
      parsed.data.disposition === "PUBLISH" ? "published" : "authoring",
    );

    return {
      status: "success",
      message:
        parsed.data.disposition === "PUBLISH"
          ? `${resource.title} fue publicado.`
          : parsed.data.disposition === "SUBMIT_FOR_REVIEW"
            ? `${resource.title} fue enviado a revisión.`
            : `${resource.title} fue guardado como borrador.`,
      resourceId: resource.id,
    };
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return { status: "error", message: error.message, values: actionValues };
    }

    if (error instanceof ResourceCreationError) {
      const moduleError = [
        "MODULE_NOT_FOUND",
        "MODULE_NOT_AVAILABLE",
        "MODULE_NOT_EDITABLE",
      ].includes(error.code);

      return {
        status: "error",
        message: error.message,
        fieldErrors: moduleError
          ? { moduleId: [error.message] }
          : error.code === "INVALID_CONTENT_IMAGE"
            ? { content: [error.message] }
          : error.code === "INVALID_DISPOSITION"
            ? { disposition: [error.message] }
            : undefined,
        values: actionValues,
      };
    }

    throw error;
  }
}
