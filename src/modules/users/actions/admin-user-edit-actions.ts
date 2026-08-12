"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import {
  adminUserEditSchema,
  getAdminUserEditFormValues,
} from "@/modules/users/schemas/admin-user-edit.schema";
import type {
  AdminUserEditActionState,
  AdminUserEditFieldErrors,
  AdminUserEditValues,
} from "@/modules/users/types/admin-user-edit-action-state";
import { requireRole } from "@/server/auth/guards";
import {
  AdminUserUpdateError,
  updateAdminUser,
} from "@/server/users/update-admin-user";

function toActionValues(values: Record<string, unknown>): AdminUserEditValues {
  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, string] => {
      return typeof entry[1] === "string";
    }),
  ) as AdminUserEditValues;
}

function knownUpdateError(
  error: unknown,
  values: AdminUserEditValues,
): AdminUserEditActionState | null {
  if (!(error instanceof AdminUserUpdateError)) return null;

  const fieldByCode: Partial<
    Record<AdminUserUpdateError["code"], keyof AdminUserEditFieldErrors>
  > = {
    EDIT_CONFLICT: "expectedUpdatedAt",
    SELF_ROLE_CHANGE: "role",
    ADMIN_ROLE_PROTECTED: "role",
    INVALID_LEVEL: "selectedLevelId",
  };
  const field = fieldByCode[error.code];

  return {
    status: "error",
    message: error.message,
    fieldErrors: field ? { [field]: [error.message] } : undefined,
    values,
  };
}

export async function updateAdminUserAction(
  _previousState: AdminUserEditActionState,
  formData: FormData,
): Promise<AdminUserEditActionState> {
  const actor = await requireRole(Role.ADMIN);
  const rawValues = getAdminUserEditFormValues(formData);
  const values = toActionValues(rawValues);
  const parsed = adminUserEditSchema.safeParse(rawValues);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos indicados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      values,
    };
  }

  try {
    await updateAdminUser(parsed.data, actor);
  } catch (error) {
    const known = knownUpdateError(error, values);
    if (known) return known;
    throw error;
  }

  const userHref = `/dashboard/admin/users/${encodeURIComponent(parsed.data.id)}`;
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/users");
  revalidatePath(userHref);
  redirect(userHref);
}
