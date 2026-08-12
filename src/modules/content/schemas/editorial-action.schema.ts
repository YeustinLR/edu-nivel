import { z } from "zod";

import { editorialTransitions } from "@/modules/content/domain/editorial-workflow";

export const editorialActionSchema = z
  .object({
    targetType: z.enum(["module", "resource"]),
    targetId: z.string().trim().min(1).max(128),
    parentId: z.string().trim().min(1).max(128),
    transition: z.enum(editorialTransitions),
    reviewNote: z.string().trim().max(500).optional(),
    reviewConfirmed: z.preprocess(
      (value) => value === true || value === "true" || value === "on",
      z.boolean(),
    ),
  })
  .superRefine((input, context) => {
    if (
      input.transition === "REQUEST_CHANGES" &&
      (!input.reviewNote || input.reviewNote.length < 3)
    ) {
      context.addIssue({
        code: "custom",
        path: ["reviewNote"],
        message: "Escribe una observación de al menos 3 caracteres.",
      });
    }

    if (input.transition === "PUBLISH" && !input.reviewConfirmed) {
      context.addIssue({
        code: "custom",
        path: ["reviewConfirmed"],
        message: "Confirma que revisaste el contenido antes de publicarlo.",
      });
    }
  });

export type EditorialActionInput = z.infer<typeof editorialActionSchema>;
