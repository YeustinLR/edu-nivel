import { describe, expect, it } from "vitest";

import { PASSWORD_CONTAINS_EMAIL_MESSAGE } from "@/modules/auth/lib/password";
import { registerSchema } from "@/modules/auth/schemas/register.schema";

const VALID_REGISTER_INPUT = {
  role: "STUDENT",
  name: "Test User",
  email: "test@example.com",
  ageDeclared: 25,
  password: "Zx9!qwertyui",
  confirmPassword: "Zx9!qwertyui",
  acceptTerms: true,
  acceptPrivacy: true,
  adultDeclaration: true,
};

describe("registerSchema", () => {
  it("accepts valid registration data", () => {
    expect(registerSchema.safeParse(VALID_REGISTER_INPUT).success).toBe(true);
    expect(
      registerSchema.safeParse({
        ...VALID_REGISTER_INPUT,
        role: "TEACHER",
      }).success,
    ).toBe(true);
  });

  it.each(["ADMIN", "COLLABORATOR", "OTHER", undefined])(
    "rejects a public registration role of %s",
    (role) => {
      expect(
        registerSchema.safeParse({
          ...VALID_REGISTER_INPUT,
          role,
        }).success,
      ).toBe(false);
    },
  );

  it("normalizes email casing and surrounding whitespace", () => {
    const result = registerSchema.safeParse({
      ...VALID_REGISTER_INPUT,
      email: "  Test@Test.COM  ",
    });

    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("test@test.com");
  });

  it("rejects users below the minimum age", () => {
    expect(
      registerSchema.safeParse({
        ...VALID_REGISTER_INPUT,
        ageDeclared: 16,
      }).success,
    ).toBe(false);
  });

  it("rejects weak passwords", () => {
    expect(
      registerSchema.safeParse({
        ...VALID_REGISTER_INPUT,
        password: "aaaaaaaaaa",
        confirmPassword: "aaaaaaaaaa",
      }).success,
    ).toBe(false);
  });

  it("rejects passwords that contain the email local-part", () => {
    const result = registerSchema.safeParse({
      ...VALID_REGISTER_INPUT,
      email: "prueba1@example.com",
      password: "Prueba1!xyz",
      confirmPassword: "Prueba1!xyz",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => (
      issue.message === PASSWORD_CONTAINS_EMAIL_MESSAGE
    ))).toBe(true);
  });

  it("rejects mismatched password confirmation", () => {
    expect(
      registerSchema.safeParse({
        ...VALID_REGISTER_INPUT,
        confirmPassword: "Distinto1!",
      }).success,
    ).toBe(false);
  });

  it("rejects missing legal consent", () => {
    expect(
      registerSchema.safeParse({
        ...VALID_REGISTER_INPUT,
        acceptTerms: false,
      }).success,
    ).toBe(false);
  });
});
