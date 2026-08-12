import { describe, expect, it } from "vitest";

import { verifyEmailSchema } from "@/modules/auth/schemas/verify-email.schema";

describe("verifyEmailSchema", () => {
  it("accepts valid verification data", () => {
    expect(
      verifyEmailSchema.safeParse({
        email: "test@example.com",
        otp: "123456",
      }).success,
    ).toBe(true);
  });

  it("normalizes email casing", () => {
    const result = verifyEmailSchema.safeParse({
      email: "Test@Test.COM",
      otp: "123456",
    });

    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("test@test.com");
  });

  it("rejects invalid OTP values", () => {
    expect(
      verifyEmailSchema.safeParse({
        email: "test@example.com",
        otp: "abc123",
      }).success,
    ).toBe(false);
  });
});
