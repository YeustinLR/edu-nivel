import { describe, expect, it } from "vitest";

import {
  onvoPaymentIntentSchema,
  onvoPaymentMethodSchema,
} from "@/server/payments/onvo/schemas";

describe("onvoPaymentIntentSchema", () => {
  it("accepts a processing SINPE payment intent", () => {
    const result = onvoPaymentIntentSchema.safeParse({
      id: "clpiment0001",
      mode: "test",
      amount: 350000,
      receivedAmount: 0,
      currency: "CRC",
      status: "processing",
      paymentMethodId: "clpm0001",
      metadata: {
        paymentId: "payment_1",
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts the expanded PaymentIntent returned by the Sandbox retrieval endpoint", () => {
    const result = onvoPaymentIntentSchema.safeParse({
      id: "clpiment0001",
      mode: "test",
      amount: 350000,
      receivedAmount: 350000,
      currency: "CRC",
      status: "succeeded",
      paymentMethod: {
        id: "clpm0001",
        type: "mobile_number",
      },
      charges: [
        {
          id: "clch0001",
          amount: 350000,
          status: "succeeded",
          isApproved: true,
        },
      ],
      metadata: {
        paymentId: "payment_1",
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects decimal amounts", () => {
    const result = onvoPaymentIntentSchema.safeParse({
      id: "clpiment0001",
      mode: "test",
      amount: 3500.5,
      currency: "CRC",
      status: "processing",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown payment intent statuses", () => {
    const result = onvoPaymentIntentSchema.safeParse({
      id: "clpiment0001",
      mode: "test",
      amount: 350000,
      currency: "CRC",
      status: "paid",
    });

    expect(result.success).toBe(false);
  });
});

describe("onvoPaymentMethodSchema", () => {
  it("accepts a SINPE mobile payment method", () => {
    const result = onvoPaymentMethodSchema.safeParse({
      id: "clpm0001",
      type: "mobile_number",
      mode: "test",
    });

    expect(result.success).toBe(true);
  });

  it("rejects methods outside the SINPE Mobile scope", () => {
    const result = onvoPaymentMethodSchema.safeParse({
      id: "clpm0001",
      type: "card",
      mode: "test",
    });

    expect(result.success).toBe(false);
  });
});
