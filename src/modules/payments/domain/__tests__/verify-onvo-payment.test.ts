import { describe, expect, it } from "vitest";

import {
  PlanCode,
  ProviderMode,
  type Payment,
} from "@/generated/prisma/client";
import { verifyOnvoPaymentIntent } from "@/modules/payments/domain/verify-onvo-payment";
import type { OnvoPaymentIntent } from "@/server/payments/onvo/schemas";

const payment = {
  id: "payment_1",
  userId: "user_1",
  levelId: "level_7",
  planCode: PlanCode.STUDENT_MONTHLY,
  expectedAmountMinor: 350_000,
  currency: "CRC",
  providerMode: ProviderMode.TEST,
  providerPaymentMethodId: "method_1",
  internalReference: "EDU-REF-1",
} satisfies Pick<
  Payment,
  | "id"
  | "userId"
  | "levelId"
  | "planCode"
  | "expectedAmountMinor"
  | "currency"
  | "providerMode"
  | "providerPaymentMethodId"
  | "internalReference"
>;

const intent = {
  id: "intent_1",
  mode: "test",
  amount: 350_000,
  receivedAmount: 350_000,
  currency: "CRC",
  status: "succeeded",
  paymentMethodId: "method_1",
  metadata: {
    paymentId: "payment_1",
    internalReference: "EDU-REF-1",
    userId: "user_1",
    planCode: "STUDENT_MONTHLY",
    levelId: "level_7",
  },
} satisfies OnvoPaymentIntent;

describe("verifyOnvoPaymentIntent", () => {
  it("accepts a matching provider intent", () => {
    expect(verifyOnvoPaymentIntent(payment, intent)).toEqual([]);
  });

  it("detects amount and currency mismatches", () => {
    expect(
      verifyOnvoPaymentIntent(payment, {
        ...intent,
        amount: 400_000,
        receivedAmount: 400_000,
        currency: "USD",
      }),
    ).toEqual(
      expect.arrayContaining(["AMOUNT_MISMATCH", "CURRENCY_MISMATCH"]),
    );
  });

  it("requires the full expected amount before accepting success", () => {
    expect(
      verifyOnvoPaymentIntent(payment, {
        ...intent,
        receivedAmount: 175_000,
      }),
    ).toContain("RECEIVED_AMOUNT_MISMATCH");
  });

  it("detects mode and payment method mismatches", () => {
    expect(
      verifyOnvoPaymentIntent(payment, {
        ...intent,
        mode: "live",
        paymentMethodId: "method_other",
      }),
    ).toEqual(
      expect.arrayContaining([
        "PROVIDER_MODE_MISMATCH",
        "PAYMENT_METHOD_MISMATCH",
      ]),
    );
  });

  it("accepts the embedded payment method returned by the retrieval endpoint", () => {
    expect(
      verifyOnvoPaymentIntent(payment, {
        ...intent,
        paymentMethodId: undefined,
        paymentMethod: {
          id: "method_1",
          type: "mobile_number",
        },
      }),
    ).toEqual([]);
  });

  it("detects metadata from another payment or user", () => {
    expect(
      verifyOnvoPaymentIntent(payment, {
        ...intent,
        metadata: {
          paymentId: "payment_other",
          internalReference: "OTHER",
          userId: "user_other",
          planCode: "TEACHER_YEARLY",
          levelId: "level_other",
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        "PAYMENT_REFERENCE_MISMATCH",
        "PAYMENT_USER_MISMATCH",
        "PAYMENT_PLAN_MISMATCH",
        "PAYMENT_LEVEL_MISMATCH",
      ]),
    );
  });
});
