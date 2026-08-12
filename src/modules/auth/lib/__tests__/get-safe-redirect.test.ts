import { describe, expect, it } from "vitest";

import { getSafeRedirect } from "@/modules/auth/lib/get-safe-redirect";

describe("getSafeRedirect", () => {
  it("returns the dashboard default for empty values", () => {
    expect(getSafeRedirect(null)).toBe("/dashboard");
    expect(getSafeRedirect(undefined)).toBe("/dashboard");
    expect(getSafeRedirect("")).toBe("/dashboard");
  });

  it("allows dashboard paths", () => {
    expect(getSafeRedirect("/dashboard")).toBe("/dashboard");
    expect(getSafeRedirect("/dashboard/student")).toBe("/dashboard/student");
    expect(getSafeRedirect("/dashboard/student?tab=progress")).toBe(
      "/dashboard/student?tab=progress",
    );
  });

  it("rejects external URLs", () => {
    expect(getSafeRedirect("https://example.com/dashboard")).toBe("/dashboard");
  });

  it("rejects paths outside dashboard", () => {
    expect(getSafeRedirect("/login")).toBe("/dashboard");
    expect(getSafeRedirect("/")).toBe("/dashboard");
  });

  it("rejects values with backslashes", () => {
    expect(getSafeRedirect("\\dashboard")).toBe("/dashboard");
    expect(getSafeRedirect("/dashboard\\evil")).toBe("/dashboard");
  });
});
