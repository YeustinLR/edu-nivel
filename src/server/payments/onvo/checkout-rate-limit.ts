import "server-only";

import { randomUUID } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

const CHECKOUT_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1_000;
const CHECKOUT_RATE_LIMIT_MAX_ATTEMPTS = 5;
const MAX_SERIALIZABLE_RETRIES = 3;

export class CheckoutRateLimitError extends Error {
  constructor() {
    super("Se alcanzó el límite temporal de intentos de pago.");
    this.name = "CheckoutRateLimitError";
  }
}

export async function enforceCheckoutRateLimit(
  userId: string,
  now = Date.now(),
) {
  const key = `onvo-checkout:${userId}`;

  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_RETRIES; attempt += 1) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const current = await tx.rateLimit.findUnique({ where: { key } });
          const withinWindow =
            current &&
            now - Number(current.lastRequest) < CHECKOUT_RATE_LIMIT_WINDOW_MS;

          if (withinWindow && current.count >= CHECKOUT_RATE_LIMIT_MAX_ATTEMPTS) {
            throw new CheckoutRateLimitError();
          }

          await tx.rateLimit.upsert({
            where: { key },
            create: { id: randomUUID(), key, count: 1, lastRequest: BigInt(now) },
            update: {
              count: withinWindow ? { increment: 1 } : 1,
              lastRequest: BigInt(now),
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return;
    } catch (error) {
      if (error instanceof CheckoutRateLimitError) throw error;
      const shouldRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < MAX_SERIALIZABLE_RETRIES;
      if (!shouldRetry) throw error;
    }
  }
}
