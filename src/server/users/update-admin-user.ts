import "server-only";

import { PaymentStatus, Role } from "@/generated/prisma/enums";
import type { AdminUserEditInput } from "@/modules/users/schemas/admin-user-edit.schema";
import { getRequiredSubscriptionProduct } from "@/modules/subscriptions/domain/premium-access";
import { prisma } from "@/server/db/prisma";

export type AdminUserUpdateErrorCode =
  | "NOT_FOUND"
  | "EDIT_CONFLICT"
  | "SELF_ROLE_CHANGE"
  | "ADMIN_ROLE_PROTECTED"
  | "ROLE_FINANCIAL_CONFLICT"
  | "INVALID_LEVEL";

export class AdminUserUpdateError extends Error {
  constructor(
    public readonly code: AdminUserUpdateErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AdminUserUpdateError";
  }
}

export type AdminUserUpdateActor = { id: string; role: Role };

export async function updateAdminUser(
  input: AdminUserEditInput,
  actor: AdminUserUpdateActor,
) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: input.id },
      select: { id: true, role: true, selectedLevelId: true, deletedAt: true },
    });

    if (!target || target.deletedAt) {
      throw new AdminUserUpdateError("NOT_FOUND", "El usuario ya no existe.");
    }

    const roleChanged = target.role !== input.role;

    if (roleChanged && actor.id === target.id) {
      throw new AdminUserUpdateError(
        "SELF_ROLE_CHANGE",
        "No puedes cambiar tu propio rol administrativo.",
      );
    }

    if (roleChanged && target.role === Role.ADMIN) {
      throw new AdminUserUpdateError(
        "ADMIN_ROLE_PROTECTED",
        "El rol de una cuenta administradora no se puede degradar desde este formulario.",
      );
    }

    if (roleChanged && input.role === Role.ADMIN) {
      throw new AdminUserUpdateError(
        "ADMIN_ROLE_PROTECTED",
        "La promoción a administrador requiere un flujo sensible con auditoría.",
      );
    }

    const targetProduct = getRequiredSubscriptionProduct(input.role);
    if (roleChanged && targetProduct) {
      const incompatibleSubscription = await tx.subscription.findFirst({
        where: {
          userId: target.id,
          product: { not: targetProduct },
        },
        select: { id: true },
      });
      const incompatibleOpenPayment = await tx.payment.findFirst({
        where: {
          userId: target.id,
          roleAtCheckout: { not: input.role },
          status: {
            in: [
              PaymentStatus.INITIALIZING,
              PaymentStatus.PROCESSING,
              PaymentStatus.REQUIRES_REVIEW,
            ],
          },
        },
        select: { id: true },
      });

      if (incompatibleSubscription || incompatibleOpenPayment) {
        throw new AdminUserUpdateError(
          "ROLE_FINANCIAL_CONFLICT",
          "El usuario tiene una suscripción o un pago incompatible con el nuevo rol.",
        );
      }
    }

    const canSelectLevel =
      input.role === Role.STUDENT || input.role === Role.TEACHER;
    const selectedLevelId = canSelectLevel ? input.selectedLevelId : null;

    if (selectedLevelId) {
      const level = await tx.level.findUnique({
        where: { id: selectedLevelId },
        select: { isActive: true },
      });

      if (!level || (!level.isActive && target.selectedLevelId !== selectedLevelId)) {
        throw new AdminUserUpdateError(
          "INVALID_LEVEL",
          "Selecciona un nivel activo y disponible.",
        );
      }
    }

    const updated = await tx.user.updateMany({
      where: { id: target.id, updatedAt: input.expectedUpdatedAt },
      data: {
        name: input.name,
        role: input.role,
        selectedLevelId,
      },
    });

    if (updated.count !== 1) {
      throw new AdminUserUpdateError(
        "EDIT_CONFLICT",
        "El usuario cambió mientras lo editabas. Recarga la página e inténtalo de nuevo.",
      );
    }

    if (roleChanged) {
      await tx.session.deleteMany({ where: { userId: target.id } });
      await tx.adminAuditLog.create({
        data: {
          actorId: actor.id,
          targetUserId: target.id,
          action: "USER_ROLE_CHANGED",
          changes: {
            previousRole: target.role,
            nextRole: input.role,
          },
        },
      });
    }

    return { id: target.id, roleChanged };
  });
}
