import { z } from "zod";

export const adminModuleDeleteSchema = z.object({
  moduleId: z.string().trim().min(1),
  confirmationTitle: z
    .string()
    .trim()
    .min(1, "Escribe el título del módulo para confirmar.")
    .max(160),
});

export type AdminModuleDeleteInput = z.infer<typeof adminModuleDeleteSchema>;
