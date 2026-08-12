import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const USER_INVITATION_EXPIRES_HOURS = 72;

export function generateUserInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashUserInvitationToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function getUserInvitationExpiration(now = new Date()) {
  return new Date(
    now.getTime() + USER_INVITATION_EXPIRES_HOURS * 60 * 60 * 1000,
  );
}
