import { describe, expect, it } from "vitest";

import {
  MAXIMUM_SIGN_UP_AGE,
  MINIMUM_SIGN_UP_AGE,
  isAllowedDeclaredAge,
  parseDeclaredAge,
} from "@/modules/auth/lib/age";

describe("parseDeclaredAge", () => {
  it("parses integer numbers", () => {
    expect(parseDeclaredAge(25)).toBe(25);
  });

  it("parses integer strings", () => {
    expect(parseDeclaredAge("25")).toBe(25);
  });

  it("returns null for non-integer values", () => {
    expect(parseDeclaredAge("25.5")).toBeNull();
    expect(parseDeclaredAge("abc")).toBeNull();
  });
});

describe("isAllowedDeclaredAge", () => {
  it("accepts the configured inclusive range", () => {
    expect(isAllowedDeclaredAge(MINIMUM_SIGN_UP_AGE)).toBe(true);
    expect(isAllowedDeclaredAge(MAXIMUM_SIGN_UP_AGE)).toBe(true);
  });

  it("rejects ages outside the configured range", () => {
    expect(isAllowedDeclaredAge(MINIMUM_SIGN_UP_AGE - 1)).toBe(false);
    expect(isAllowedDeclaredAge(MAXIMUM_SIGN_UP_AGE + 1)).toBe(false);
  });
});
