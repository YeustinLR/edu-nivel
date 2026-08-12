/**
 * Responsabilidad del archivo:
 * - Ser la fuente unica de las reglas de contrasena de la aplicacion.
 *
 * Papel en la arquitectura:
 * - Lo consumen formularios (cliente), schemas Zod (cliente), el medidor de fortaleza y
 *   la configuracion de Better Auth (servidor), para que ninguna capa diverja.
 * - No depende de React ni de Next: es importable desde cualquier entorno.
 */
export const MIN_PASSWORD_LENGTH = 10;

export const PASSWORD_RULES = [
  {
    id: "length",
    label: "Al menos 10 caracteres",
    test: (value: string) => value.length >= MIN_PASSWORD_LENGTH,
  },
  {
    id: "lowercase",
    label: "Una letra minúscula",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    id: "uppercase",
    label: "Una letra mayúscula",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    id: "number",
    label: "Un número",
    test: (value: string) => /\d/.test(value),
  },
  {
    id: "symbol",
    label: "Un símbolo",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

export function getPasswordScore(value: string) {
  return PASSWORD_RULES.filter((rule) => rule.test(value)).length;
}

export function isStrongPassword(value: string) {
  return getPasswordScore(value) === PASSWORD_RULES.length;
}

/**
 * Regla "la contrasena no debe contener el correo". Unico criterio usado por los
 * schemas del cliente y por el hook server-side de Better Auth.
 *
 * Devuelve `false` cuando el correo no tiene local-part usable para comparar,
 * para no producir falsos positivos ante entradas malformadas.
 */
export function passwordContainsEmail(password: string, email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const [localPart, domain, ...extraParts] = normalizedEmail.split("@");

  if (!localPart || !domain || extraParts.length > 0) {
    return false;
  }

  return password.toLowerCase().includes(localPart);
}

// Mensajes derivados de las reglas. Al cambiar MIN_PASSWORD_LENGTH o las reglas,
// textos de validacion, placeholders y ayudas visuales se actualizan solos.
export const PASSWORD_MIN_LENGTH_MESSAGE = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
export const PASSWORD_WEAK_MESSAGE =
  "La contraseña no cumple los requisitos de seguridad.";
export const PASSWORD_MISMATCH_MESSAGE = "Las contraseñas no coinciden.";
export const PASSWORD_CONTAINS_EMAIL_MESSAGE =
  "La contraseña no debe contener tu correo.";
export const PASSWORD_CONFIRM_REQUIRED_MESSAGE = "Confirma tu contraseña.";
export const PASSWORD_MIN_LENGTH_PLACEHOLDER = `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`;
export const PASSWORD_REQUIREMENTS_HINT = `${MIN_PASSWORD_LENGTH}+ caracteres, mayúscula, número y símbolo`;
