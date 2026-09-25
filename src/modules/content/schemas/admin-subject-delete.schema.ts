import { z } from "zod";

export const adminSubjectDeleteSchema = z.object({
  subjectId: z.string().trim().min(1),
  confirmationName: z
    .string()
    .trim()
    .min(1, "Escribe el nombre de la materia para confirmar.")
    .max(120),
});

export type AdminSubjectDeleteInput = z.infer<
  typeof adminSubjectDeleteSchema
>;
