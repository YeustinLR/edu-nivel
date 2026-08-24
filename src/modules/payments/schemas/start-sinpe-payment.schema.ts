import { z } from "zod";

import { SUBSCRIPTION_PLAN_CODES } from "@/modules/subscriptions/config/plan-catalog";

const costaRicanPhoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ""))
  .refine(
    (value) => /^(?:\+?506)?\d{8}$/.test(value),
    "Ingresa un numero de Costa Rica de 8 digitos.",
  )
  .transform((value) => `+506${value.replace(/^\+?506/, "")}`);

const identificationPatterns: Record<number, RegExp> = {
  0: /^0\d-\d{4}-\d{4}$/,
  1: /^1\d{11}$/,
  2: /^2-\d{3}-\d{6}$/,
  3: /^3-\d{3}-\d{6}$/,
  4: /^4-000-\d{6}$/,
  5: /^5\d{11}$/,
  9: /^9\d{11}$/,
};

const payerFields = {
  mobileNumber: costaRicanPhoneSchema,
  identificationType: z.coerce.number().int().refine(
    (value) => Object.hasOwn(identificationPatterns, value),
    "El tipo de identificacion no es valido.",
  ),
  identification: z
    .string()
    .trim()
    .max(12, "La identificacion no tiene el formato requerido por ONVO."),
};

function validateIdentification(
  input: { identificationType: number; identification: string },
  ctx: z.RefinementCtx,
) {
  if (!identificationPatterns[input.identificationType]?.test(input.identification)) {
    ctx.addIssue({
      code: "custom",
      path: ["identification"],
      message:
        "La identificacion no coincide con el formato del tipo seleccionado.",
    });
  }
}

export const startSinpePaymentSchema = z.object({
  planCode: z.enum(SUBSCRIPTION_PLAN_CODES),
  levelId: z.string().trim().min(1, "Selecciona el nivel que deseas comprar."),
  checkoutRequestId: z.uuid(),
  ...payerFields,
}).superRefine(validateIdentification);

export type StartSinpePaymentInput = z.output<
  typeof startSinpePaymentSchema
>;

export const startLearnerRenewalPaymentSchema = z
  .object({
    planCode: z.enum(SUBSCRIPTION_PLAN_CODES),
    subscriptionId: z
      .string()
      .trim()
      .min(1, "Selecciona la suscripcion que deseas renovar."),
    checkoutRequestId: z.uuid(),
    ...payerFields,
  })
  .superRefine(validateIdentification);
