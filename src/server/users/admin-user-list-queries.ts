import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import type {
  AdminUserSort,
  AdminUserVerification,
} from "@/modules/users/schemas/admin-users.schema";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

export type AdminUserListFilters = {
  query: string;
  role?: Role;
  verification?: AdminUserVerification;
  sort: AdminUserSort;
  page: number;
  pageSize: number;
};

export type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: Role;
  suspendedAt: Date | null;
  suspensionExpiresAt: Date | null;
  adminCreatedAt: Date | null;
  passwordChangeRequired: boolean;
  setupPending: boolean;
  selectedLevelNumber: number | null;
  createdAt: Date;
};

export type AdminUsersPage = {
  items: AdminUserListItem[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

const orderByBySort: Record<AdminUserSort, Prisma.UserOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }, { id: "asc" }],
  oldest: [{ createdAt: "asc" }, { id: "asc" }],
  name: [{ name: "asc" }, { id: "asc" }],
};

export async function getAdminUsersPage({
  query,
  role,
  verification,
  sort,
  page,
  pageSize,
}: AdminUserListFilters): Promise<AdminUsersPage> {
  await requireRole(Role.ADMIN);

  const where = {
    deletedAt: null,
    role,
    emailVerified:
      verification === "verified"
        ? true
        : verification === "unverified"
          ? false
          : undefined,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  } satisfies Prisma.UserWhereInput;

  const [totalItems, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: orderByBySort[sort],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        role: true,
        suspendedAt: true,
        suspensionExpiresAt: true,
        adminCreatedAt: true,
        passwordChangeRequired: true,
        ageVerifiedAt: true,
        termsAcceptedAt: true,
        privacyAcceptedAt: true,
        createdAt: true,
        selectedLevel: { select: { levelNumber: true } },
      },
    }),
  ]);

  return {
    items: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      suspendedAt: user.suspendedAt,
      suspensionExpiresAt: user.suspensionExpiresAt,
      adminCreatedAt: user.adminCreatedAt,
      passwordChangeRequired: user.passwordChangeRequired,
      setupPending: Boolean(
        user.adminCreatedAt &&
          (user.passwordChangeRequired ||
            !user.ageVerifiedAt ||
            !user.termsAcceptedAt ||
            !user.privacyAcceptedAt),
      ),
      selectedLevelNumber: user.selectedLevel?.levelNumber ?? null,
      createdAt: user.createdAt,
    })),
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    page,
    pageSize,
  };
}
