import { z } from "zod";

import { Role } from "@/generated/prisma/enums";

const optionalLevelIdSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().min(1).nullable(),
);

export const adminUserEditSchema = z
  .object({
    id: z.string().trim().min(1, "El usuario es obligatorio."),
    expectedUpdatedAt: z.coerce.date({ error: "La versión del usuario no es válida." }),
    name: z
      .string()
      .trim()
      .min(2, "Escribe un nombre de al menos 2 caracteres.")
      .max(100, "El nombre no puede superar 100 caracteres."),
    role: z.enum(Role, { error: "Selecciona un rol válido." }),
    selectedLevelId: optionalLevelIdSchema,
  })
  .superRefine((data, ctx) => {
    const canSelectLevel = data.role === Role.STUDENT || data.role === Role.TEACHER;

    if (!canSelectLevel && data.selectedLevelId) {
      ctx.addIssue({
        code: "custom",
        path: ["selectedLevelId"],
        message: "Este rol no utiliza un nivel seleccionado.",
      });
    }
  });

export type AdminUserEditInput = z.infer<typeof adminUserEditSchema>;

export function getAdminUserEditFormValues(formData: FormData) {
  return {
    id: formData.get("id"),
    expectedUpdatedAt: formData.get("expectedUpdatedAt"),
    name: formData.get("name"),
    role: formData.get("role"),
    selectedLevelId: formData.get("selectedLevelId"),
  };
}
