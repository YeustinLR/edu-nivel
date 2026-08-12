import { z } from "zod";

const optionalDateSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.coerce.date().nullable(),
);

export const adminUserSuspensionSchema = z
  .object({
    userId: z.string().trim().min(1, "El usuario es obligatorio."),
    operation: z.enum(["suspend", "reactivate"]),
    reason: z
      .string()
      .trim()
      .min(3, "Escribe un motivo de al menos 3 caracteres.")
      .max(500, "El motivo no puede superar 500 caracteres."),
    expiresAt: optionalDateSchema,
  })
  .superRefine((values, ctx) => {
    if (
      values.operation === "suspend" &&
      values.expiresAt &&
      values.expiresAt <= new Date()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "La fecha de reactivación debe estar en el futuro.",
      });
    }
  });

export type AdminUserSuspensionInput = z.infer<
  typeof adminUserSuspensionSchema
>;

export function getAdminUserSuspensionFormValues(formData: FormData) {
  return {
    userId: formData.get("userId"),
    operation: formData.get("operation"),
    reason: formData.get("reason"),
    expiresAt: formData.get("expiresAt"),
  };
}
