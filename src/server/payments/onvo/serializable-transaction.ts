import "server-only";

import { Prisma } from "@/generated/prisma/client";

export const MAX_SERIALIZABLE_ATTEMPTS = 3;

const SERIALIZABLE_RETRY_BASE_DELAY_MS = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isRetryableSerializableConflict(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  ) {
    return true;
  }

  return (
    isRecord(error) &&
    error.name === "DriverAdapterError" &&
    isRecord(error.cause) &&
    error.cause.kind === "TransactionWriteConflict"
  );
}

export async function waitBeforeSerializableRetry(
  attempt: number,
): Promise<void> {
  const baseDelay =
    SERIALIZABLE_RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1);
  const jitter = Math.floor(Math.random() * baseDelay);
  await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
}
