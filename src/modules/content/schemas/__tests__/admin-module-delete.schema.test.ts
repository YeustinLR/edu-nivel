import { describe, expect, it } from "vitest";

import { adminModuleDeleteSchema } from "@/modules/content/schemas/admin-module-delete.schema";

describe("admin module delete schema", () => {
  it("accepts a module id and an exact confirmation title", () => {
    expect(
      adminModuleDeleteSchema.parse({
        moduleId: "module-1",
        confirmationTitle: "Números naturales",
      }),
    ).toEqual({
      moduleId: "module-1",
      confirmationTitle: "Números naturales",
    });
  });

  it("rejects empty confirmation data", () => {
    expect(
      adminModuleDeleteSchema.safeParse({
        moduleId: "",
        confirmationTitle: "   ",
      }).success,
    ).toBe(false);
  });
});
