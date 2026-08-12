export type UserSuspensionState = {
  suspendedAt: Date | null;
  suspensionExpiresAt: Date | null;
};

export function isUserCurrentlySuspended(
  user: UserSuspensionState,
  now = new Date(),
) {
  return Boolean(
    user.suspendedAt &&
      (!user.suspensionExpiresAt || user.suspensionExpiresAt > now),
  );
}
