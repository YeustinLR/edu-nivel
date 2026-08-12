import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  BillingInterval,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  PlanCode,
  ProviderMode,
  Role,
  SubscriptionProduct,
  SubscriptionStatus,
} from "@/generated/prisma/client";
import type { OnvoPaymentIntent } from "@/server/payments/onvo/schemas";

const { getIntentMock } = vi.hoisted(() => ({
  getIntentMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/payments/onvo/client", () => ({
  getOnvoPaymentIntent: getIntentMock,
}));

const RUN_DATABASE_INTEGRATION =
  process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!RUN_DATABASE_INTEGRATION)(
  "reconcileOnvoPaymentIntent with PostgreSQL",
  () => {
    it(
      "isolates levels, accumulates renewals and prevents duplicate open payments",
      async () => {
        const { config } = await import("dotenv");
        config({ path: [".env.local", ".env"], quiet: true });

        const [{ prisma }, { reconcileOnvoPaymentIntent }] = await Promise.all([
          import("@/server/db/prisma"),
          import("@/server/payments/onvo/reconcile"),
        ]);
        const unique = randomUUID();
        const userId = `db-onvo-${unique}`;
        const levelId = `db-level-${unique}`;
        const secondLevelId = `db-level-second-${unique}`;
        const intents = new Map<string, OnvoPaymentIntent>();

        function intentFor(payment: {
          id: string;
          userId: string;
          levelId: string;
          planCode: PlanCode;
          expectedAmountMinor: number;
          currency: string;
          providerPaymentIntentId: string | null;
          providerPaymentMethodId: string | null;
          internalReference: string;
        }): OnvoPaymentIntent {
          return {
            id: payment.providerPaymentIntentId!,
            mode: "test",
            amount: payment.expectedAmountMinor,
            receivedAmount: payment.expectedAmountMinor,
            currency: payment.currency,
            status: "succeeded",
            paymentMethodId: payment.providerPaymentMethodId,
            metadata: {
              paymentId: payment.id,
              internalReference: payment.internalReference,
              userId: payment.userId,
              planCode: payment.planCode,
              levelId: payment.levelId,
            },
            charges: [
              {
                id: `charge-${payment.id}`,
                amount: payment.expectedAmountMinor,
                status: "succeeded",
                isApproved: true,
              },
            ],
            updatedAt: "2026-07-23T18:00:00.000Z",
          };
        }

        async function createPayment(
          suffix: string,
          planCode: PlanCode,
          billingInterval: BillingInterval,
          durationMonths: number,
          expectedAmountMinor: number,
          targetLevelId = levelId,
        ) {
          const payment = await prisma.payment.create({
            data: {
              userId,
              levelId: targetLevelId,
              planCode,
              product: SubscriptionProduct.STUDENT_PREMIUM,
              billingInterval,
              durationMonths,
              roleAtCheckout: Role.STUDENT,
              expectedAmountMinor,
              currency: "CRC",
              provider: PaymentProvider.ONVO,
              method: PaymentMethod.SINPE_MOBILE,
              providerMode: ProviderMode.TEST,
              providerStatus: "processing",
              providerPaymentIntentId: `intent-${suffix}-${unique}`,
              providerPaymentMethodId: `method-${suffix}-${unique}`,
              internalReference: `EDUNIVEL-${suffix}-${unique}`,
              checkoutRequestId: randomUUID(),
              status: PaymentStatus.PROCESSING,
            },
          });

          intents.set(payment.providerPaymentIntentId!, intentFor(payment));
          return payment;
        }

        getIntentMock.mockImplementation((intentId: string) =>
          Promise.resolve(intents.get(intentId)),
        );

        try {
          await prisma.level.create({
            data: {
              id: levelId,
              levelNumber: 900_000 + Math.floor(Math.random() * 99_999),
              description: "Nivel para prueba de integracion ONVO",
            },
          });
          await prisma.level.create({
            data: {
              id: secondLevelId,
              levelNumber: 1_000_000 + Math.floor(Math.random() * 99_999),
              description: "Segundo nivel para prueba multi-nivel",
            },
          });
          await prisma.user.create({
            data: {
              id: userId,
              name: "ONVO Database Integration",
              email: `db-onvo-${unique}@example.com`,
              emailVerified: true,
              role: Role.STUDENT,
            },
          });
          await prisma.subscription.create({
            data: {
              userId,
              levelId,
              product: SubscriptionProduct.STUDENT_PREMIUM,
              status: SubscriptionStatus.ACTIVE,
              currentPeriodStart: new Date("2026-07-01T12:00:00.000Z"),
              currentPeriodEnd: new Date("2026-08-01T12:00:00.000Z"),
              lastPlanCode: PlanCode.STUDENT_MONTHLY,
            },
          });

          const monthly = await createPayment(
            "monthly",
            PlanCode.STUDENT_MONTHLY,
            BillingInterval.MONTHLY,
            1,
            350_000,
          );

          await expect(
            createPayment(
              "duplicate-open",
              PlanCode.STUDENT_YEARLY,
              BillingInterval.YEARLY,
              12,
              3_360_000,
            ),
          ).rejects.toMatchObject({ code: "P2002" });

          await expect(
            reconcileOnvoPaymentIntent(monthly.providerPaymentIntentId!),
          ).resolves.toMatchObject({ outcome: "SUCCEEDED" });

          const yearly = await createPayment(
            "yearly",
            PlanCode.STUDENT_YEARLY,
            BillingInterval.YEARLY,
            12,
            3_360_000,
          );
          await expect(
            reconcileOnvoPaymentIntent(yearly.providerPaymentIntentId!),
          ).resolves.toMatchObject({ outcome: "SUCCEEDED" });

          const afterDistinctPayments =
            await prisma.subscription.findUniqueOrThrow({
              where: {
                userId_levelId: {
                  userId,
                  levelId,
                },
              },
            });
          expect(afterDistinctPayments.currentPeriodEnd).toEqual(
            new Date("2027-09-01T12:00:00.000Z"),
          );

          const replayed = await createPayment(
            "concurrent",
            PlanCode.STUDENT_MONTHLY,
            BillingInterval.MONTHLY,
            1,
            350_000,
          );
          const concurrentResults = await Promise.all([
            reconcileOnvoPaymentIntent(replayed.providerPaymentIntentId!),
            reconcileOnvoPaymentIntent(replayed.providerPaymentIntentId!),
          ]);

          expect(concurrentResults.map((result) => result.outcome).sort()).toEqual(
            ["ALREADY_APPLIED", "SUCCEEDED"],
          );

          const finalSubscription =
            await prisma.subscription.findUniqueOrThrow({
              where: {
                userId_levelId: {
                  userId,
                  levelId,
                },
              },
            });
          expect(finalSubscription.currentPeriodEnd).toEqual(
            new Date("2027-10-01T12:00:00.000Z"),
          );

          await prisma.subscription.create({
            data: {
              userId,
              levelId: secondLevelId,
              product: SubscriptionProduct.STUDENT_PREMIUM,
              status: SubscriptionStatus.ACTIVE,
              currentPeriodStart: new Date("2026-11-01T12:00:00.000Z"),
              currentPeriodEnd: new Date("2026-12-01T12:00:00.000Z"),
              lastPlanCode: PlanCode.STUDENT_MONTHLY,
            },
          });
          const secondLevelPayment = await createPayment(
            "second-level",
            PlanCode.STUDENT_MONTHLY,
            BillingInterval.MONTHLY,
            1,
            350_000,
            secondLevelId,
          );
          await expect(
            reconcileOnvoPaymentIntent(secondLevelPayment.providerPaymentIntentId!),
          ).resolves.toMatchObject({ outcome: "SUCCEEDED" });

          const [firstLevelAfterSecondRenewal, secondLevelAfterRenewal] =
            await Promise.all([
              prisma.subscription.findUniqueOrThrow({
                where: { userId_levelId: { userId, levelId } },
              }),
              prisma.subscription.findUniqueOrThrow({
                where: {
                  userId_levelId: { userId, levelId: secondLevelId },
                },
              }),
            ]);
          expect(firstLevelAfterSecondRenewal.currentPeriodEnd).toEqual(
            new Date("2027-10-01T12:00:00.000Z"),
          );
          expect(secondLevelAfterRenewal.currentPeriodEnd).toEqual(
            new Date("2027-01-01T12:00:00.000Z"),
          );
          expect(
            await prisma.payment.count({
              where: {
                userId,
                status: PaymentStatus.SUCCEEDED,
                appliedAt: { not: null },
              },
            }),
          ).toBe(4);
        } finally {
          await prisma.payment.deleteMany({ where: { userId } });
          await prisma.subscription.deleteMany({ where: { userId } });
          await prisma.user.deleteMany({ where: { id: userId } });
          await prisma.level.deleteMany({
            where: { id: { in: [levelId, secondLevelId] } },
          });
        }
      },
      30_000,
    );
  },
);
