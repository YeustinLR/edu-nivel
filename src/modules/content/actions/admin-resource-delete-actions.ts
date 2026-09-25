"use server";

import { Role } from "@/generated/prisma/enums";
import { adminResourceDeleteSchema } from "@/modules/content/schemas/admin-resource-delete.schema";
import type { AdminResourceDeleteActionState } from "@/modules/content/types/admin-resource-delete-action-state";
import { requireRole } from "@/server/auth/guards";
import {
  CatalogResourceDeletionError,
  deleteCatalogResource,
} from "@/server/content/delete-catalog-resource";
import { revalidateContentPages } from "@/server/content/revalidate-content";
import { redirect } from "next/navigation";

export async function deleteAdminResourceAction(
  _previousState: AdminResourceDeleteActionState,
  formData: FormData,
): Promise<AdminResourceDeleteActionState> {
  const parsed = adminResourceDeleteSchema.safeParse({
    resourceId: formData.get("resourceId"),
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
  let destination: Awaited<ReturnType<typeof deleteCatalogResource>>;
  try {
    destination = await deleteCatalogResource(parsed.data, actor);
  } catch (error) {
    if (error instanceof CatalogResourceDeletionError) {
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

  revalidateContentPages("published");
  redirect(
    `/dashboard/admin/content/modules/${encodeURIComponent(destination.moduleId)}`,
  );
}
