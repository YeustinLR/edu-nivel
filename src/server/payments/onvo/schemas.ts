import { z } from "zod";

export const onvoModeSchema = z.enum(["test", "live"]);

export const onvoPaymentIntentStatusSchema = z.enum([
  "requires_payment_method",
  "requires_action",
  "requires_capture",
  "processing",
  "succeeded",
  "failed",
  "refunded",
  "partially_refunded",
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

export const onvoPaymentIntentListSchema = z
  .object({
    data: z.array(onvoPaymentIntentSchema),
    meta: z
      .object({
        total: z.number().nonnegative().optional(),
        pages: z.number().nonnegative().optional(),
        limit: z.number().positive().optional(),
        cursorNext: z.string().min(1).nullable().optional(),
        cursorBefore: z.string().min(1).nullable().optional(),
      })
      .passthrough()
      .optional(),
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

export const onvoRefundSchema = z
  .object({
    id: z.string().min(1),
    paymentIntentId: z.string().min(1),
    amount: z.number().int().positive(),
    currency: z.string().min(3),
    mode: onvoModeSchema,
    status: z.enum(["pending", "succeeded", "failed"]),
    reason: z.string().optional(),
    failureReason: nullableStringSchema,
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type OnvoPaymentIntent = z.infer<typeof onvoPaymentIntentSchema>;
export type OnvoPaymentIntentList = z.infer<
  typeof onvoPaymentIntentListSchema
>;
export type OnvoPaymentMethod = z.infer<typeof onvoPaymentMethodSchema>;
export type OnvoRefund = z.infer<typeof onvoRefundSchema>;
