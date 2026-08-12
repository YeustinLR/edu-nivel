import { describe, expect, it } from "vitest";

import { PASSWORD_CONTAINS_EMAIL_MESSAGE } from "@/modules/auth/lib/password";
import { resetPasswordSchema } from "@/modules/auth/schemas/reset-password.schema";

const VALID_RESET_INPUT = {
  email: "test@example.com",
  otp: "123456",
  password: "Zx9!qwertyui",
  confirmPassword: "Zx9!qwertyui",
};

describe("resetPasswordSchema", () => {
  it("accepts valid reset data", () => {
    expect(resetPasswordSchema.safeParse(VALID_RESET_INPUT).success).toBe(true);
  });

  it("normalizes email casing", () => {
    const result = resetPasswordSchema.safeParse({
      ...VALID_RESET_INPUT,
      email: "Test@Test.COM",
    });

    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("test@test.com");
  });

  it("rejects invalid OTP values", () => {
    expect(
      resetPasswordSchema.safeParse({
        ...VALID_RESET_INPUT,
        otp: "abc123",
      }).success,
    ).toBe(false);
  });

  it("rejects weak passwords", () => {
    expect(
      resetPasswordSchema.safeParse({
        ...VALID_RESET_INPUT,
        password: "aaaaaaaaaa",
        confirmPassword: "aaaaaaaaaa",
      }).success,
    ).toBe(false);
  });

  it("rejects passwords that contain the email local-part", () => {
    const result = resetPasswordSchema.safeParse({
      ...VALID_RESET_INPUT,
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
      resetPasswordSchema.safeParse({
        ...VALID_RESET_INPUT,
        confirmPassword: "Distinto1!",
      }).success,
    ).toBe(false);
  });
});
