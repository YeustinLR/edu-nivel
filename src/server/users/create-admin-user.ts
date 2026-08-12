import "server-only";

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";

import { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import type { AdminUserCreateInput } from "@/modules/users/schemas/admin-user-create.schema";
import { prisma } from "@/server/db/prisma";

export type AdminUserCreationErrorCode =
  | "EMAIL_IN_USE"
  | "INVALID_LEVEL"
  | "CONCURRENT_OPERATION";

export class AdminUserCreationError extends Error {
  constructor(public readonly code: AdminUserCreationErrorCode, message: string) {
    super(message);
    this.name = "AdminUserCreationError";
  }
}

export async function createAdminUser(
  input: AdminUserCreateInput,
  actor: { id: string; role: Role },
) {
  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const userId = randomUUID();

  try {
    return await prisma.$transaction(
      async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { email: input.email },
          select: { id: true },
        });
        if (existingUser) {
          throw new AdminUserCreationError("EMAIL_IN_USE", "Ya existe una cuenta con ese correo.");
        }

        const canSelectLevel = input.role === Role.STUDENT || input.role === Role.TEACHER;
        const selectedLevelId = canSelectLevel ? input.selectedLevelId : null;
        if (selectedLevelId) {
          const level = await tx.level.findUnique({
            where: { id: selectedLevelId },
            select: { isActive: true },
          });
          if (!level?.isActive) {
            throw new AdminUserCreationError("INVALID_LEVEL", "Selecciona un nivel activo y disponible.");
          }
        }

        await tx.userInvitation.updateMany({
          where: { activeEmail: input.email, acceptedAt: null, canceledAt: null },
          data: { activeEmail: null, canceledAt: now },
        });

        const user = await tx.user.create({
          data: {
            id: userId,
            name: input.name,
            email: input.email,
            emailVerified: true,
            role: input.role,
            selectedLevelId,
            adminCreatedAt: now,
            passwordChangeRequired: true,
            accounts: {
              create: {
                id: randomUUID(),
                accountId: userId,
                providerId: "credential",
                password: passwordHash,
              },
            },
          },
          select: { id: true, email: true },
        });

        await tx.adminAuditLog.create({
          data: {
            actorId: actor.id,
            targetUserId: user.id,
            action: "USER_CREATED_BY_ADMIN",
            changes: {
              role: input.role,
              selectedLevelId,
              emailVerified: true,
              passwordChangeRequired: true,
            },
          },
        });

        return user;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof AdminUserCreationError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new AdminUserCreationError("EMAIL_IN_USE", "Ya existe una cuenta con ese correo.");
      }
      if (error.code === "P2034") {
        throw new AdminUserCreationError(
          "CONCURRENT_OPERATION",
          "Los datos cambiaron durante la creación. Inténtalo de nuevo.",
        );
      }
    }
    throw error;
  }
}
