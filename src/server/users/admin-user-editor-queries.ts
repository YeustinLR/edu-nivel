import "server-only";

import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

export type AdminUserEditorData = {
  id: string;
  name: string;
  email: string;
  role: Role;
  selectedLevelId: string | null;
  updatedAt: Date;
};

export type AdminUserLevelOption = {
  id: string;
  levelNumber: number;
  isActive: boolean;
};

export async function getAdminUserEditorContext(userId: string): Promise<{
  user: AdminUserEditorData | null;
  levels: AdminUserLevelOption[];
}> {
  await requireRole(Role.ADMIN);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      selectedLevelId: true,
      updatedAt: true,
      deletedAt: true,
    },
  });

  if (!user || user.deletedAt) return { user: null, levels: [] };

  const levels = await prisma.level.findMany({
    where: {
      OR: [
        { isActive: true },
        ...(user.selectedLevelId ? [{ id: user.selectedLevelId }] : []),
      ],
    },
    orderBy: [{ levelNumber: "asc" }, { id: "asc" }],
    select: { id: true, levelNumber: true, isActive: true },
  });

  return { user, levels };
}

export async function getAdminUserInvitationOptions() {
  await requireRole(Role.ADMIN);

  return prisma.level.findMany({
    where: { isActive: true },
    orderBy: [{ levelNumber: "asc" }, { id: "asc" }],
    select: { id: true, levelNumber: true, isActive: true },
  });
}
