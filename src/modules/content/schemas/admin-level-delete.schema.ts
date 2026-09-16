import { z } from "zod";

export const adminLevelDeleteSchema = z.object({
  levelId: z.string().trim().min(1),
  confirmationLabel: z.string().trim().min(1).max(80),
});

export type AdminLevelDeleteInput = z.infer<typeof adminLevelDeleteSchema>;
