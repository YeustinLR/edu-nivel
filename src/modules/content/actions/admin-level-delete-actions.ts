"use server";

import { Role } from "@/generated/prisma/enums";
import { adminLevelDeleteSchema } from "@/modules/content/schemas/admin-level-delete.schema";
import type { AdminLevelDeleteActionState } from "@/modules/content/types/admin-level-delete-action-state";
import { requireRole } from "@/server/auth/guards";
import {
  CatalogLevelDeletionError,
  deleteCatalogLevel,
} from "@/server/content/delete-catalog-level";
import { revalidateContentPages } from "@/server/content/revalidate-content";
import { redirect } from "next/navigation";

export async function deleteAdminLevelAction(
  _previousState: AdminLevelDeleteActionState,
  formData: FormData,
): Promise<AdminLevelDeleteActionState> {
  const parsed = adminLevelDeleteSchema.safeParse({
    levelId: formData.get("levelId"),
    confirmationLabel: formData.get("confirmationLabel"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Escribe el nombre exacto del nivel para confirmar la eliminación.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const actor = await requireRole(Role.ADMIN);
  try {
    await deleteCatalogLevel(parsed.data, actor);
  } catch (error) {
    if (error instanceof CatalogLevelDeletionError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors:
          error.code === "LABEL_MISMATCH"
            ? { confirmationLabel: [error.message] }
            : undefined,
      };
    }
    throw error;
  }

  revalidateContentPages("published");
  redirect("/dashboard/admin/content/catalog");
}
