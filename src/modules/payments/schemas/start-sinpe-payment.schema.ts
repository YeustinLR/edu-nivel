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

export const startSinpePaymentSchema = z.object({
  planCode: z.enum(SUBSCRIPTION_PLAN_CODES),
  levelId: z.string().trim().min(1, "Selecciona el nivel que deseas comprar."),
  checkoutRequestId: z.uuid(),
  mobileNumber: costaRicanPhoneSchema,
  identificationType: z.coerce.number().int().refine(
    (value) => [0, 1, 2, 3, 4, 5, 9].includes(value),
    "El tipo de identificacion no es valido.",
  ),
  identification: z
    .string()
    .trim()
    .min(5, "Ingresa la identificacion asociada a la cuenta SINPE.")
    .max(30),
});

export type StartSinpePaymentInput = z.output<
  typeof startSinpePaymentSchema
>;

export const startLearnerRenewalPaymentSchema = startSinpePaymentSchema
  .omit({ levelId: true })
  .extend({
    subscriptionId: z.string().trim().min(1, "Selecciona la suscripcion que deseas renovar."),
  });
