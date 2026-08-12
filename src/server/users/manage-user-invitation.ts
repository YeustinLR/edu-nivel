import "server-only";

import { Role } from "@/generated/prisma/enums";
import type { AdminUserInvitationOperationInput } from "@/modules/users/schemas/admin-user-invitation-operation.schema";
import { prisma } from "@/server/db/prisma";
import { createUserInvitation } from "@/server/users/create-user-invitation";

export class UserInvitationOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserInvitationOperationError";
  }
}

type InvitationActor = { id: string; name: string; role: Role };

export async function manageUserInvitation(
  input: AdminUserInvitationOperationInput,
  actor: InvitationActor,
) {
  if (input.operation === "cancel") {
    const canceled = await prisma.userInvitation.updateMany({
      where: {
        id: input.invitationId,
        activeEmail: { not: null },
        acceptedAt: null,
        canceledAt: null,
      },
      data: { activeEmail: null, canceledAt: new Date() },
    });

    if (canceled.count !== 1) {
      throw new UserInvitationOperationError(
        "La invitación ya no está pendiente.",
      );
    }

    return { operation: "cancel" as const };
  }

  const invitation = await prisma.userInvitation.findFirst({
    where: {
      id: input.invitationId,
      activeEmail: { not: null },
      acceptedAt: null,
      canceledAt: null,
    },
    select: {
      name: true,
      email: true,
      role: true,
      selectedLevelId: true,
    },
  });

  if (!invitation || invitation.role === Role.ADMIN) {
    throw new UserInvitationOperationError(
      "La invitación ya no está disponible para reenviar.",
    );
  }

  const role = invitation.role;
  await createUserInvitation({ ...invitation, role }, actor);
  return { operation: "resend" as const };
}
