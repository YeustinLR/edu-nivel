import { describe, expect, it } from "vitest";

import {
  getDashboardPathForRole,
  getPostLoginDestination,
} from "@/modules/auth/lib/dashboard-path";

describe("dashboard paths", () => {
  it.each([
    ["STUDENT", "/dashboard/student"],
    ["TEACHER", "/dashboard/teacher"],
    ["COLLABORATOR", "/dashboard/collaborator"],
    ["ADMIN", "/dashboard/admin"],
  ] as const)("maps %s to its canonical dashboard", (role, expected) => {
    expect(getDashboardPathForRole(role)).toBe(expected);
    expect(getPostLoginDestination("/dashboard", role)).toBe(expected);
  });

  it("preserves a safe specific dashboard destination", () => {
    expect(
      getPostLoginDestination("/dashboard/admin/content", "ADMIN"),
    ).toBe("/dashboard/admin/content");
  });

  it("falls back to the generic dashboard for an unknown role", () => {
    expect(getPostLoginDestination("/dashboard", "UNKNOWN")).toBe(
      "/dashboard",
    );
  });
});
