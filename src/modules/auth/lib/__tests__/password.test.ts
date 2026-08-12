import { describe, expect, it } from "vitest";

import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_RULES,
  getPasswordScore,
  isStrongPassword,
  passwordContainsEmail,
} from "@/modules/auth/lib/password";

describe("password rules", () => {
  it("keeps the minimum length rule in the rules list", () => {
    expect(PASSWORD_RULES.some((rule) => rule.id === "length")).toBe(true);
    expect(MIN_PASSWORD_LENGTH).toBe(10);
  });

  it("scores an empty password as zero", () => {
    expect(getPasswordScore("")).toBe(0);
  });

  it("scores a strong password with all rules", () => {
    expect(getPasswordScore("Zx9!qwertyui")).toBe(PASSWORD_RULES.length);
  });

  it("rejects a short password", () => {
    expect(isStrongPassword("Ab1!")).toBe(false);
  });

  it("rejects a password without uppercase letters", () => {
    expect(isStrongPassword("abcdefgh1!")).toBe(false);
  });

  it("rejects a password without numbers", () => {
    expect(isStrongPassword("Abcdefgh!x")).toBe(false);
  });

  it("rejects a password without symbols", () => {
    expect(isStrongPassword("Abcdefgh12")).toBe(false);
  });

  it("rejects a weak repeated-letter password", () => {
    expect(isStrongPassword("aaaaaaaaaa")).toBe(false);
  });

  it("accepts a strong password", () => {
    expect(isStrongPassword("Zx9!qwertyui")).toBe(true);
  });
});

describe("passwordContainsEmail", () => {
  it("detects the email local-part inside the password", () => {
    expect(passwordContainsEmail("Prueba1!xyz", "prueba1@example.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(passwordContainsEmail("PRUEBA1!xyz", "Prueba1@example.com")).toBe(true);
  });

  it("returns false when the password does not contain the email local-part", () => {
    expect(passwordContainsEmail("Zx9!qwertyui", "prueba1@example.com")).toBe(false);
  });

  it("returns false for malformed emails without a local-part", () => {
    expect(passwordContainsEmail("cualquiercosa", "@example.com")).toBe(false);
  });

  it("returns false for malformed emails without a domain", () => {
    expect(passwordContainsEmail("juancualquiercosa", "juan@")).toBe(false);
  });

  it("returns false for malformed emails without an at sign", () => {
    expect(passwordContainsEmail("juancualquiercosa", "juan")).toBe(false);
  });

  it("returns false for malformed emails with multiple at signs", () => {
    expect(passwordContainsEmail("juancualquiercosa", "juan@@example.com")).toBe(false);
  });
});
