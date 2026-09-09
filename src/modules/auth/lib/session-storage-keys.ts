export const AUTH_SESSION_STORAGE_KEYS = {
  emailVerification: "edunivel:email-verification",
  passwordReset: "edunivel:password-reset",
  emailVerificationResend: "edunivel:email-verification:resend-until",
  emailVerificationAttempts: "edunivel:email-verification:attempts-until",
  passwordResetResend: "edunivel:password-reset:resend-until",
  passwordResetAttempts: "edunivel:password-reset:attempts-until",
} as const;
