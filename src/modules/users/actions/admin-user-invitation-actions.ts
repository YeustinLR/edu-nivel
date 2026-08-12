"use server";

import { revalidatePath } from "next/cache";

import { Role } from "@/generated/prisma/enums";
import {
  adminUserInvitationSchema,
  getAdminUserInvitationFormValues,
} from "@/modules/users/schemas/admin-user-invitation.schema";
import type {
  AdminUserInvitationActionState,
  AdminUserInvitationFieldErrors,
  AdminUserInvitationValues,
} from "@/modules/users/types/admin-user-invitation-action-state";
import { adminUserInvitationOperationSchema } from "@/modules/users/schemas/admin-user-invitation-operation.schema";
import type { AdminUserInvitationOperationState } from "@/modules/users/types/admin-user-invitation-operation-state";
import { requireRole } from "@/server/auth/guards";
import {
  UserInvitationCreationError,
  createUserInvitation,
} from "@/server/users/create-user-invitation";
import {
  UserInvitationOperationError,
  manageUserInvitation,
} from "@/server/users/manage-user-invitation";

function toActionValues(values: Record<string, unknown>): AdminUserInvitationValues {
  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, string] => {
      return typeof entry[1] === "string";
    }),
  ) as AdminUserInvitationValues;
}

export async function createAdminUserInvitationAction(
  _previousState: AdminUserInvitationActionState,
  formData: FormData,
): Promise<AdminUserInvitationActionState> {
  const actor = await requireRole(Role.ADMIN);
  const rawValues = getAdminUserInvitationFormValues(formData);
  const values = toActionValues(rawValues);
  const parsed = adminUserInvitationSchema.safeParse(rawValues);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos indicados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      values,
    };
  }

  try {
    await createUserInvitation(parsed.data, actor);
  } catch (error) {
    if (error instanceof UserInvitationCreationError) {
      const fieldByCode: Partial<
        Record<
          UserInvitationCreationError["code"],
          keyof AdminUserInvitationFieldErrors
        >
      > = {
        EMAIL_IN_USE: "email",
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
    throw error;
  }

  revalidatePath("/dashboard/admin/users");
  return {
    status: "success",
    message: "La invitación fue enviada correctamente.",
    email: parsed.data.email,
  };
}

export async function manageAdminUserInvitationAction(
  _previousState: AdminUserInvitationOperationState,
  formData: FormData,
): Promise<AdminUserInvitationOperationState> {
  const actor = await requireRole(Role.ADMIN);
  const parsed = adminUserInvitationOperationSchema.safeParse({
    invitationId: formData.get("invitationId"),
    operation: formData.get("operation"),
  });

  if (!parsed.success) {
    return { status: "error", message: "La solicitud no es válida." };
  }

  try {
    const result = await manageUserInvitation(parsed.data, actor);
    revalidatePath("/dashboard/admin/users");
    return {
      status: "success",
      invitationId: parsed.data.invitationId,
      message:
        result.operation === "resend"
          ? "Enviamos una invitación nueva. El enlace anterior dejó de funcionar."
          : "La invitación fue cancelada.",
    };
  } catch (error) {
    if (
      error instanceof UserInvitationOperationError ||
      error instanceof UserInvitationCreationError
    ) {
      return {
        status: "error",
        invitationId: parsed.data.invitationId,
        message: error.message,
      };
    }
    throw error;
  }
}
