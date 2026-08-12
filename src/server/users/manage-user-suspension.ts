import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import type { AdminUserSuspensionInput } from "@/modules/users/schemas/admin-user-suspension.schema";
import { prisma } from "@/server/db/prisma";

export type UserSuspensionErrorCode =
  | "NOT_FOUND"
  | "SELF_SUSPENSION"
  | "ALREADY_SUSPENDED"
  | "NOT_SUSPENDED"
  | "LAST_ADMIN"
  | "CONCURRENT_OPERATION";

export class UserSuspensionError extends Error {
  constructor(public readonly code: UserSuspensionErrorCode, message: string) {
    super(message);
    this.name = "UserSuspensionError";
  }
}

function isSuspended(
  user: { suspendedAt: Date | null; suspensionExpiresAt: Date | null },
  now: Date,
) {
  return Boolean(
    user.suspendedAt &&
      (!user.suspensionExpiresAt || user.suspensionExpiresAt > now),
  );
}

export async function manageUserSuspension(
  input: AdminUserSuspensionInput,
  actor: { id: string; role: Role },
) {
  const now = new Date();

  try {
    return await prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            role: true,
            suspendedAt: true,
            suspensionExpiresAt: true,
            deletedAt: true,
          },
        });

        if (!target || target.deletedAt) {
          throw new UserSuspensionError("NOT_FOUND", "El usuario no existe.");
        }

        const currentlySuspended = isSuspended(target, now);

        if (input.operation === "suspend") {
          if (target.id === actor.id) {
            throw new UserSuspensionError(
              "SELF_SUSPENSION",
              "No puedes suspender tu propia cuenta.",
            );
          }
          if (currentlySuspended) {
            throw new UserSuspensionError(
              "ALREADY_SUSPENDED",
              "El usuario ya está suspendido.",
            );
          }

          if (target.role === Role.ADMIN) {
            const otherActiveAdmins = await tx.user.count({
              where: {
                role: Role.ADMIN,
                deletedAt: null,
                id: { not: target.id },
                OR: [
                  { suspendedAt: null },
                  { suspensionExpiresAt: { lte: now } },
                ],
              },
            });

            if (otherActiveAdmins < 1) {
              throw new UserSuspensionError(
                "LAST_ADMIN",
                "No puedes suspender al último administrador activo.",
              );
            }
          }

          await tx.user.update({
            where: { id: target.id },
            data: {
              suspendedAt: now,
              suspensionReason: input.reason,
              suspensionExpiresAt: input.expiresAt,
            },
          });
          await tx.session.deleteMany({ where: { userId: target.id } });
          await tx.adminAuditLog.create({
            data: {
              actorId: actor.id,
              targetUserId: target.id,
              action: "USER_SUSPENDED",
              reason: input.reason,
              changes: {
                suspendedAt: now.toISOString(),
                suspensionExpiresAt: input.expiresAt?.toISOString() ?? null,
              },
            },
          });

          return { operation: "suspend" as const };
        }

        if (!currentlySuspended) {
          throw new UserSuspensionError(
            "NOT_SUSPENDED",
            "El usuario no está suspendido.",
          );
        }

        await tx.user.update({
          where: { id: target.id },
          data: {
            suspendedAt: null,
            suspensionReason: null,
            suspensionExpiresAt: null,
          },
        });
        await tx.adminAuditLog.create({
          data: {
            actorId: actor.id,
            targetUserId: target.id,
            action: "USER_REACTIVATED",
            reason: input.reason,
            changes: {
              suspendedAt: null,
              suspensionExpiresAt: null,
            },
          },
        });

        return { operation: "reactivate" as const };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof UserSuspensionError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new UserSuspensionError(
        "CONCURRENT_OPERATION",
        "La cuenta cambió mientras se aplicaba la operación. Inténtalo de nuevo.",
      );
    }
    throw error;
  }
}
