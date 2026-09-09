import { z } from "zod";

export const createContentImageIntentSchema = z
  .object({
    editorSessionId: z.string().trim().min(1).max(128),
    moduleId: z.string().trim().min(1).max(128).optional(),
    resourceId: z.string().trim().min(1).max(128).optional(),
    originalName: z.string().trim().min(1).max(255),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    sizeBytes: z.number().int().positive(),
  })
  .superRefine((value, context) => {
    if (Boolean(value.moduleId) === Boolean(value.resourceId)) {
      context.addIssue({
        code: "custom",
        path: ["moduleId"],
        message: "Indica el módulo de creación o el recurso que se está editando.",
      });
    }
    if (value.resourceId && value.editorSessionId !== value.resourceId) {
      context.addIssue({
        code: "custom",
        path: ["editorSessionId"],
        message: "La sesión del editor no coincide con el recurso.",
      });
    }
  });

export type CreateContentImageIntentInput = z.infer<
  typeof createContentImageIntentSchema
>;
