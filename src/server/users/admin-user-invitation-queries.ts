import "server-only";

import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

export type AdminPendingUserInvitation = {
  id: string;
  name: string;
  email: string;
  role: Role;
  levelNumber: number | null;
  expiresAt: Date;
  createdAt: Date;
};

export async function getAdminPendingUserInvitations(): Promise<
  AdminPendingUserInvitation[]
> {
  await requireRole(Role.ADMIN);

  const invitations = await prisma.userInvitation.findMany({
    where: {
      activeEmail: { not: null },
      acceptedAt: null,
      canceledAt: null,
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: 12,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
      selectedLevel: { select: { levelNumber: true } },
    },
  });

  return invitations.map((invitation) => ({
    id: invitation.id,
    name: invitation.name,
    email: invitation.email,
    role: invitation.role,
    levelNumber: invitation.selectedLevel?.levelNumber ?? null,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
  }));
}
