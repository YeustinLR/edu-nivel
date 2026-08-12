import { describe, expect, it } from "vitest";

import { getCompleteAdminCreatedAccountSchema } from "@/modules/users/schemas/complete-admin-created-account.schema";

describe("getCompleteAdminCreatedAccountSchema", () => {
  const schema = getCompleteAdminCreatedAccountSchema({
    email: "ana@example.com",
    passwordChangeRequired: true,
  });

  it("accepts a secure password change and all legal declarations", () => {
    expect(
      schema.safeParse({
        ageDeclared: 30,
        adultDeclaration: true,
        acceptTerms: true,
        acceptPrivacy: true,
        currentPassword: "Temporal1!Segura",
        password: "Personal2!Segura",
        confirmPassword: "Personal2!Segura",
      }).success,
    ).toBe(true);
  });

  it("rejects underage or incomplete onboarding", () => {
    const result = schema.safeParse({
      ageDeclared: 17,
      adultDeclaration: false,
      acceptTerms: false,
      acceptPrivacy: false,
      currentPassword: "Temporal1!Segura",
      password: "Temporal1!Segura",
      confirmPassword: "Temporal1!Segura",
    });
    expect(result.success).toBe(false);
  });
});
