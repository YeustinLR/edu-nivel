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
  WebhookOutcome,
} from "@/generated/prisma/client";
import type { OnvoPaymentIntent } from "@/server/payments/onvo/schemas";

const { getIntentMock, revalidateMock } = vi.hoisted(() => ({
  getIntentMock: vi.fn(),
  revalidateMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/payments/onvo/client", () => ({
  getOnvoPaymentIntent: getIntentMock,
  listOnvoPaymentIntents: vi.fn(),
}));
vi.mock("@/server/payments/onvo/payment-log", () => ({
  logOnvoPaymentEvent: vi.fn(),
}));
vi.mock("@/server/content/revalidate-content", () => ({
  revalidatePaymentAccessPages: revalidateMock,
}));

const RUN_DATABASE_INTEGRATION =
  process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!RUN_DATABASE_INTEGRATION)(
  "ONVO webhook retries with PostgreSQL",
  () => {
    it(
      "claims concurrent deliveries, retries FAILED and applies each payment once",
      async () => {
        const { config } = await import("dotenv");
        config({ path: [".env.local", ".env"], quiet: true });
        const previousWebhookSecret = process.env.ONVO_WEBHOOK_SECRET;
        process.env.ONVO_WEBHOOK_SECRET = "webhook_secret_database_test";

        const [{ prisma }, { POST }] = await Promise.all([
          import("@/server/db/prisma"),
          import("@/app/api/webhooks/onvo/route"),
        ]);
        const unique = randomUUID();
        const userIds: string[] = [];
        const levelIds: string[] = [];
        const providerObjectIds: string[] = [];
        const intents = new Map<string, OnvoPaymentIntent>();
        let levelSequence = 0;

        async function createScenario(name: string) {
          levelSequence += 1;
          const userId = `webhook-user-${name}-${unique}`;
          const levelId = `webhook-level-${name}-${unique}`;
          const providerPaymentIntentId = `webhook-intent-${name}-${unique}`;
          userIds.push(userId);
          levelIds.push(levelId);
          providerObjectIds.push(providerPaymentIntentId);

          await prisma.level.create({
            data: {
              id: levelId,
              levelNumber:
                2_000_000 +
                levelSequence * 100_000 +
                Math.floor(Math.random() * 99_999),
              description: `Webhook integration ${name}`,
            },
          });
          await prisma.user.create({
            data: {
              id: userId,
              name: `Webhook ${name}`,
              email: `webhook-${name}-${unique}@example.com`,
              emailVerified: true,
              role: Role.STUDENT,
            },
          });
          const payment = await prisma.payment.create({
            data: {
              userId,
              levelId,
              planCode: PlanCode.STUDENT_MONTHLY,
              product: SubscriptionProduct.STUDENT_PREMIUM,
              billingInterval: BillingInterval.MONTHLY,
              durationMonths: 1,
              roleAtCheckout: Role.STUDENT,
              expectedAmountMinor: 350_000,
              currency: "CRC",
              provider: PaymentProvider.ONVO,
              method: PaymentMethod.SINPE_MOBILE,
              providerMode: ProviderMode.TEST,
              providerStatus: "processing",
              providerPaymentIntentId,
              providerPaymentMethodId: `method-${name}-${unique}`,
              internalReference: `EDUNIVEL-${name}-${unique}`,
              checkoutRequestId: randomUUID(),
              status: PaymentStatus.PROCESSING,
            },
          });
          const intent: OnvoPaymentIntent = {
            id: providerPaymentIntentId,
            mode: "test",
            amount: payment.expectedAmountMinor,
            receivedAmount: payment.expectedAmountMinor,
            currency: payment.currency,
            status: "succeeded",
            paymentMethodId: payment.providerPaymentMethodId,
            metadata: {
              paymentId: payment.id,
              internalReference: payment.internalReference,
              userId,
              planCode: payment.planCode,
              levelId,
            },
            charges: [
              {
                id: `charge-${name}-${unique}`,
                amount: payment.expectedAmountMinor,
                status: "succeeded",
                isApproved: true,
              },
            ],
            updatedAt: "2026-08-22T12:00:00.000Z",
          };
          intents.set(providerPaymentIntentId, intent);

          const body = JSON.stringify({
            type: "payment-intent.succeeded",
            data: { id: providerPaymentIntentId, status: "succeeded" },
          });
          const request = () =>
            new Request("http://localhost:3000/api/webhooks/onvo", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-webhook-secret": "webhook_secret_database_test",
              },
              body,
            });

          return { userId, levelId, payment, intent, request };
        }

        getIntentMock.mockImplementation((intentId: string) =>
          Promise.resolve(intents.get(intentId)),
        );

        try {
          const successful = await createScenario("successful");
          const firstSuccess = await POST(successful.request());
          const duplicateSuccess = await POST(successful.request());

          expect(firstSuccess.status).toBe(200);
          expect(duplicateSuccess.status).toBe(200);
          expect(await duplicateSuccess.json()).toEqual({
            received: true,
            duplicate: true,
          });
          const successfulPayment = await prisma.payment.findUniqueOrThrow({
            where: { id: successful.payment.id },
          });
          const successfulSubscription =
            await prisma.subscription.findUniqueOrThrow({
              where: {
                userId_levelId: {
                  userId: successful.userId,
                  levelId: successful.levelId,
                },
              },
            });
          const successfulReceipt =
            await prisma.webhookReceipt.findFirstOrThrow({
              where: { providerObjectId: successful.intent.id },
            });
          expect(successfulPayment.appliedAt).not.toBeNull();
          expect(successfulSubscription.currentPeriodEnd).toEqual(
            new Date("2026-09-22T12:00:00.000Z"),
          );
          expect(successfulReceipt.outcome).toBe(WebhookOutcome.PROCESSED);
          expect(successfulReceipt.processingStartedAt).toBeNull();

          const retryable = await createScenario("retryable");
          let shouldFail = true;
          getIntentMock.mockImplementation((intentId: string) => {
            if (intentId === retryable.intent.id && shouldFail) {
              shouldFail = false;
              return Promise.reject(new Error("temporary ONVO failure"));
            }
            return Promise.resolve(intents.get(intentId));
          });

          const failedAttempt = await POST(retryable.request());
          expect(failedAttempt.status).toBe(500);
          expect(
            await prisma.webhookReceipt.findFirstOrThrow({
              where: { providerObjectId: retryable.intent.id },
            }),
          ).toMatchObject({
            outcome: WebhookOutcome.FAILED,
            errorCode: "TEMPORARY_PROCESSING_FAILURE",
          });

          const successfulRetry = await POST(retryable.request());
          const duplicateRetryOne = await POST(retryable.request());
          const duplicateRetryTwo = await POST(retryable.request());
          expect([
            successfulRetry.status,
            duplicateRetryOne.status,
            duplicateRetryTwo.status,
          ]).toEqual([200, 200, 200]);
          expect(
            await prisma.webhookReceipt.findFirstOrThrow({
              where: { providerObjectId: retryable.intent.id },
            }),
          ).toMatchObject({
            outcome: WebhookOutcome.PROCESSED,
            errorCode: null,
          });
          expect(
            await prisma.payment.findUniqueOrThrow({
              where: { id: retryable.payment.id },
            }),
          ).toMatchObject({ status: PaymentStatus.SUCCEEDED });
          expect(
            await prisma.subscription.count({
              where: {
                userId: retryable.userId,
                levelId: retryable.levelId,
              },
            }),
          ).toBe(1);

          const concurrent = await createScenario("concurrent");
          let releaseIntent!: () => void;
          let intentRequested!: () => void;
          const intentGate = new Promise<void>((resolve) => {
            releaseIntent = resolve;
          });
          const intentObserved = new Promise<void>((resolve) => {
            intentRequested = resolve;
          });
          getIntentMock.mockImplementation(async (intentId: string) => {
            if (intentId === concurrent.intent.id) {
              intentRequested();
              await intentGate;
            }
            return intents.get(intentId);
          });

          const requestA = POST(concurrent.request());
          await intentObserved;
          const requestB = await POST(concurrent.request());
          expect(requestB.status).toBe(503);
          expect(await requestB.json()).toEqual({
            received: false,
            code: "WEBHOOK_ALREADY_PROCESSING",
          });
          releaseIntent();
          expect((await requestA).status).toBe(200);
          expect(
            getIntentMock.mock.calls.filter(
              ([intentId]) => intentId === concurrent.intent.id,
            ),
          ).toHaveLength(1);
          expect(
            await prisma.subscription.count({
              where: {
                userId: concurrent.userId,
                levelId: concurrent.levelId,
              },
            }),
          ).toBe(1);

          const notApplicable = await createScenario("not-applicable");
          intents.set(notApplicable.intent.id, {
            ...notApplicable.intent,
            status: "processing",
            charges: [],
          });
          getIntentMock.mockImplementation((intentId: string) =>
            Promise.resolve(intents.get(intentId)),
          );
          const notApplicableResponse = await POST(notApplicable.request());
          expect(notApplicableResponse.status).toBe(200);
          expect(
            await prisma.payment.findUniqueOrThrow({
              where: { id: notApplicable.payment.id },
            }),
          ).toMatchObject({
            status: PaymentStatus.PROCESSING,
            appliedAt: null,
          });
          expect(
            await prisma.subscription.count({
              where: {
                userId: notApplicable.userId,
                levelId: notApplicable.levelId,
              },
            }),
          ).toBe(0);
        } finally {
          await prisma.webhookReceipt.deleteMany({
            where: { providerObjectId: { in: providerObjectIds } },
          });
          await prisma.payment.deleteMany({ where: { userId: { in: userIds } } });
          await prisma.subscription.deleteMany({
            where: { userId: { in: userIds } },
          });
          await prisma.user.deleteMany({ where: { id: { in: userIds } } });
          await prisma.level.deleteMany({ where: { id: { in: levelIds } } });
          if (previousWebhookSecret === undefined) {
            delete process.env.ONVO_WEBHOOK_SECRET;
          } else {
            process.env.ONVO_WEBHOOK_SECRET = previousWebhookSecret;
          }
        }
      },
      45_000,
    );
  },
);
