import { z } from "zod";
import { contentCreationDispositions } from "@/modules/content/domain/content-creation";
import { optionalResourceDocumentContentSchema } from "@/modules/content/schemas/resource-content.schema";

export const createUploadIntentSchema = z.object({
  editorSessionId: z.string().trim().min(1).max(128),
  moduleId: z.string().trim().min(1),
  expectedSubjectId: z.string().trim().min(1).max(128).optional(),
  resourceType: z.enum(["PDF", "IMAGE"]),
  title: z.string().trim().min(2).max(160),
  instructions: z.string().trim().max(1_000).optional(),
  content: optionalResourceDocumentContentSchema.optional(),
  estimatedMinutes: z.number().int().min(1).max(10_000).optional(),
  originalName: z.string().trim().min(1).max(255),
  altText: z.string().trim().max(300).optional(),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().positive(),
  disposition: z.enum(contentCreationDispositions),
});

export type CreateUploadIntentInput = z.infer<
  typeof createUploadIntentSchema
>;
