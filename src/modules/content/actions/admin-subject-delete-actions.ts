"use server";

import { Role } from "@/generated/prisma/enums";
import { adminSubjectDeleteSchema } from "@/modules/content/schemas/admin-subject-delete.schema";
import type { AdminSubjectDeleteActionState } from "@/modules/content/types/admin-subject-delete-action-state";
import { requireRole } from "@/server/auth/guards";
import {
  CatalogSubjectDeletionError,
  deleteCatalogSubject,
} from "@/server/content/delete-catalog-subject";
import { revalidateContentPages } from "@/server/content/revalidate-content";
import { redirect } from "next/navigation";

export async function deleteAdminSubjectAction(
  _previousState: AdminSubjectDeleteActionState,
  formData: FormData,
): Promise<AdminSubjectDeleteActionState> {
  const parsed = adminSubjectDeleteSchema.safeParse({
    subjectId: formData.get("subjectId"),
    confirmationName: formData.get("confirmationName"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Escribe el nombre exacto de la materia para confirmar la eliminación.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const actor = await requireRole(Role.ADMIN);
  let destination: Awaited<ReturnType<typeof deleteCatalogSubject>>;
  try {
    destination = await deleteCatalogSubject(parsed.data, actor);
  } catch (error) {
    if (error instanceof CatalogSubjectDeletionError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors:
          error.code === "NAME_MISMATCH"
            ? { confirmationName: [error.message] }
            : undefined,
      };
    }
    throw error;
  }

  revalidateContentPages("published");
  redirect(
    `/dashboard/admin/content/levels/${encodeURIComponent(destination.levelId)}`,
  );
}
