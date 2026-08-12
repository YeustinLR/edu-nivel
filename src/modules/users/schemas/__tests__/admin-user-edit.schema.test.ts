import { describe, expect, it } from "vitest";

import { Role } from "@/generated/prisma/enums";
import { adminUserEditSchema } from "@/modules/users/schemas/admin-user-edit.schema";

const validInput = {
  id: "user-1",
  expectedUpdatedAt: "2026-08-07T12:00:00.000Z",
  name: "Ana Docente",
  role: Role.TEACHER,
  selectedLevelId: "level-7",
};

describe("adminUserEditSchema", () => {
  it("normalizes editable values", () => {
    expect(
      adminUserEditSchema.parse({
        ...validInput,
        name: "  Ana Docente  ",
        selectedLevelId: "",
      }),
    ).toMatchObject({
      name: "Ana Docente",
      selectedLevelId: null,
      role: Role.TEACHER,
    });
  });

  it("rejects unknown roles and invalid dates", () => {
    const result = adminUserEditSchema.safeParse({
      ...validInput,
      role: "OWNER",
      expectedUpdatedAt: "not-a-date",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toMatchObject({
        role: expect.any(Array),
        expectedUpdatedAt: expect.any(Array),
      });
    }
  });

  it("rejects levels for roles that do not learn by level", () => {
    const result = adminUserEditSchema.safeParse({
      ...validInput,
      role: Role.COLLABORATOR,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.selectedLevelId).toEqual([
        "Este rol no utiliza un nivel seleccionado.",
      ]);
    }
  });
});
