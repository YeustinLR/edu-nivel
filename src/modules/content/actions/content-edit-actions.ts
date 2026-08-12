"use server";

import { Role } from "@/generated/prisma/enums";
import {
  createValidationError,
  toActionValues,
} from "@/modules/content/actions/form-action-state-helpers";
import {
  contentAvailabilitySchema,
  getContentAvailabilityFormValues,
  getUpdateLevelFormValues,
  getUpdateModuleFormValues,
  getUpdateResourceFormValues,
  getUpdateSubjectFormValues,
  updateLevelSchema,
  updateModuleSchema,
  updateResourceSchema,
  updateSubjectSchema,
} from "@/modules/content/schemas/content-edit.schema";
import type {
  ContentEditActionState,
  ContentEditFieldErrors,
  ContentEditValues,
} from "@/modules/content/types/content-edit-action-state";
import { AuthGuardError, requireRole } from "@/server/auth/guards";
import { revalidateContentPages } from "@/server/content/revalidate-content";
import {
  ContentUpdateError,
  updateCatalogLevel,
  updateCatalogModule,
  updateCatalogResource,
  updateCatalogSubject,
} from "@/server/content/update-content";
import { setCatalogContentAvailability } from "@/server/content/set-content-availability";

function knownEditError(
  error: unknown,
  values: ContentEditValues,
  duplicateField: keyof ContentEditFieldErrors = "title",
): ContentEditActionState | null {
  if (error instanceof AuthGuardError || error instanceof ContentUpdateError) {
    const fieldByCode: Partial<
      Record<ContentUpdateError["code"], keyof ContentEditFieldErrors>
    > = {
      DUPLICATE: duplicateField,
      INVALID_RESOURCE_DATA: "content",
      EDIT_CONFLICT: "expectedUpdatedAt",
    };
    const field =
      error instanceof ContentUpdateError ? fieldByCode[error.code] : undefined;

    return {
      status: "error",
      message: error.message,
      fieldErrors: field ? { [field]: [error.message] } : undefined,
      values,
    };
  }
  return null;
}

export async function updateLevelContentAction(
  _previousState: ContentEditActionState,
  formData: FormData,
): Promise<ContentEditActionState> {
  const values = getUpdateLevelFormValues(formData);
  const parsed = updateLevelSchema.safeParse(values);
  if (!parsed.success) {
    return createValidationError(parsed.error.flatten().fieldErrors, toActionValues(values));
  }

  try {
    const actor = await requireRole(Role.ADMIN);
    await updateCatalogLevel(parsed.data, actor);
    revalidateContentPages();
    return { status: "success", message: "El nivel fue actualizado." };
  } catch (error) {
    const known = knownEditError(
      error,
      toActionValues(values),
      "levelNumber",
    );
    if (known) return known;
    throw error;
  }
}

export async function updateSubjectContentAction(
  _previousState: ContentEditActionState,
  formData: FormData,
): Promise<ContentEditActionState> {
  const values = getUpdateSubjectFormValues(formData);
  const parsed = updateSubjectSchema.safeParse(values);
  if (!parsed.success) {
    return createValidationError(parsed.error.flatten().fieldErrors, toActionValues(values));
  }

  try {
    const actor = await requireRole(Role.ADMIN);
    await updateCatalogSubject(parsed.data, actor);
    revalidateContentPages();
    return { status: "success", message: "La materia fue actualizada." };
  } catch (error) {
    const known = knownEditError(error, toActionValues(values), "name");
    if (known) return known;
    throw error;
  }
}

export async function updateModuleContentAction(
  _previousState: ContentEditActionState,
  formData: FormData,
): Promise<ContentEditActionState> {
  const values = getUpdateModuleFormValues(formData);
  const parsed = updateModuleSchema.safeParse(values);
  if (!parsed.success) {
    return createValidationError(parsed.error.flatten().fieldErrors, toActionValues(values));
  }

  try {
    const actor = await requireRole([Role.ADMIN, Role.COLLABORATOR]);
    await updateCatalogModule(parsed.data, actor);
    revalidateContentPages();
    return { status: "success", message: "El módulo fue actualizado." };
  } catch (error) {
    const known = knownEditError(error, toActionValues(values));
    if (known) return known;
    throw error;
  }
}

export async function updateResourceContentAction(
  _previousState: ContentEditActionState,
  formData: FormData,
): Promise<ContentEditActionState> {
  const values = getUpdateResourceFormValues(formData);
  const parsed = updateResourceSchema.safeParse(values);
  if (!parsed.success) {
    return createValidationError(parsed.error.flatten().fieldErrors, toActionValues(values));
  }

  try {
    const actor = await requireRole([Role.ADMIN, Role.COLLABORATOR]);
    await updateCatalogResource(parsed.data, actor);
    revalidateContentPages();
    return { status: "success", message: "El recurso fue actualizado." };
  } catch (error) {
    const known = knownEditError(error, toActionValues(values));
    if (known) return known;
    throw error;
  }
}

export async function setContentAvailabilityAction(
  _previousState: ContentEditActionState,
  formData: FormData,
): Promise<ContentEditActionState> {
  const values = getContentAvailabilityFormValues(formData);
  const parsed = contentAvailabilitySchema.safeParse(values);
  if (!parsed.success) {
    return createValidationError(parsed.error.flatten().fieldErrors, toActionValues(values));
  }

  try {
    const actor = await requireRole([Role.ADMIN, Role.COLLABORATOR]);
    await setCatalogContentAvailability(parsed.data, actor);
    revalidateContentPages();
    return {
      status: "success",
      message: parsed.data.isActive
        ? "El contenido fue reactivado."
        : "El contenido fue archivado.",
    };
  } catch (error) {
    const known = knownEditError(error, toActionValues(values));
    if (known) return known;
    throw error;
  }
}
