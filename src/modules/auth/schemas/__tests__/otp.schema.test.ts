import { describe, expect, it } from "vitest";

import { otpSchema } from "@/modules/auth/schemas/otp.schema";

describe("otpSchema", () => {
  it("accepts exactly six digits", () => {
    expect(otpSchema.safeParse("123456").success).toBe(true);
  });

  it("rejects letters", () => {
    expect(otpSchema.safeParse("abc123").success).toBe(false);
  });

  it("rejects fewer than six characters", () => {
    expect(otpSchema.safeParse("12345").success).toBe(false);
  });

  it("rejects more than six characters", () => {
    expect(otpSchema.safeParse("1234567").success).toBe(false);
  });

  it("rejects an empty value", () => {
    expect(otpSchema.safeParse("").success).toBe(false);
  });
});
