import { describe, expect, it } from "vitest";

import {
  startSinpePaymentSchema,
  startLearnerRenewalPaymentSchema,
} from "@/modules/payments/schemas/start-sinpe-payment.schema";

const validInput = {
  planCode: "STUDENT_MONTHLY",
  levelId: "level_7",
  checkoutRequestId: "e07d8f08-8097-4a76-9d7a-e7306ca87f80",
  mobileNumber: "8888-8888",
  identificationType: "0",
  identification: "01-1234-5678",
};

describe("startSinpePaymentSchema", () => {
  it("normaliza un numero nacional al formato de ONVO", () => {
    const result = startSinpePaymentSchema.parse(validInput);

    expect(result.mobileNumber).toBe("+50688888888");
    expect(result.identificationType).toBe(0);
  });

  it("mantiene un numero que ya incluye el codigo de Costa Rica", () => {
    const result = startSinpePaymentSchema.parse({
      ...validInput,
      mobileNumber: "+506 8888 8888",
    });

    expect(result.mobileNumber).toBe("+50688888888");
  });

  it("rechaza numeros que no tienen ocho digitos nacionales", () => {
    const result = startSinpePaymentSchema.safeParse({
      ...validInput,
      mobileNumber: "1234",
    });

    expect(result.success).toBe(false);
  });

  it("rechaza tipos de identificacion que ONVO no documenta", () => {
    const result = startSinpePaymentSchema.safeParse({
      ...validInput,
      identificationType: "8",
    });

    expect(result.success).toBe(false);
  });
});

describe("startLearnerRenewalPaymentSchema", () => {
  it("uses a subscription id and never accepts a client level as renewal authority", () => {
    const result = startLearnerRenewalPaymentSchema.parse({
      ...validInput,
      subscriptionId: "subscription_7",
    });

    expect(result.subscriptionId).toBe("subscription_7");
    expect(result).not.toHaveProperty("levelId");
  });
});
