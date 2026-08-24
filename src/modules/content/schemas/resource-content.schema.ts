import { z } from "zod";

import {
  normalizeResourceContentForStorage,
  ResourceDocumentValidationError,
} from "@/modules/content/domain/resource-document";

export const optionalResourceDocumentContentSchema = z
  .string()
  .transform((value, context) => {
    try {
      return normalizeResourceContentForStorage(value) ?? undefined;
    } catch (error) {
      context.addIssue({
        code: "custom",
        message:
          error instanceof ResourceDocumentValidationError
            ? error.message
            : "El documento educativo no tiene un formato válido.",
      });
      return z.NEVER;
    }
  });
