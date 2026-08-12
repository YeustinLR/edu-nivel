import { z } from "zod";

import { Role } from "@/generated/prisma/enums";
import { passwordContainsEmail, PASSWORD_CONFIRM_REQUIRED_MESSAGE, PASSWORD_CONTAINS_EMAIL_MESSAGE, PASSWORD_MISMATCH_MESSAGE } from "@/modules/auth/lib/password";
import { emailSchema } from "@/modules/auth/schemas/email.schema";
import { strongPasswordSchema } from "@/modules/auth/schemas/password.schema";
import { invitablesRoles } from "@/modules/users/schemas/admin-user-invitation.schema";

const optionalLevelIdSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().min(1).nullable(),
);

export const adminUserCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Escribe un nombre de al menos 2 caracteres.").max(100),
    email: emailSchema.transform((email) => email.trim().toLowerCase()),
    role: z.enum(invitablesRoles, { error: "Selecciona un rol válido." }),
    selectedLevelId: optionalLevelIdSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, PASSWORD_CONFIRM_REQUIRED_MESSAGE),
  })
  .superRefine((data, ctx) => {
    const canSelectLevel = data.role === Role.STUDENT || data.role === Role.TEACHER;
    if (!canSelectLevel && data.selectedLevelId) {
      ctx.addIssue({
        code: "custom",
        path: ["selectedLevelId"],
        message: "Los colaboradores no utilizan un nivel seleccionado.",
      });
    }
    if (passwordContainsEmail(data.password, data.email)) {
      ctx.addIssue({ code: "custom", path: ["password"], message: PASSWORD_CONTAINS_EMAIL_MESSAGE });
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: PASSWORD_MISMATCH_MESSAGE });
    }
  });

export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>;

export function getAdminUserCreateFormValues(formData: FormData) {
  return {
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    selectedLevelId: formData.get("selectedLevelId"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };
}
