import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  BillingInterval,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  PlanCode,
  ProviderMode,
  RefundStatus,
  Role,
  SubscriptionProduct,
  SubscriptionStatus,
} from "@/generated/prisma/client";

const { getRefundMock } = vi.hoisted(() => ({ getRefundMock: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/server/payments/onvo/client", () => ({
  getOnvoRefund: getRefundMock,
}));

const RUN_DATABASE_INTEGRATION =
  process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!RUN_DATABASE_INTEGRATION)(
  "manual ONVO refunds with PostgreSQL",
  () => {
    it(
      "applies one total refund exactly once under concurrency",
      async () => {
        const { config } = await import("dotenv");
        config({ path: [".env.local", ".env"], quiet: true });

        const [{ prisma }, { registerManualOnvoRefund }] = await Promise.all([
          import("@/server/db/prisma"),
          import("@/server/payments/onvo/refunds"),
        ]);
        const unique = randomUUID();
        const studentId = `db-refund-student-${unique}`;
        const adminId = `db-refund-admin-${unique}`;
        const levelId = `db-refund-level-${unique}`;
        const paymentIntentId = `intent-refund-${unique}`;
        const providerRefundId = `refund-${unique}`;
        const refundedAt = new Date("2026-08-10T12:01:00.000Z");

        try {
          await prisma.user.createMany({
            data: [
              {
                id: studentId,
                name: "Refund Student",
                email: `refund-student-${unique}@example.com`,
                emailVerified: true,
                role: Role.STUDENT,
              },
              {
                id: adminId,
                name: "Refund Admin",
                email: `refund-admin-${unique}@example.com`,
                emailVerified: true,
                role: Role.ADMIN,
              },
            ],
          });
          await prisma.level.create({
            data: {
              id: levelId,
              levelNumber: 1_100_000 + Math.floor(Math.random() * 99_999),
              description: "Nivel para reembolso de integración",
            },
          });
          const subscription = await prisma.subscription.create({
            data: {
              userId: studentId,
              levelId,
              product: SubscriptionProduct.STUDENT_PREMIUM,
              status: SubscriptionStatus.ACTIVE,
              currentPeriodStart: new Date("2026-08-01T12:00:00.000Z"),
              currentPeriodEnd: new Date("2026-09-01T12:00:00.000Z"),
              lastPlanCode: PlanCode.STUDENT_MONTHLY,
            },
          });
          const payment = await prisma.payment.create({
            data: {
              userId: studentId,
              levelId,
              subscriptionId: subscription.id,
              planCode: PlanCode.STUDENT_MONTHLY,
              product: SubscriptionProduct.STUDENT_PREMIUM,
              billingInterval: BillingInterval.MONTHLY,
              durationMonths: 1,
              roleAtCheckout: Role.STUDENT,
              expectedAmountMinor: 350_000,
              receivedAmountMinor: 350_000,
              currency: "CRC",
              provider: PaymentProvider.ONVO,
              method: PaymentMethod.SINPE_MOBILE,
              providerMode: ProviderMode.TEST,
              providerStatus: "succeeded",
              providerPaymentIntentId: paymentIntentId,
              providerPaymentMethodId: `method-refund-${unique}`,
              internalReference: `EDUNIVEL-refund-${unique}`,
              checkoutRequestId: randomUUID(),
              status: PaymentStatus.SUCCEEDED,
              confirmedAt: new Date("2026-08-01T12:00:00.000Z"),
              appliedAt: new Date("2026-08-01T12:00:01.000Z"),
            },
          });
          const refundCase = await prisma.paymentRefund.create({
            data: {
              paymentId: payment.id,
              provider: PaymentProvider.ONVO,
              providerMode: ProviderMode.TEST,
              expectedAmountMinor: 350_000,
              currency: "CRC",
              requestedById: adminId,
            },
          });

          getRefundMock.mockResolvedValue({
            id: providerRefundId,
            paymentIntentId,
            amount: 350_000,
            currency: "CRC",
            mode: "test",
            status: "succeeded",
            reason: "requested_by_customer",
            createdAt: "2026-08-10T12:00:00.000Z",
            updatedAt: refundedAt.toISOString(),
          });

          const results = await Promise.all([
            registerManualOnvoRefund({
              refundCaseId: refundCase.id,
              providerRefundId,
            }),
            registerManualOnvoRefund({
              refundCaseId: refundCase.id,
              providerRefundId,
            }),
          ]);
          expect(results.map((result) => result.outcome).sort()).toEqual([
            "ALREADY_APPLIED",
            "SUCCEEDED",
          ]);

          const [storedPayment, storedSubscription, storedRefund] =
            await Promise.all([
              prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
              prisma.subscription.findUniqueOrThrow({
                where: { id: subscription.id },
              }),
              prisma.paymentRefund.findUniqueOrThrow({
                where: { id: refundCase.id },
              }),
            ]);
          expect(storedPayment.status).toBe(PaymentStatus.REFUNDED);
          expect(storedSubscription.status).toBe(SubscriptionStatus.REFUNDED);
          expect(storedSubscription.currentPeriodEnd).toEqual(refundedAt);
          expect(storedRefund.status).toBe(RefundStatus.SUCCEEDED);
          expect(storedRefund.providerRefundId).toBe(providerRefundId);
          expect(storedRefund.appliedAt).not.toBeNull();
        } finally {
          await prisma.paymentRefund.deleteMany({
            where: { payment: { userId: studentId } },
          });
          await prisma.payment.deleteMany({ where: { userId: studentId } });
          await prisma.subscription.deleteMany({ where: { userId: studentId } });
          await prisma.user.deleteMany({
            where: { id: { in: [studentId, adminId] } },
          });
          await prisma.level.deleteMany({ where: { id: levelId } });
        }
      },
      30_000,
    );
  },
);
