"use server";

import { revalidatePath } from "next/cache";

import { Role } from "@/generated/prisma/enums";
import {
  adminUserSuspensionSchema,
  getAdminUserSuspensionFormValues,
} from "@/modules/users/schemas/admin-user-suspension.schema";
import type { AdminUserSuspensionActionState } from "@/modules/users/types/admin-user-suspension-action-state";
import { requireRole } from "@/server/auth/guards";
import {
  UserSuspensionError,
  manageUserSuspension,
} from "@/server/users/manage-user-suspension";

export async function manageAdminUserSuspensionAction(
  _previousState: AdminUserSuspensionActionState,
  formData: FormData,
): Promise<AdminUserSuspensionActionState> {
  const actor = await requireRole(Role.ADMIN);
  const rawValues = getAdminUserSuspensionFormValues(formData);
  const parsed = adminUserSuspensionSchema.safeParse(rawValues);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos indicados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await manageUserSuspension(parsed.data, actor);
    revalidatePath("/dashboard/admin/users");
    revalidatePath(`/dashboard/admin/users/${encodeURIComponent(parsed.data.userId)}`);
    return {
      status: "success",
      message:
        result.operation === "suspend"
          ? "El usuario fue suspendido y sus sesiones fueron revocadas."
          : "El usuario fue reactivado correctamente.",
    };
  } catch (error) {
    if (error instanceof UserSuspensionError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
}
