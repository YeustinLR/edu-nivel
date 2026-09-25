import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

import {
  AccountFeedback,
  AccountFieldError,
} from "@/modules/account/components/AccountFeedback";
import { ChangePasswordForm } from "@/modules/account/components/ChangePasswordForm";
import { SessionManager } from "@/modules/account/components/SessionManager";

describe("accesibilidad de configuración de cuenta", () => {
  it("anuncia errores y confirmaciones con la prioridad apropiada", () => {
    const error = renderToStaticMarkup(
      <AccountFeedback id="account-feedback" state={{ status: "error", message: "Error" }} />,
    );
    const success = renderToStaticMarkup(
      <AccountFeedback id="account-feedback" state={{ status: "success", message: "Guardado" }} />,
    );
    const field = renderToStaticMarkup(<AccountFieldError id="name-error" message="Revisa el nombre" />);

    expect(error).toContain('role="alert"');
    expect(error).toContain('aria-live="assertive"');
    expect(success).toContain('role="status"');
    expect(success).toContain('aria-live="polite"');
    expect(field).toContain('id="name-error"');
    expect(field).toContain('role="alert"');
  });

  it("expone etiquetas, autocompletado y controles claros para cambiar contraseña", () => {
    const html = renderToStaticMarkup(
      <ChangePasswordForm email="ana@example.com" onSessionsChanged={() => undefined} />,
    );

    expect(html).toContain('for="current-password"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain('for="new-password"');
    expect(html).toContain('autoComplete="new-password"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("Cerrar las demás sesiones");
    expect(html).toContain("Cambiar contraseña");
  });

  it("solicita reautenticación sin ocultar el resto de la configuración", () => {
    const html = renderToStaticMarkup(
      <SessionManager
        email="ana@example.com"
        initialAccess={{ status: "reauth-required", sessions: [] }}
        currentSessionToken="current-token"
        onCurrentSessionChanged={() => undefined}
        refreshVersion={0}
      />,
    );

    expect(html).toContain("Confirma tu identidad");
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain("Confirmar identidad");
  });
});
