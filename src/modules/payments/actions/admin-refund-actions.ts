"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/client";
import {
  cancelManualRefundSchema,
  createManualRefundCaseSchema,
  reconcileManualRefundSchema,
  registerManualRefundSchema,
} from "@/modules/payments/schemas/manual-refund.schema";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";
import {
  cancelManualRefundCase,
  createManualRefundCase,
  ManualRefundError,
  reconcileOnvoRefund,
  registerManualOnvoRefund,
} from "@/server/payments/onvo/refunds";

const paymentsPath = "/dashboard/admin/payments";

function redirectWithResult(
  status: "success" | "error",
  code: string,
): never {
  redirect(`${paymentsPath}?${status}=${encodeURIComponent(code)}`);
}

function refundErrorCode(error: unknown): string {
  return error instanceof ManualRefundError
    ? error.code
    : "REFUND_OPERATION_FAILED";
}

async function recordRefundAudit(input: {
  actorId: string;
  paymentId: string;
  action: string;
  refundCaseId: string;
  providerRefundId?: string | null;
}) {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    select: { userId: true },
  });
  if (!payment) return;

  await prisma.adminAuditLog.create({
    data: {
      actorId: input.actorId,
      targetUserId: payment.userId,
      action: input.action,
      changes: {
        paymentId: input.paymentId,
        refundCaseId: input.refundCaseId,
        providerRefundId: input.providerRefundId ?? null,
      },
    },
  });
}

function revalidateRefundSurfaces() {
  revalidatePath(paymentsPath);
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/subscription");
  revalidatePath("/dashboard/student", "layout");
  revalidatePath("/dashboard/teacher", "layout");
}

export async function createManualRefundCaseAction(formData: FormData) {
  const admin = await requireRole(Role.ADMIN);
  const parsed = createManualRefundCaseSchema.safeParse({
    paymentId: formData.get("paymentId"),
  });
  if (!parsed.success) redirectWithResult("error", "INVALID_REFUND_DATA");

  try {
    const refundCase = await createManualRefundCase({
      paymentId: parsed.data.paymentId,
      requestedById: admin.id,
    });
    await recordRefundAudit({
      actorId: admin.id,
      paymentId: parsed.data.paymentId,
      action: "PAYMENT_REFUND_CASE_CREATED",
      refundCaseId: refundCase.id,
    });
    revalidateRefundSurfaces();
  } catch (error) {
    redirectWithResult("error", refundErrorCode(error));
  }

  redirectWithResult("success", "REFUND_CASE_CREATED");
}

export async function registerManualRefundAction(formData: FormData) {
  const admin = await requireRole(Role.ADMIN);
  const parsed = registerManualRefundSchema.safeParse({
    refundCaseId: formData.get("refundCaseId"),
    providerRefundId: formData.get("providerRefundId"),
  });
  if (!parsed.success) redirectWithResult("error", "INVALID_REFUND_DATA");

  let outcome: string;
  try {
    const result = await registerManualOnvoRefund(parsed.data);
    await recordRefundAudit({
      actorId: admin.id,
      paymentId: result.paymentId,
      action: "PAYMENT_REFUND_REGISTERED",
      refundCaseId: result.refundCaseId,
      providerRefundId: parsed.data.providerRefundId,
    });
    revalidateRefundSurfaces();
    outcome = result.outcome;
  } catch (error) {
    redirectWithResult("error", refundErrorCode(error));
  }
  redirectWithResult("success", `REFUND_${outcome}`);
}

export async function cancelManualRefundAction(formData: FormData) {
  const admin = await requireRole(Role.ADMIN);
  const parsed = cancelManualRefundSchema.safeParse({
    refundCaseId: formData.get("refundCaseId"),
  });
  if (!parsed.success) redirectWithResult("error", "INVALID_REFUND_DATA");

  const refundCase = await prisma.paymentRefund.findUnique({
    where: { id: parsed.data.refundCaseId },
    select: { paymentId: true },
  });

  if (!refundCase) redirectWithResult("error", "REFUND_CASE_NOT_FOUND");

  try {
    await cancelManualRefundCase(parsed.data.refundCaseId);
    await recordRefundAudit({
      actorId: admin.id,
      paymentId: refundCase.paymentId,
      action: "PAYMENT_REFUND_CASE_CANCELED",
      refundCaseId: parsed.data.refundCaseId,
    });
    revalidateRefundSurfaces();
  } catch (error) {
    redirectWithResult("error", refundErrorCode(error));
  }

  redirectWithResult("success", "REFUND_CASE_CANCELED");
}

export async function reconcileManualRefundAction(formData: FormData) {
  const admin = await requireRole(Role.ADMIN);
  const parsed = reconcileManualRefundSchema.safeParse({
    refundCaseId: formData.get("refundCaseId"),
  });
  if (!parsed.success) redirectWithResult("error", "INVALID_REFUND_DATA");

  const refundCase = await prisma.paymentRefund.findUnique({
    where: { id: parsed.data.refundCaseId },
  });
  if (!refundCase?.providerRefundId) {
    redirectWithResult("error", "REFUND_ID_REQUIRED");
  }

  let outcome: string;
  try {
    const result = await reconcileOnvoRefund(refundCase.providerRefundId);
    await recordRefundAudit({
      actorId: admin.id,
      paymentId: result.paymentId,
      action: "PAYMENT_REFUND_RECONCILED",
      refundCaseId: result.refundCaseId,
      providerRefundId: refundCase.providerRefundId,
    });
    revalidateRefundSurfaces();
    outcome = result.outcome;
  } catch (error) {
    redirectWithResult("error", refundErrorCode(error));
  }
  redirectWithResult("success", `REFUND_${outcome}`);
}
