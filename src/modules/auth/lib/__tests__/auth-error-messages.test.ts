import { describe, expect, it } from "vitest";

import {
  getAuthErrorMessage,
  getAuthRetryAfter,
} from "@/modules/auth/lib/auth-error-messages";
import {
  PASSWORD_CONTAINS_EMAIL_MESSAGE,
  PASSWORD_WEAK_MESSAGE,
} from "@/modules/auth/lib/password";

describe("getAuthErrorMessage", () => {
  it("maps known auth error codes", () => {
    expect(getAuthErrorMessage({ code: "WEAK_PASSWORD" }, "fallback")).toBe(
      PASSWORD_WEAK_MESSAGE,
    );
    expect(
      getAuthErrorMessage({ code: "PASSWORD_CONTAINS_EMAIL" }, "fallback"),
    ).toBe(PASSWORD_CONTAINS_EMAIL_MESSAGE);
    expect(
      getAuthErrorMessage({ code: "ROLE_CHANGE_NOT_ALLOWED" }, "fallback"),
    ).toBe("El tipo de cuenta no se puede cambiar desde el perfil.");
    expect(
      getAuthErrorMessage(
        { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" },
        "fallback",
      ),
    ).toBe("Ya existe una cuenta con ese correo.");
  });

  it("uses a generic message for rate limits", () => {
    expect(getAuthErrorMessage({ status: 429 }, "fallback")).toBe(
      "Demasiados intentos. Espera un momento y vuelve a intentarlo.",
    );
    expect(getAuthRetryAfter({ status: 429, retryAfter: 37.2 })).toBe(38);
    expect(getAuthRetryAfter({ status: 429 })).toBe(60);
    expect(getAuthRetryAfter({ status: 400, retryAfter: 37 })).toBe(0);
  });

  it("falls back for unknown, absent, or intentionally unmapped errors", () => {
    expect(getAuthErrorMessage({ code: "UNKNOWN" }, "fallback")).toBe("fallback");
    expect(getAuthErrorMessage({ code: "USER_NOT_FOUND" }, "fallback")).toBe(
      "fallback",
    );
    expect(getAuthErrorMessage(null, "fallback")).toBe("fallback");
  });
});
