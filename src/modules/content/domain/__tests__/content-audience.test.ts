import { describe, expect, it } from "vitest";

import {
  getModuleAudiencesForSelection,
  moduleMatchesAudienceSelection,
  parseModuleAudienceSelection,
} from "@/modules/content/domain/content-audience";

describe("module audience selection", () => {
  it("uses students as the default selection", () => {
    expect(parseModuleAudienceSelection(undefined)).toBe("STUDENT");
    expect(parseModuleAudienceSelection("BOTH")).toBe("STUDENT");
    expect(parseModuleAudienceSelection("invalid")).toBe("STUDENT");
  });

  it("accepts teachers as the second visible selection", () => {
    expect(parseModuleAudienceSelection("TEACHER")).toBe("TEACHER");
  });

  it("includes shared modules in both selections", () => {
    expect(getModuleAudiencesForSelection("STUDENT")).toEqual([
      "STUDENT",
      "BOTH",
    ]);
    expect(getModuleAudiencesForSelection("TEACHER")).toEqual([
      "TEACHER",
      "BOTH",
    ]);
    expect(moduleMatchesAudienceSelection("BOTH", "STUDENT")).toBe(true);
    expect(moduleMatchesAudienceSelection("BOTH", "TEACHER")).toBe(true);
    expect(moduleMatchesAudienceSelection("TEACHER", "STUDENT")).toBe(false);
  });
});
