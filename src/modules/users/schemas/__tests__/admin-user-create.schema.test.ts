import { describe, expect, it } from "vitest";

import { Role } from "@/generated/prisma/enums";
import { adminUserCreateSchema } from "@/modules/users/schemas/admin-user-create.schema";

const valid = {
  name: "Ana Directa",
  email: "ANA@EXAMPLE.COM",
  role: Role.STUDENT,
  selectedLevelId: "level-7",
  password: "Temporal1!Segura",
  confirmPassword: "Temporal1!Segura",
};

describe("adminUserCreateSchema", () => {
  it("normalizes a valid directly-created account", () => {
    expect(adminUserCreateSchema.parse(valid)).toMatchObject({ email: "ana@example.com" });
  });

  it("rejects ADMIN creation and weak temporary passwords", () => {
    const result = adminUserCreateSchema.safeParse({
      ...valid,
      role: Role.ADMIN,
      password: "weak",
      confirmPassword: "weak",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toMatchObject({
        role: expect.any(Array),
        password: expect.any(Array),
      });
    }
  });
});
