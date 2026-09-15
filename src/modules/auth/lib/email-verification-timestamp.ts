export function withEmailVerificationTimestamp<
  T extends Record<string, unknown>,
>(update: T, now = new Date()) {
  if (update.emailVerified === true) {
    return { ...update, emailVerifiedAt: now };
  }

  if (update.emailVerified === false) {
    return { ...update, emailVerifiedAt: null };
  }

  return null;
}
