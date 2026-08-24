import { describe, expect, it } from "vitest";

import {
  reorderModulesSchema,
  reorderResourcesSchema,
  workspaceResourceContextSchema,
} from "@/modules/content/schemas/content-workspace.schema";

describe("content workspace schemas", () => {
  it("requires the full resource hierarchy for quick access", () => {
    expect(
      workspaceResourceContextSchema.safeParse({
        subjectId: "subject-1",
        moduleId: "module-1",
        resourceId: "resource-1",
      }).success,
    ).toBe(true);
    expect(
      workspaceResourceContextSchema.safeParse({
        moduleId: "module-1",
        resourceId: "resource-1",
      }).success,
    ).toBe(false);
  });

  it("rejects duplicated identifiers when reordering modules", () => {
    expect(
      reorderModulesSchema.safeParse({
        subjectId: "subject-1",
        moduleIds: ["module-1", "module-1"],
      }).success,
    ).toBe(false);
  });

  it("keeps resource reorder scoped to its subject and module", () => {
    expect(
      reorderResourcesSchema.parse({
        subjectId: "subject-1",
        moduleId: "module-1",
        resourceIds: ["resource-1", "resource-2"],
      }),
    ).toEqual({
      subjectId: "subject-1",
      moduleId: "module-1",
      resourceIds: ["resource-1", "resource-2"],
    });
  });
});
