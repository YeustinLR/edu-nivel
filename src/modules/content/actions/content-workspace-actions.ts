"use server";

import { Role } from "@/generated/prisma/enums";
import {
  duplicateModuleSchema,
  reorderModulesSchema,
  reorderResourcesSchema,
  workspaceResourceContextSchema,
} from "@/modules/content/schemas/content-workspace.schema";
import { requireRole } from "@/server/auth/guards";
import { getResourceContentDetail } from "@/server/content/content-detail-queries";
import {
  duplicateCatalogModule,
  DuplicateModuleError,
} from "@/server/content/duplicate-catalog-module";
import { revalidateContentPages } from "@/server/content/revalidate-content";
import {
  ContentReorderError,
  reorderCatalogModules,
  reorderCatalogResources,
} from "@/server/content/reorder-catalog-content";

export type WorkspaceMutationResult =
  | { status: "success"; message: string; entityId?: string }
  | { status: "error"; message: string };

export async function getWorkspaceResourceDetailAction(input: unknown) {
  const parsed = workspaceResourceContextSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error" as const, message: "El recurso seleccionado no es válido." };
  }

  const actor = await requireRole(Role.ADMIN);
  const resource = await getResourceContentDetail({
    resourceId: parsed.data.resourceId,
    expectedModuleId: parsed.data.moduleId,
    expectedSubjectId: parsed.data.subjectId,
    actor,
  });
  if (!resource) {
    return {
      status: "error" as const,
      message: "El recurso no pertenece al módulo y la materia seleccionados.",
    };
  }

  return {
    status: "success" as const,
    resource,
  };
}

export async function reorderWorkspaceModulesAction(
  input: unknown,
): Promise<WorkspaceMutationResult> {
  const parsed = reorderModulesSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "El nuevo orden de módulos no es válido." };
  }

  try {
    const actor = await requireRole(Role.ADMIN);
    await reorderCatalogModules(parsed.data, actor);
    revalidateContentPages("published");
    return { status: "success", message: "Orden de módulos actualizado." };
  } catch (error) {
    if (error instanceof ContentReorderError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
}

export async function reorderWorkspaceResourcesAction(
  input: unknown,
): Promise<WorkspaceMutationResult> {
  const parsed = reorderResourcesSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "El nuevo orden de recursos no es válido." };
  }

  try {
    const actor = await requireRole(Role.ADMIN);
    await reorderCatalogResources(parsed.data, actor);
    revalidateContentPages("published");
    return { status: "success", message: "Orden de recursos actualizado." };
  } catch (error) {
    if (error instanceof ContentReorderError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
}

export async function duplicateWorkspaceModuleAction(
  input: unknown,
): Promise<WorkspaceMutationResult> {
  const parsed = duplicateModuleSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: "El módulo seleccionado no es válido." };
  }

  try {
    const actor = await requireRole(Role.ADMIN);
    const duplicate = await duplicateCatalogModule(parsed.data, actor);
    revalidateContentPages("authoring");
    return {
      status: "success",
      message: `${duplicate.title} fue creado como borrador.`,
      entityId: duplicate.id,
    };
  } catch (error) {
    if (error instanceof DuplicateModuleError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
}
