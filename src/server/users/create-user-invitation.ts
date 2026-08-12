import "server-only";

import { Role } from "@/generated/prisma/enums";
import type { AdminUserInvitationInput } from "@/modules/users/schemas/admin-user-invitation.schema";
import { prisma } from "@/server/db/prisma";
import { sendUserInvitation } from "@/server/mail/send-user-invitation";
import {
  generateUserInvitationToken,
  getUserInvitationExpiration,
  hashUserInvitationToken,
} from "@/server/users/user-invitation-token";

export type UserInvitationCreationErrorCode =
  | "EMAIL_IN_USE"
  | "INVALID_LEVEL"
  | "SEND_FAILED";

export class UserInvitationCreationError extends Error {
  constructor(
    public readonly code: UserInvitationCreationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "UserInvitationCreationError";
  }
}

export async function createUserInvitation(
  input: AdminUserInvitationInput,
  actor: { id: string; name: string; role: Role },
) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    throw new UserInvitationCreationError(
      "EMAIL_IN_USE",
      "Ya existe un usuario con ese correo.",
    );
  }

  if (input.selectedLevelId) {
    const level = await prisma.level.findUnique({
      where: { id: input.selectedLevelId },
      select: { isActive: true },
    });

    if (!level?.isActive) {
      throw new UserInvitationCreationError(
        "INVALID_LEVEL",
        "Selecciona un nivel activo y disponible.",
      );
    }
  }

  const token = generateUserInvitationToken();
  const now = new Date();
  const invitation = await prisma.$transaction(async (tx) => {
    await tx.userInvitation.updateMany({
      where: { activeEmail: input.email },
      data: { activeEmail: null, canceledAt: now },
    });

    return tx.userInvitation.create({
      data: {
        email: input.email,
        activeEmail: input.email,
        name: input.name,
        role: input.role,
        tokenHash: hashUserInvitationToken(token),
        selectedLevelId: input.selectedLevelId,
        invitedById: actor.id,
        expiresAt: getUserInvitationExpiration(now),
      },
      select: { id: true, email: true, expiresAt: true },
    });
  });

  try {
    await sendUserInvitation({
      email: input.email,
      name: input.name,
      role: input.role,
      inviterName: actor.name,
      token,
    });
  } catch {
    await prisma.userInvitation.updateMany({
      where: { id: invitation.id, acceptedAt: null },
      data: { activeEmail: null, canceledAt: new Date() },
    });
    throw new UserInvitationCreationError(
      "SEND_FAILED",
      "No se pudo enviar el correo. La invitación fue cancelada; inténtalo de nuevo.",
    );
  }

  return invitation;
}
