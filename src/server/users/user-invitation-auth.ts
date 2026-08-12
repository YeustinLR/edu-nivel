import "server-only";

import { APIError } from "better-auth";

import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";
import { hashUserInvitationToken } from "@/server/users/user-invitation-token";

type AuthHookContext = {
  body?: Record<string, unknown> | null;
};

export function getInvitationTokenFromAuthContext(context: unknown) {
  const body = (context as AuthHookContext | null)?.body;
  return typeof body?.invitationToken === "string"
    ? body.invitationToken.trim()
    : "";
}

export async function findPendingSignUpInvitation({
  token,
  email,
  role,
}: {
  token: string;
  email: string;
  role: string;
}) {
  if (!token) return null;

  const normalizedEmail = email.trim().toLowerCase();
  const invitation = await prisma.userInvitation.findUnique({
    where: { tokenHash: hashUserInvitationToken(token) },
    select: {
      id: true,
      email: true,
      activeEmail: true,
      role: true,
      selectedLevelId: true,
      expiresAt: true,
      acceptedAt: true,
      canceledAt: true,
    },
  });

  if (
    !invitation ||
    invitation.email !== normalizedEmail ||
    invitation.activeEmail !== normalizedEmail ||
    invitation.role !== role ||
    invitation.acceptedAt ||
    invitation.canceledAt ||
    invitation.expiresAt <= new Date()
  ) {
    return null;
  }

  return invitation;
}

export async function consumeSignUpInvitation({
  token,
  userId,
  email,
  role,
}: {
  token: string;
  userId: string;
  email: string;
  role: Role;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date();
  const result = await prisma.userInvitation.updateMany({
    where: {
      tokenHash: hashUserInvitationToken(token),
      email: normalizedEmail,
      activeEmail: normalizedEmail,
      role,
      acceptedAt: null,
      canceledAt: null,
      expiresAt: { gt: now },
    },
    data: {
      activeEmail: null,
      acceptedAt: now,
      acceptedUserId: userId,
    },
  });

  return result.count === 1;
}

function invalidInvitationError(message = "La invitación no es válida o ya expiró.") {
  return APIError.from("BAD_REQUEST", {
    code: "INVALID_USER_INVITATION",
    message,
  });
}

export async function assertSignUpInvitationAllowed({
  token,
  email,
  role,
  isPublicRole,
}: {
  token: string;
  email: string;
  role: string;
  isPublicRole: boolean;
}) {
  const invitation = token
    ? await findPendingSignUpInvitation({ token, email, role })
    : null;

  if (token && !invitation) throw invalidInvitationError();

  if (!isPublicRole && !invitation) {
    throw APIError.from("BAD_REQUEST", {
      code: "USER_INVITATION_REQUIRED",
      message: "Este tipo de cuenta requiere una invitación válida.",
    });
  }
}

export async function getInvitedLevelFromAuthContext({
  context,
  email,
  role,
}: {
  context: unknown;
  email: string;
  role: string;
}) {
  const token = getInvitationTokenFromAuthContext(context);
  if (!token) return undefined;

  const invitation = await findPendingSignUpInvitation({ token, email, role });
  if (!invitation) throw invalidInvitationError();
  return invitation.selectedLevelId;
}

export async function finalizeSignUpInvitation({
  context,
  user,
}: {
  context: unknown;
  user: { id: string; email: string; role: string };
}) {
  const token = getInvitationTokenFromAuthContext(context);
  if (!token) return;

  const consumed = await consumeSignUpInvitation({
    token,
    userId: user.id,
    email: user.email,
    role: user.role as Role,
  });

  if (!consumed) {
    throw invalidInvitationError("La invitación no pudo consumirse.");
  }
}
