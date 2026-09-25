import { describe, expect, it } from "vitest";

import { PASSWORD_CONTAINS_EMAIL_MESSAGE } from "@/modules/auth/lib/password";
import {
  PASSWORD_UNCHANGED_MESSAGE,
  changePasswordSchema,
} from "@/modules/account/schemas/change-password.schema";

const validInput = {
  currentPassword: "Actual8!segura",
  newPassword: "Nueva9!segura",
  confirmPassword: "Nueva9!segura",
  email: "ana@example.com",
  revokeOtherSessions: true,
};

describe("changePasswordSchema", () => {
  it("acepta una contraseña fuerte y confirmada", () => {
    expect(changePasswordSchema.safeParse(validInput).success).toBe(true);
  });

  it("requiere la contraseña actual", () => {
    const result = changePasswordSchema.safeParse({ ...validInput, currentPassword: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === "currentPassword")).toBe(true);
  });

  it("rechaza contraseñas débiles o sin confirmación coincidente", () => {
    expect(changePasswordSchema.safeParse({
      ...validInput,
      newPassword: "debil",
      confirmPassword: "distinta",
    }).success).toBe(false);
  });

  it("rechaza reutilizar la contraseña actual", () => {
    const result = changePasswordSchema.safeParse({
      ...validInput,
      newPassword: validInput.currentPassword,
      confirmPassword: validInput.currentPassword,
    });

    expect(result.error?.issues.some((issue) => issue.message === PASSWORD_UNCHANGED_MESSAGE)).toBe(true);
  });

  it("rechaza una contraseña que contiene el identificador del correo", () => {
    const result = changePasswordSchema.safeParse({
      ...validInput,
      email: "nueva9@example.com",
      newPassword: "Nueva9!segura",
    });

    expect(result.error?.issues.some((issue) => issue.message === PASSWORD_CONTAINS_EMAIL_MESSAGE)).toBe(true);
  });
});

