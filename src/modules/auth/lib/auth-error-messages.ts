/**
 * Responsabilidad del archivo:
 * - Traducir los errores de Better Auth a mensajes propios en espanol.
 *
 * Papel en la arquitectura:
 * - Los formularios nunca muestran `error.message` crudo: los mensajes de Better Auth
 *   llegan en ingles y pueden filtrar detalles internos.
 * - Cada formulario define el `fallback` acorde a su contexto.
 * - Codigos sensibles a enumeracion (p. ej. `USER_NOT_FOUND`) no se mapean a proposito:
 *   caen en el fallback generico del formulario.
 */
import {
  PASSWORD_CONTAINS_EMAIL_MESSAGE,
  PASSWORD_MIN_LENGTH_MESSAGE,
  PASSWORD_WEAK_MESSAGE,
} from "@/modules/auth/lib/password";

const RATE_LIMIT_MESSAGE =
  "Demasiados intentos. Espera un momento y vuelve a intentarlo.";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_OTP: "El código es incorrecto.",
  OTP_EXPIRED: "El código expiró. Solicita uno nuevo.",
  TOO_MANY_ATTEMPTS: "Demasiados intentos. Solicita un código nuevo.",
  PASSWORD_TOO_SHORT: PASSWORD_MIN_LENGTH_MESSAGE,
  WEAK_PASSWORD: PASSWORD_WEAK_MESSAGE,
  PASSWORD_CONTAINS_EMAIL: PASSWORD_CONTAINS_EMAIL_MESSAGE,
  USER_ALREADY_EXISTS: "Ya existe una cuenta con ese correo.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Ya existe una cuenta con ese correo.",
  INVALID_EMAIL_OR_PASSWORD: "Correo o contraseña incorrectos.",
  EMAIL_NOT_VERIFIED: "Debes verificar tu correo antes de continuar.",
  AGE_RESTRICTED: "Debes tener 18 años o más.",
  ROLE_CHANGE_NOT_ALLOWED:
    "El tipo de cuenta no se puede cambiar desde el perfil.",
  INVALID_USER_INVITATION:
    "La invitación no es válida, expiró o ya fue utilizada.",
  USER_INVITATION_REQUIRED:
    "Este tipo de cuenta requiere una invitación válida.",
  USER_SUSPENDED: "Tu cuenta está suspendida. Contacta al administrador.",
};

type AuthClientError = {
  code?: string;
  status?: number;
};

export function getAuthErrorMessage(
  error: AuthClientError | null | undefined,
  fallback: string,
): string {
  if (!error) {
    return fallback;
  }

  // El rate limit de Better Auth responde 429 sin codigo de error.
  if (error.status === 429) {
    return RATE_LIMIT_MESSAGE;
  }

  return AUTH_ERROR_MESSAGES[error.code ?? ""] ?? fallback;
}
