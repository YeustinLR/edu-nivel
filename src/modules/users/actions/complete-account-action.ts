"use server";

import { redirect } from "next/navigation";

import { getCompleteAdminCreatedAccountSchema } from "@/modules/users/schemas/complete-admin-created-account.schema";
import type { CompleteAccountActionState } from "@/modules/users/types/complete-account-action-state";
import { requireAccountSetupUser } from "@/server/auth/guards";
import {
  CompleteAccountError,
  completeAdminCreatedAccount,
} from "@/server/users/complete-admin-created-account";

export async function completeAccountAction(
  _previousState: CompleteAccountActionState,
  formData: FormData,
): Promise<CompleteAccountActionState> {
  const { user, session } = await requireAccountSetupUser();
  const schema = getCompleteAdminCreatedAccountSchema({
    email: user.email,
    passwordChangeRequired: user.passwordChangeRequired,
  });
  const parsed = schema.safeParse({
    ageDeclared: formData.get("ageDeclared"),
    adultDeclaration: formData.get("adultDeclaration") === "on",
    acceptTerms: formData.get("acceptTerms") === "on",
    acceptPrivacy: formData.get("acceptPrivacy") === "on",
    currentPassword: formData.get("currentPassword") ?? undefined,
    password: formData.get("password") ?? undefined,
    confirmPassword: formData.get("confirmPassword") ?? undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los campos indicados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await completeAdminCreatedAccount({
      userId: user.id,
      sessionId: session.id,
      ageDeclared: parsed.data.ageDeclared,
      passwordChangeRequired: user.passwordChangeRequired,
      currentPassword: parsed.data.currentPassword,
      password: parsed.data.password,
    });
  } catch (error) {
    if (error instanceof CompleteAccountError) {
      return {
        status: "error",
        message: error.message,
        fieldErrors:
          error.code === "INVALID_PASSWORD"
            ? { currentPassword: [error.message] }
            : undefined,
      };
    }
    throw error;
  }

  redirect("/dashboard");
}
