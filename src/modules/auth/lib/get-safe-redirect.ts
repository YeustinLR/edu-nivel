/**
 * Sanitiza el destino de retorno despues de login/registro para evitar open redirects.
 *
 * @param value Valor leido desde la query string.
 * @returns Una ruta segura dentro del subarbol privado `/dashboard`.
 *
 * @remarks
 * - Resuelve la entrada contra un origen interno fijo y exige que el origen no cambie.
 * - Limita el retorno al dashboard para no enviar valores no confiables al router del cliente.
 */
const DEFAULT_REDIRECT = "/dashboard";
const INTERNAL_ORIGIN = "https://internal.local";

export function getSafeRedirect(value: string | null | undefined): string {
  if (!value || value.includes("\\")) {
    return DEFAULT_REDIRECT;
  }

  try {
    const destination = new URL(value, INTERNAL_ORIGIN);
    const isInternal = destination.origin === INTERNAL_ORIGIN;
    const isDashboard =
      destination.pathname === "/dashboard" ||
      destination.pathname.startsWith("/dashboard/");

    if (!isInternal || !isDashboard) {
      return DEFAULT_REDIRECT;
    }

    return `${destination.pathname}${destination.search}`;
  } catch {
    return DEFAULT_REDIRECT;
  }
}
