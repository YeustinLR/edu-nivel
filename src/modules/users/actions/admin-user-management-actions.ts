"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import {
  adminUserCreateSchema,
  getAdminUserCreateFormValues,
} from "@/modules/users/schemas/admin-user-create.schema";
import { adminUserDeleteSchema } from "@/modules/users/schemas/admin-user-delete.schema";
import type { AdminUserCreateActionState } from "@/modules/users/types/admin-user-create-action-state";
import type { AdminUserDeleteActionState } from "@/modules/users/types/admin-user-delete-action-state";
import { requireRole } from "@/server/auth/guards";
import {
  AdminUserCreationError,
  createAdminUser,
} from "@/server/users/create-admin-user";
import {
  AdminUserDeletionError,
  deleteAdminUser,
} from "@/server/users/delete-admin-user";

export async function createAdminUserAction(
  _previousState: AdminUserCreateActionState,
  formData: FormData,
): Promise<AdminUserCreateActionState> {
  const actor = await requireRole(Role.ADMIN);
  const rawValues = getAdminUserCreateFormValues(formData);
  const parsed = adminUserCreateSchema.safeParse(rawValues);
  const values = Object.fromEntries(
    ["name", "email", "role", "selectedLevelId"].flatMap((key) => {
      const value = rawValues[key as keyof typeof rawValues];
      return typeof value === "string" ? [[key, value]] : [];
    }),
  );

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos indicados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      values,
    };
  }

  try {
    const user = await createAdminUser(parsed.data, actor);
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/users");
    return { status: "success", userId: user.id, email: user.email };
  } catch (error) {
    if (error instanceof AdminUserCreationError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors:
          error.code === "EMAIL_IN_USE"
            ? { email: [error.message] }
            : error.code === "INVALID_LEVEL"
              ? { selectedLevelId: [error.message] }
              : undefined,
        values,
      };
    }
    throw error;
  }
}

export async function deleteAdminUserAction(
  _previousState: AdminUserDeleteActionState,
  formData: FormData,
): Promise<AdminUserDeleteActionState> {
  const actor = await requireRole(Role.ADMIN);
  const parsed = adminUserDeleteSchema.safeParse({
    userId: formData.get("userId"),
    confirmationEmail: formData.get("confirmationEmail"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa la confirmación y el motivo.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await deleteAdminUser(parsed.data, actor);
  } catch (error) {
    if (error instanceof AdminUserDeletionError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors:
          error.code === "EMAIL_MISMATCH"
            ? { confirmationEmail: [error.message] }
            : undefined,
      };
    }
    throw error;
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
  redirect("/dashboard/admin/users?deleted=1");
}
