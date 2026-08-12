import { describe, expect, it } from "vitest";

import { isUserCurrentlySuspended } from "@/modules/users/domain/user-suspension";

describe("isUserCurrentlySuspended", () => {
  const now = new Date("2026-08-10T00:00:00.000Z");

  it("identifies an indefinite suspension", () => {
    expect(isUserCurrentlySuspended({ suspendedAt: now, suspensionExpiresAt: null }, now)).toBe(true);
  });

  it("allows an expired temporary suspension", () => {
    expect(
      isUserCurrentlySuspended(
        {
          suspendedAt: new Date("2026-08-01T00:00:00.000Z"),
          suspensionExpiresAt: new Date("2026-08-09T00:00:00.000Z"),
        },
        now,
      ),
    ).toBe(false);
  });
});
