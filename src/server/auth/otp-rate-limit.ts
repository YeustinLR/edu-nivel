import "server-only";

import { createHmac, hkdfSync, randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";

import { env } from "@/config/env";
import { prisma } from "@/server/db/prisma";

export const OTP_RATE_LIMIT_PATHS = {
  "/sign-up/email": { operation: "sign-up", category: "sign-up" },
  "/email-otp/send-verification-otp": {
    operation: "send-verification",
    category: "otp-send",
  },
  "/email-otp/request-password-reset": {
    operation: "request-password-reset",
    category: "otp-send",
  },
  "/email-otp/verify-email": {
    operation: "verify-email",
    category: "otp-attempt",
  },
  "/email-otp/reset-password": {
    operation: "reset-password",
    category: "otp-attempt",
  },
} as const;

export type OtpRateLimitPath = keyof typeof OTP_RATE_LIMIT_PATHS;

type WindowPolicy = { seconds: number; max: number };
type StoredEvent = { createdAt: Date };

const EMAIL_POLICIES: Record<string, WindowPolicy[]> = {
  "send-verification": [{ seconds: 60, max: 1 }, { seconds: 900, max: 5 }],
  "request-password-reset": [{ seconds: 60, max: 1 }, { seconds: 900, max: 5 }],
  "verify-email": [{ seconds: 900, max: 5 }],
  "reset-password": [{ seconds: 900, max: 5 }],
};

const IP_POLICIES: Record<string, WindowPolicy[]> = {
  "otp-send": [{ seconds: 60, max: 30 }, { seconds: 900, max: 100 }],
  "otp-attempt": [{ seconds: 60, max: 30 }],
  "sign-up": [{ seconds: 60, max: 30 }, { seconds: 900, max: 100 }],
};

const RATE_LIMIT_KEY = Buffer.from(
  hkdfSync(
    "sha256",
    Buffer.from(env.BETTER_AUTH_SECRET, "utf8"),
    Buffer.alloc(0),
    Buffer.from("edunivel:otp-rate-limit:v1", "utf8"),
    32,
  ),
);

export const RATE_LIMIT_MESSAGE =
  "Demasiadas solicitudes. Espera un momento y vuelve a intentarlo.";

export class OtpRateLimitExceededError extends Error {
  constructor(readonly retryAfter: number) {
    super(RATE_LIMIT_MESSAGE);
    this.name = "OtpRateLimitExceededError";
  }
}

function identityHash(kind: "email" | "ip", value: string) {
  return createHmac("sha256", RATE_LIMIT_KEY)
    .update(`${kind}\0${value}`)
    .digest("hex");
}

function advisoryKey(value: string): bigint {
  const bytes = Buffer.from(value.slice(0, 16), "hex");
  return bytes.readBigInt64BE(0);
}

function retryAfterFor(
  events: StoredEvent[],
  policies: WindowPolicy[],
  nowMs: number,
) {
  let retryAfter = 0;

  for (const policy of policies) {
    const threshold = nowMs - policy.seconds * 1000;
    const active = events.filter((event) => event.createdAt.getTime() > threshold);
    if (active.length < policy.max) continue;

    const firstBlockingEvent = active[active.length - policy.max];
    const remaining = Math.ceil(
      (firstBlockingEvent.createdAt.getTime() + policy.seconds * 1000 - nowMs) / 1000,
    );
    retryAfter = Math.max(retryAfter, remaining, 1);
  }

  return retryAfter;
}

export type OtpRateLimitReceipt = { eventIds: string[] };

export async function consumeOtpRateLimit(input: {
  path: OtpRateLimitPath;
  email?: string | null;
  ip?: string | null;
  reserveInitialVerification?: boolean;
}): Promise<OtpRateLimitReceipt> {
  const requestRule = OTP_RATE_LIMIT_PATHS[input.path];
  const normalizedEmail = input.email?.trim().toLowerCase() || null;
  const ipHash = identityHash("ip", input.ip || "unknown-client-ip");
  const emailHash = normalizedEmail ? identityHash("email", normalizedEmail) : null;
  const eventsToInsert = [requestRule];

  if (input.reserveInitialVerification) {
    eventsToInsert.push(OTP_RATE_LIMIT_PATHS["/email-otp/send-verification-otp"]);
  }

  const receipt = await prisma.$transaction(async (tx) => {
    const identities = new Set<string>();
    for (const event of eventsToInsert) {
      identities.add(`ip:${event.category}:${ipHash}`);
      if (emailHash && EMAIL_POLICIES[event.operation]) {
        identities.add(`email:${event.operation}:${emailHash}`);
      }
    }

    const lockKeys = [...identities]
      .map((identity) => advisoryKey(identityHash("ip", identity)))
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    await tx.$queryRaw(Prisma.sql`
      SELECT count(*)::int AS "acquired"
      FROM (
        SELECT pg_advisory_xact_lock("lockKey")
        FROM unnest(ARRAY[${Prisma.join(lockKeys)}]::bigint[]) AS "lockKey"
        ORDER BY "lockKey"
      ) AS "locks"
    `);

    const now = new Date();
    const cutoff = new Date(now.getTime() - 900_000);

    for (const event of eventsToInsert) {
      const emailPolicies = emailHash ? EMAIL_POLICIES[event.operation] ?? [] : [];
      const ipPolicies = IP_POLICIES[event.category] ?? [];
      const [emailEvents, ipEvents] = await Promise.all([
        emailPolicies.length
          ? tx.otpRateLimitEvent.findMany({
              where: { operation: event.operation, emailHash, createdAt: { gt: cutoff } },
              select: { createdAt: true },
              orderBy: { createdAt: "asc" },
            })
          : Promise.resolve([]),
        tx.otpRateLimitEvent.findMany({
          where: { category: event.category, ipHash, createdAt: { gt: cutoff } },
          select: { createdAt: true },
          orderBy: { createdAt: "asc" },
        }),
      ]);
      const retryAfter = Math.max(
        retryAfterFor(emailEvents, emailPolicies, now.getTime()),
        retryAfterFor(ipEvents, ipPolicies, now.getTime()),
      );
      if (retryAfter > 0) throw new OtpRateLimitExceededError(retryAfter);
    }

    const eventIds = eventsToInsert.map(() => randomUUID());
    await tx.otpRateLimitEvent.createMany({
      data: eventsToInsert.map((event, index) => ({
        id: eventIds[index],
        operation: event.operation,
        category: event.category,
        emailHash,
        ipHash,
        createdAt: now,
      })),
    });

    return { eventIds };
  }, { maxWait: 60_000, timeout: 120_000 });

  // La limpieza es deliberadamente auxiliar y acotada. Nunca afecta la decision ya
  // confirmada, y las consultas filtran por tiempo aunque esta operacion falle.
  if (Math.random() < 0.01) {
    const cutoff = new Date(Date.now() - 900_000);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "otp_rate_limit_event"
      WHERE "id" IN (
        SELECT "id" FROM "otp_rate_limit_event"
        WHERE "createdAt" < ${cutoff}
        ORDER BY "createdAt" ASC
        LIMIT 500
      )
    `).catch((error) => {
      console.warn("OTP rate-limit cleanup failed", error);
    });
  }

  return receipt;
}

export async function removeOtpRateLimitEvents(eventIds: string[]) {
  if (eventIds.length === 0) return;
  await prisma.otpRateLimitEvent.deleteMany({ where: { id: { in: eventIds } } });
}
