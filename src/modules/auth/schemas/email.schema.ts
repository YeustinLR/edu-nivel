import { email, string } from "zod";

import { AUTH_VALIDATION_MESSAGES } from "@/modules/auth/lib/messages";

// Campo de correo compartido por todos los flujos de auth: normaliza una sola vez.
export const emailSchema = string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(email(AUTH_VALIDATION_MESSAGES.emailInvalid));
