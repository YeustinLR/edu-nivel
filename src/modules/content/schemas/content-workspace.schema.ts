import { z } from "zod";

const entityId = z.string().trim().min(1).max(128);
const orderedIds = z.array(entityId).min(1).max(500).refine(
  (values) => new Set(values).size === values.length,
  "El orden contiene identificadores duplicados.",
);

export const workspaceResourceContextSchema = z.object({
  subjectId: entityId,
  moduleId: entityId,
  resourceId: entityId,
});

export const reorderModulesSchema = z.object({
  subjectId: entityId,
  moduleIds: orderedIds,
});

export const reorderResourcesSchema = z.object({
  subjectId: entityId,
  moduleId: entityId,
  resourceIds: orderedIds,
});

export const duplicateModuleSchema = z.object({
  subjectId: entityId,
  moduleId: entityId,
});

export type ReorderModulesInput = z.output<typeof reorderModulesSchema>;
export type ReorderResourcesInput = z.output<typeof reorderResourcesSchema>;
export type DuplicateModuleInput = z.output<typeof duplicateModuleSchema>;
