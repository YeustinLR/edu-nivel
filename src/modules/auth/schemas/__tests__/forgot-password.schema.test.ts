import { describe, expect, it } from "vitest";

import { forgotPasswordSchema } from "@/modules/auth/schemas/forgot-password.schema";

describe("forgotPasswordSchema", () => {
  it("accepts valid email input", () => {
    expect(
      forgotPasswordSchema.safeParse({
        email: "test@example.com",
      }).success,
    ).toBe(true);
  });

  it("normalizes email casing", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "Test@Test.COM",
    });

    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("test@test.com");
  });

  it("rejects invalid emails", () => {
    expect(
      forgotPasswordSchema.safeParse({
        email: "no-es",
      }).success,
    ).toBe(false);
  });
});
