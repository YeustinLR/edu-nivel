import { describe, expect, it } from "vitest";

import { withEmailVerificationTimestamp } from "@/modules/auth/lib/email-verification-timestamp";

const now = new Date("2026-09-14T19:00:00.000Z");

describe("email verification timestamp", () => {
  it("records the instant when an email becomes verified", () => {
    expect(withEmailVerificationTimestamp({ emailVerified: true }, now)).toEqual({
      emailVerified: true,
      emailVerifiedAt: now,
    });
  });

  it("clears the timestamp when verification is revoked", () => {
    expect(withEmailVerificationTimestamp({ emailVerified: false }, now)).toEqual({
      emailVerified: false,
      emailVerifiedAt: null,
    });
  });

  it("does not modify unrelated user updates", () => {
    expect(withEmailVerificationTimestamp({ name: "Ana" }, now)).toBeNull();
  });
});
