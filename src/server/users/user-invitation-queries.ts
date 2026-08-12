import "server-only";

import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";
import { hashUserInvitationToken } from "@/server/users/user-invitation-token";

export type UserInvitationAcceptanceData = {
  status: "pending";
  name: string;
  email: string;
  role: Role;
  levelNumber: number | null;
  expiresAt: Date;
};

export async function getUserInvitationAcceptanceData(
  token: string,
): Promise<
  | UserInvitationAcceptanceData
  | { status: "invalid" | "expired" | "used" }
> {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    return { status: "invalid" };
  }

  const invitation = await prisma.userInvitation.findUnique({
    where: { tokenHash: hashUserInvitationToken(token) },
    select: {
      name: true,
      email: true,
      activeEmail: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      canceledAt: true,
      selectedLevel: { select: { levelNumber: true } },
    },
  });

  if (!invitation) {
    return { status: "invalid" };
  }
  if (invitation.acceptedAt) return { status: "used" };
  if (invitation.canceledAt || !invitation.activeEmail) {
    return { status: "invalid" };
  }
  if (invitation.expiresAt <= new Date()) return { status: "expired" };

  return {
    status: "pending",
    name: invitation.name,
    email: invitation.email,
    role: invitation.role,
    levelNumber: invitation.selectedLevel?.levelNumber ?? null,
    expiresAt: invitation.expiresAt,
  };
}
