import "server-only";

import { hashPassword, verifyPassword } from "better-auth/crypto";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

export type CompleteAccountErrorCode = "INVALID_PASSWORD" | "NOT_PENDING" | "CONCURRENT_OPERATION";

export class CompleteAccountError extends Error {
  constructor(public readonly code: CompleteAccountErrorCode, message: string) {
    super(message);
    this.name = "CompleteAccountError";
  }
}

export async function completeAdminCreatedAccount(input: {
  userId: string;
  sessionId: string;
  ageDeclared: number;
  passwordChangeRequired: boolean;
  currentPassword?: string;
  password?: string;
}) {
  const newPasswordHash = input.passwordChangeRequired && input.password
    ? await hashPassword(input.password)
    : null;
  const now = new Date();

  try {
    await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findFirst({
          where: { id: input.userId, deletedAt: null, adminCreatedAt: { not: null } },
          select: {
            passwordChangeRequired: true,
            accounts: {
              where: { providerId: "credential" },
              take: 1,
              select: { id: true, password: true },
            },
          },
        });
        if (!user) throw new CompleteAccountError("NOT_PENDING", "La cuenta no requiere configuración inicial.");
        if (user.passwordChangeRequired !== input.passwordChangeRequired) {
          throw new CompleteAccountError("CONCURRENT_OPERATION", "El estado de la cuenta cambió. Recarga la página.");
        }

        if (user.passwordChangeRequired) {
          const account = user.accounts[0];
          const isValid = Boolean(
            account?.password &&
              input.currentPassword &&
              (await verifyPassword({ hash: account.password, password: input.currentPassword })),
          );
          if (!isValid || !account || !newPasswordHash) {
            throw new CompleteAccountError("INVALID_PASSWORD", "La contraseña temporal no es correcta.");
          }
          await tx.account.update({ where: { id: account.id }, data: { password: newPasswordHash } });
        }

        const updated = await tx.user.updateMany({
          where: {
            id: input.userId,
            deletedAt: null,
            passwordChangeRequired: input.passwordChangeRequired,
          },
          data: {
            ageDeclared: input.ageDeclared,
            ageVerifiedAt: now,
            termsAcceptedAt: now,
            privacyAcceptedAt: now,
            passwordChangeRequired: false,
          },
        });
        if (updated.count !== 1) {
          throw new CompleteAccountError("CONCURRENT_OPERATION", "El estado de la cuenta cambió. Inténtalo de nuevo.");
        }
        await tx.session.deleteMany({
          where: { userId: input.userId, id: { not: input.sessionId } },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof CompleteAccountError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      throw new CompleteAccountError("CONCURRENT_OPERATION", "La cuenta cambió. Inténtalo de nuevo.");
    }
    throw error;
  }
}
