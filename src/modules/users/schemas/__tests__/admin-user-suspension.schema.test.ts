import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { adminUserSuspensionSchema } from "@/modules/users/schemas/admin-user-suspension.schema";

describe("adminUserSuspensionSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-19T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts an indefinite suspension with a reason", () => {
    expect(
      adminUserSuspensionSchema.parse({
        userId: "user-1",
        operation: "suspend",
        reason: "Revisión administrativa",
        expiresAt: "",
      }),
    ).toMatchObject({ expiresAt: null });
  });

  it("normalizes a temporary expiration date", () => {
    expect(
      adminUserSuspensionSchema.parse({
        userId: "user-1",
        operation: "suspend",
        reason: "Suspensión temporal",
        expiresAt: "2026-08-20T10:00:00.000Z",
      }).expiresAt,
    ).toBeInstanceOf(Date);
  });

  it("requires a meaningful reason", () => {
    expect(
      adminUserSuspensionSchema.safeParse({
        userId: "user-1",
        operation: "reactivate",
        reason: "  ",
        expiresAt: "",
      }).success,
    ).toBe(false);
  });
});
