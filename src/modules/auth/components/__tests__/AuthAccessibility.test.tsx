import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AuthFormMessage from "@/modules/auth/components/AuthFormMessage";
import PasswordField from "@/modules/auth/components/PasswordField";

describe("accesibilidad de autenticación", () => {
  it("anuncia los errores generales de forma asertiva", () => {
    const html = renderToStaticMarkup(
      <AuthFormMessage state={{ status: "error", message: "Revisa los datos." }} />,
    );

    expect(html).toContain('id="auth-form-message"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
  });

  it("relaciona el campo de contraseña con su error", () => {
    const html = renderToStaticMarkup(
      <PasswordField
        id="password"
        name="password"
        label="Contraseña"
        autoComplete="current-password"
        value=""
        onChange={() => undefined}
        error="Ingresa tu contraseña."
      />,
    );

    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="password-error"');
    expect(html).toContain('id="password-error"');
    expect(html).toContain('aria-label="Mostrar contraseña"');
  });
});
