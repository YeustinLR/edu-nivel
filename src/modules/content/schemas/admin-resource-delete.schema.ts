import { z } from "zod";

export const adminResourceDeleteSchema = z.object({
  resourceId: z.string().trim().min(1),
  confirmationTitle: z
    .string()
    .trim()
    .min(1, "Escribe el título del recurso para confirmar.")
    .max(160),
});

export type AdminResourceDeleteInput = z.infer<
  typeof adminResourceDeleteSchema
>;
