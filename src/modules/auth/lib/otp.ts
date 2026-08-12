/**
 * Responsabilidad del archivo:
 * - Ser la fuente unica de las constantes del flujo OTP (verificacion de correo y
 *   restablecimiento de contrasena).
 *
 * Papel en la arquitectura:
 * - Lo consumen los formularios OTP (cliente), la configuracion de Better Auth (servidor)
 *   y los templates de correo, para que largo, expiracion y cooldown nunca diverjan.
 * - No depende de React ni de Next: es importable desde cualquier entorno.
 */
export const AUTH_OTP_LENGTH = 6;
export const AUTH_OTP_EXPIRES_SECONDS = 5 * 60;
export const AUTH_OTP_RESEND_COOLDOWN_SECONDS = 60;
export const AUTH_OTP_SUCCESS_REDIRECT_DELAY_MS = 3000;
