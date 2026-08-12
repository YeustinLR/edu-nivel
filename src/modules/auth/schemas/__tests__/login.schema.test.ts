import { describe, expect, it } from "vitest";

import { loginSchema } from "@/modules/auth/schemas/login.schema";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(
      loginSchema.safeParse({
        email: "test@example.com",
        password: "cualquier123",
      }).success,
    ).toBe(true);
  });

  it("normalizes email casing", () => {
    const result = loginSchema.safeParse({
      email: "Test@Test.COM",
      password: "abc123",
    });

    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("test@test.com");
  });

  it("rejects invalid emails", () => {
    expect(
      loginSchema.safeParse({
        email: "no-es",
        password: "abc",
      }).success,
    ).toBe(false);
  });

  it("rejects empty passwords", () => {
    expect(
      loginSchema.safeParse({
        email: "a@b.com",
        password: "",
      }).success,
    ).toBe(false);
  });
});
