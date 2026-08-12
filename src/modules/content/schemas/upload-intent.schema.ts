import { z } from "zod";
import { contentCreationDispositions } from "@/modules/content/domain/content-creation";

export const createUploadIntentSchema = z.object({
  moduleId: z.string().trim().min(1),
  resourceType: z.enum(["PDF", "IMAGE"]),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1_000).optional(),
  originalName: z.string().trim().min(1).max(255),
  altText: z.string().trim().max(300).optional(),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().positive(),
  disposition: z.enum(contentCreationDispositions),
});

export type CreateUploadIntentInput = z.infer<
  typeof createUploadIntentSchema
>;
