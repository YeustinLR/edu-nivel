"use server";

import { ContentAudience, Role } from "@/generated/prisma/enums";
import { adminModuleDeleteSchema } from "@/modules/content/schemas/admin-module-delete.schema";
import type { AdminModuleDeleteActionState } from "@/modules/content/types/admin-module-delete-action-state";
import { requireRole } from "@/server/auth/guards";
import {
  CatalogModuleDeletionError,
  deleteCatalogModule,
} from "@/server/content/delete-catalog-module";
import { revalidateContentPages } from "@/server/content/revalidate-content";
import { redirect } from "next/navigation";

export async function deleteAdminModuleAction(
  _previousState: AdminModuleDeleteActionState,
  formData: FormData,
): Promise<AdminModuleDeleteActionState> {
  const parsed = adminModuleDeleteSchema.safeParse({
    moduleId: formData.get("moduleId"),
    confirmationTitle: formData.get("confirmationTitle"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Escribe el título exacto para confirmar la eliminación.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const actor = await requireRole(Role.ADMIN);
  let destination: Awaited<ReturnType<typeof deleteCatalogModule>>;
  try {
    destination = await deleteCatalogModule(parsed.data, actor);
  } catch (error) {
    if (error instanceof CatalogModuleDeletionError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors:
          error.code === "TITLE_MISMATCH"
            ? { confirmationTitle: [error.message] }
            : undefined,
      };
    }
    throw error;
  }

  revalidateContentPages("authoring");
  const audience =
    destination.audience === ContentAudience.TEACHER
      ? ContentAudience.TEACHER
      : ContentAudience.STUDENT;
  redirect(
    `/dashboard/admin/content/subjects/${encodeURIComponent(destination.subjectId)}?audience=${audience}`,
  );
}
