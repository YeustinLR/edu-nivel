import { z } from "zod";

import { isAllowedDeclaredAge, parseDeclaredAge } from "@/modules/auth/lib/age";
import { PASSWORD_CONFIRM_REQUIRED_MESSAGE, PASSWORD_CONTAINS_EMAIL_MESSAGE, PASSWORD_MISMATCH_MESSAGE, passwordContainsEmail } from "@/modules/auth/lib/password";
import { strongPasswordSchema } from "@/modules/auth/schemas/password.schema";

export function getCompleteAdminCreatedAccountSchema(options: {
  email: string;
  passwordChangeRequired: boolean;
}) {
  return z
    .object({
      ageDeclared: z.coerce.number().int().refine(isAllowedDeclaredAge, "Debes tener 18 años o más."),
      adultDeclaration: z.literal(true, { error: "Debes declarar que tienes 18 años o más." }),
      acceptTerms: z.literal(true, { error: "Debes aceptar los términos legales." }),
      acceptPrivacy: z.literal(true, { error: "Debes aceptar la política de privacidad." }),
      currentPassword: options.passwordChangeRequired
        ? z.string().min(1, "Escribe la contraseña temporal.")
        : z.string().optional(),
      password: options.passwordChangeRequired ? strongPasswordSchema : z.string().optional(),
      confirmPassword: options.passwordChangeRequired
        ? z.string().min(1, PASSWORD_CONFIRM_REQUIRED_MESSAGE)
        : z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (!parseDeclaredAge(data.ageDeclared)) {
        ctx.addIssue({ code: "custom", path: ["ageDeclared"], message: "Selecciona una edad válida." });
      }
      if (!options.passwordChangeRequired) return;
      if (data.password && passwordContainsEmail(data.password, options.email)) {
        ctx.addIssue({ code: "custom", path: ["password"], message: PASSWORD_CONTAINS_EMAIL_MESSAGE });
      }
      if (data.password !== data.confirmPassword) {
        ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: PASSWORD_MISMATCH_MESSAGE });
      }
      if (data.currentPassword === data.password) {
        ctx.addIssue({ code: "custom", path: ["password"], message: "La nueva contraseña debe ser diferente de la temporal." });
      }
    });
}
