import { z } from "zod";

export const onvoModeSchema = z.enum(["test", "live"]);

export const onvoPaymentIntentStatusSchema = z.enum([
  "requires_payment_method",
  "requires_action",
  "processing",
  "succeeded",
  "canceled",
]);

const nullableStringSchema = z.string().nullable().optional();

export const onvoChargeSchema = z
  .object({
    id: z.string().min(1),
    amount: z.number().int().nonnegative(),
    currency: z.string().min(3).optional(),
    status: z.string().min(1),
    refNumber: nullableStringSchema,
    failureCode: nullableStringSchema,
    failureMessage: nullableStringSchema,
    isApproved: z.boolean().optional(),
    isCaptured: z.boolean().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const onvoEmbeddedPaymentMethodSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1).optional(),
  })
  .passthrough();

export const onvoPaymentIntentSchema = z
  .object({
    id: z.string().min(1),
    mode: onvoModeSchema,
    amount: z.number().int().nonnegative(),
    receivedAmount: z.number().int().nonnegative().nullable().optional(),
    currency: z.string().min(3),
    status: onvoPaymentIntentStatusSchema,
    description: nullableStringSchema,
    paymentMethodId: nullableStringSchema,
    paymentMethod: onvoEmbeddedPaymentMethodSchema.nullable().optional(),
    customerId: nullableStringSchema,
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    charges: z.array(onvoChargeSchema).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const onvoPaymentMethodSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("mobile_number"),
    mode: onvoModeSchema.optional(),
    customerId: nullableStringSchema,
  })
  .passthrough();

export const onvoApiErrorSchema = z
  .object({
    code: z.string().optional(),
    message: z.union([z.string(), z.array(z.string())]).optional(),
    statusCode: z.number().int().optional(),
    type: z.string().optional(),
  })
  .passthrough();

export type OnvoPaymentIntent = z.infer<typeof onvoPaymentIntentSchema>;
export type OnvoPaymentMethod = z.infer<typeof onvoPaymentMethodSchema>;
