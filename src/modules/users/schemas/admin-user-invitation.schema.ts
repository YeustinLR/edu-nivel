import { z } from "zod";

import { Role } from "@/generated/prisma/enums";
import { emailSchema } from "@/modules/auth/schemas/email.schema";

export const invitablesRoles = [
  Role.STUDENT,
  Role.TEACHER,
  Role.COLLABORATOR,
] as const;

const optionalLevelIdSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().min(1).nullable(),
);

export const adminUserInvitationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Escribe un nombre de al menos 2 caracteres.")
      .max(100, "El nombre no puede superar 100 caracteres."),
    email: emailSchema.transform((email) => email.trim().toLowerCase()),
    role: z.enum(invitablesRoles, { error: "Selecciona un rol válido." }),
    selectedLevelId: optionalLevelIdSchema,
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
  });

export type AdminUserInvitationInput = z.infer<
  typeof adminUserInvitationSchema
>;

export function getAdminUserInvitationFormValues(formData: FormData) {
  return {
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    selectedLevelId: formData.get("selectedLevelId"),
  };
}
