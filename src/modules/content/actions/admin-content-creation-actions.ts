"use server";

import { Role } from "@/generated/prisma/enums";
import { createValidationError } from "@/modules/content/actions/form-action-state-helpers";
import {
  createLevelSchema,
  createModuleSchema,
  createSubjectSchema,
  getCreateLevelFormValues,
  getCreateModuleFormValues,
  getCreateSubjectFormValues,
} from "@/modules/content/schemas/admin-content-creation.schema";
import type {
  ContentCreationActionState,
  ContentCreationFieldErrors,
  ContentCreationValues,
} from "@/modules/content/types/content-creation-action-state";
import { AuthGuardError, requireRole } from "@/server/auth/guards";
import {
  CatalogCreationError,
  createCatalogLevel,
  createCatalogModule,
  createCatalogSubject,
} from "@/server/content/create-catalog-content";
import { revalidateContentPages } from "@/server/content/revalidate-content";

function knownCreationError(
  error: unknown,
  values: ContentCreationValues,
): ContentCreationActionState | null {
  if (error instanceof AuthGuardError) {
    return { status: "error", message: error.message, values };
  }

  if (error instanceof CatalogCreationError) {
    const fieldByCode = {
      DUPLICATE_LEVEL: "levelNumber",
      DUPLICATE_SUBJECT: "name",
      DUPLICATE_MODULE: "title",
      LEVEL_NOT_FOUND: "levelId",
      LEVEL_NOT_ACTIVE: "levelId",
      SUBJECT_NOT_FOUND: "subjectId",
      SUBJECT_NOT_ACTIVE: "subjectId",
    } as const satisfies Record<
      CatalogCreationError["code"],
      keyof ContentCreationFieldErrors
    >;

    return {
      status: "error",
      message: "No se pudo crear el contenido. Revisa el campo indicado.",
      fieldErrors: { [fieldByCode[error.code]]: [error.message] },
      values,
    };
  }

  return null;
}

export async function createAdminLevelAction(
  _previousState: ContentCreationActionState,
  formData: FormData,
): Promise<ContentCreationActionState> {
  const values = getCreateLevelFormValues(formData);
  const parsed = createLevelSchema.safeParse(values);

  if (!parsed.success) {
    return createValidationError(parsed.error.flatten().fieldErrors, values);
  }

  try {
    await requireRole(Role.ADMIN);
    const level = await createCatalogLevel(parsed.data);
    revalidateContentPages("published");

    return {
      status: "success",
      message: `El nivel ${level.levelNumber} fue creado correctamente.`,
      destinationHref: `/dashboard/admin/content/levels/${encodeURIComponent(level.id)}`,
      destinationLabel: "Ver nivel creado",
      createdId: level.id,
    };
  } catch (error) {
    const knownError = knownCreationError(error, values);
    if (knownError) return knownError;
    throw error;
  }
}

export async function createAdminSubjectAction(
  _previousState: ContentCreationActionState,
  formData: FormData,
): Promise<ContentCreationActionState> {
  const values = getCreateSubjectFormValues(formData);
  const parsed = createSubjectSchema.safeParse(values);

  if (!parsed.success) {
    return createValidationError(parsed.error.flatten().fieldErrors, values);
  }

  try {
    await requireRole(Role.ADMIN);
    const subject = await createCatalogSubject(parsed.data);
    revalidateContentPages("published");

    return {
      status: "success",
      message: `La materia ${subject.name} fue creada correctamente.`,
      destinationHref: `/dashboard/admin/content/subjects/${encodeURIComponent(subject.id)}`,
      destinationLabel: "Ver materia creada",
      createdId: subject.id,
    };
  } catch (error) {
    const knownError = knownCreationError(error, values);
    if (knownError) return knownError;
    throw error;
  }
}

export async function createAdminModuleAction(
  _previousState: ContentCreationActionState,
  formData: FormData,
): Promise<ContentCreationActionState> {
  const values = getCreateModuleFormValues(formData);
  const parsed = createModuleSchema.safeParse(values);

  if (!parsed.success) {
    return createValidationError(parsed.error.flatten().fieldErrors, values);
  }

  try {
    const admin = await requireRole(Role.ADMIN);
    const moduleRecord = await createCatalogModule(parsed.data, admin.id);
    revalidateContentPages(
      moduleRecord.publicationStatus === "PUBLISHED"
        ? "published"
        : "authoring",
    );

    return {
      status: "success",
      message:
        moduleRecord.publicationStatus === "PUBLISHED"
          ? `El módulo ${moduleRecord.title} fue publicado.`
          : `El módulo ${moduleRecord.title} fue guardado como borrador.`,
      destinationHref: `/dashboard/admin/content/modules/${encodeURIComponent(moduleRecord.id)}`,
      destinationLabel: "Ver módulo creado",
      createdId: moduleRecord.id,
    };
  } catch (error) {
    const knownError = knownCreationError(error, values);
    if (knownError) return knownError;
    throw error;
  }
}
