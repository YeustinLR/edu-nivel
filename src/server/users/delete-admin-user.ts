import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import type { AdminUserDeleteInput } from "@/modules/users/schemas/admin-user-delete.schema";
import { prisma } from "@/server/db/prisma";

export type AdminUserDeletionErrorCode =
  | "NOT_FOUND"
  | "SELF_DELETION"
  | "EMAIL_MISMATCH"
  | "ALREADY_DELETED"
  | "CONCURRENT_OPERATION";

export class AdminUserDeletionError extends Error {
  constructor(public readonly code: AdminUserDeletionErrorCode, message: string) {
    super(message);
    this.name = "AdminUserDeletionError";
  }
}

export async function deleteAdminUser(
  input: AdminUserDeleteInput,
  actor: { id: string; role: Role },
) {
  const now = new Date();

  try {
    await prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({
          where: { id: input.userId },
          select: { id: true, email: true, deletedAt: true },
        });
        if (!target) throw new AdminUserDeletionError("NOT_FOUND", "El usuario no existe.");
        if (target.id === actor.id) {
          throw new AdminUserDeletionError("SELF_DELETION", "No puedes eliminar tu propia cuenta administradora.");
        }
        if (target.deletedAt) {
          throw new AdminUserDeletionError("ALREADY_DELETED", "La cuenta ya fue eliminada.");
        }
        if (target.email.toLowerCase() !== input.confirmationEmail) {
          throw new AdminUserDeletionError("EMAIL_MISMATCH", "El correo de confirmación no coincide.");
        }

        await tx.adminAuditLog.create({
          data: {
            actorId: actor.id,
            targetUserId: target.id,
            action: "USER_DELETED",
            reason: input.reason,
            changes: { deletedAt: now.toISOString(), retainedHistory: true },
          },
        });
        await tx.session.deleteMany({ where: { userId: target.id } });
        await tx.account.deleteMany({ where: { userId: target.id } });
        await tx.resourceProgress.deleteMany({ where: { userId: target.id } });
        await tx.savedResource.deleteMany({ where: { userId: target.id } });
        await tx.verification.deleteMany({ where: { identifier: { contains: target.email } } });
        await tx.payment.updateMany({
          where: { userId: target.id },
          data: {
            payerPhoneLast4: null,
            payerIdentificationLast4: null,
            payerIdentificationType: null,
          },
        });
        await tx.userInvitation.updateMany({
          where: { acceptedUserId: target.id },
          data: {
            name: "Usuario eliminado",
            email: `${target.id}@deleted.invalid`,
            activeEmail: null,
            tokenHash: `deleted-${target.id}`,
          },
        });
        await tx.user.update({
          where: { id: target.id },
          data: {
            name: "Usuario eliminado",
            email: `${target.id}@deleted.invalid`,
            emailVerified: false,
            image: null,
            birthDate: null,
            ageDeclared: null,
            termsAcceptedAt: null,
            privacyAcceptedAt: null,
            ageVerifiedAt: null,
            selectedLevelId: null,
            suspendedAt: null,
            suspensionReason: null,
            suspensionExpiresAt: null,
            adminCreatedAt: null,
            passwordChangeRequired: false,
            deletedAt: now,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof AdminUserDeletionError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new AdminUserDeletionError(
        "CONCURRENT_OPERATION",
        "La cuenta cambió durante la eliminación. Inténtalo de nuevo.",
      );
    }
    throw error;
  }
}
