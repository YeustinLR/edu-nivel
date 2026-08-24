import { z } from "zod";

const localIdSchema = z.string().min(1).max(100);
const providerRefundIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/, "El identificador de ONVO no es válido.");

export const createManualRefundCaseSchema = z.object({
  paymentId: localIdSchema,
});

export const registerManualRefundSchema = z.object({
  refundCaseId: localIdSchema,
  providerRefundId: providerRefundIdSchema,
});

export const reconcileManualRefundSchema = z.object({
  refundCaseId: localIdSchema,
});

export const cancelManualRefundSchema = z.object({
  refundCaseId: localIdSchema,
});
