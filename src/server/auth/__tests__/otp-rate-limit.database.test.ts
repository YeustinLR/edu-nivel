import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const RUN_DATABASE_INTEGRATION = process.env.RUN_DATABASE_INTEGRATION === "1";

type PrismaClient = typeof import("@/server/db/prisma").prisma;
type ConsumeOtpRateLimit = typeof import("@/server/auth/otp-rate-limit").consumeOtpRateLimit;

let prisma: PrismaClient;
let consumeOtpRateLimit: ConsumeOtpRateLimit;

describe.skipIf(!RUN_DATABASE_INTEGRATION)("OTP rolling rate limits (PostgreSQL)", () => {
  beforeAll(async () => {
    ({ prisma } = await import("@/server/db/prisma"));
    ({ consumeOtpRateLimit } = await import("@/server/auth/otp-rate-limit"));
  });

  beforeEach(async () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    await prisma.otpRateLimitEvent.deleteMany();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await prisma.otpRateLimitEvent.deleteMany();
  });

  it("applies the email cooldown independently from the IP", async () => {
    await consumeOtpRateLimit({
      path: "/email-otp/send-verification-otp",
      email: " Person@Example.com ",
      ip: "192.0.2.1",
    });

    await expect(consumeOtpRateLimit({
      path: "/email-otp/send-verification-otp",
      email: "person@example.com",
      ip: "192.0.2.2",
    })).rejects.toMatchObject({ retryAfter: 60 });

    expect(await prisma.otpRateLimitEvent.count()).toBe(1);
  });

  it("allows 25 different emails behind one IP", async () => {
    for (let index = 0; index < 25; index += 1) {
      await consumeOtpRateLimit({
        path: "/email-otp/request-password-reset",
        email: `person-${index}@example.com`,
        ip: "198.51.100.10",
      });
    }

    expect(await prisma.otpRateLimitEvent.count()).toBe(25);
  }, 30_000);

  it("keeps email windows independent and enforces 5 sends in 15 minutes", async () => {
    const first = await consumeOtpRateLimit({
      path: "/email-otp/send-verification-otp",
      email: "window@example.com",
      ip: "192.0.2.40",
    });
    await prisma.otpRateLimitEvent.update({
      where: { id: first.eventIds[0] },
      data: { createdAt: new Date(Date.now() - 61_000) },
    });
    const sample = await prisma.otpRateLimitEvent.findUniqueOrThrow({
      where: { id: first.eventIds[0] },
    });
    await prisma.otpRateLimitEvent.createMany({
      data: Array.from({ length: 4 }, (_, index) => ({
        operation: sample.operation,
        category: sample.category,
        emailHash: sample.emailHash,
        ipHash: sample.ipHash,
        createdAt: new Date(Date.now() - 61_100 - index),
      })),
    });

    await expect(consumeOtpRateLimit({
      path: "/email-otp/send-verification-otp",
      email: "window@example.com",
      ip: "192.0.2.41",
    })).rejects.toMatchObject({ name: "OtpRateLimitExceededError" });

    await expect(consumeOtpRateLimit({
      path: "/email-otp/request-password-reset",
      email: "window@example.com",
      ip: "192.0.2.41",
    })).resolves.toBeDefined();
  });

  it("enforces the shared 100-send IP window", async () => {
    const first = await consumeOtpRateLimit({
      path: "/email-otp/request-password-reset",
      email: "shared-0@example.com",
      ip: "198.51.100.100",
    });
    await prisma.otpRateLimitEvent.update({
      where: { id: first.eventIds[0] },
      data: { createdAt: new Date(Date.now() - 61_000) },
    });
    const sample = await prisma.otpRateLimitEvent.findUniqueOrThrow({
      where: { id: first.eventIds[0] },
    });
    await prisma.otpRateLimitEvent.createMany({
      data: Array.from({ length: 99 }, (_, index) => ({
        operation: index % 2 === 0 ? "send-verification" : "request-password-reset",
        category: "otp-send",
        emailHash: null,
        ipHash: sample.ipHash,
        createdAt: new Date(Date.now() - 61_100 - index),
      })),
    });

    await expect(consumeOtpRateLimit({
      path: "/email-otp/send-verification-otp",
      email: "shared-next@example.com",
      ip: "198.51.100.100",
    })).rejects.toMatchObject({ name: "OtpRateLimitExceededError" });
    expect(await prisma.otpRateLimitEvent.count()).toBe(100);
  });

  it("allows exactly 30 concurrent OTP attempts for one IP", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 40 }, (_, index) => consumeOtpRateLimit({
        path: "/email-otp/verify-email",
        email: `attempt-${index}@example.com`,
        ip: "203.0.113.25",
      })),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(30);
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    expect(rejected).toHaveLength(10);
    expect(rejected.every((result) => result.reason?.name === "OtpRateLimitExceededError")).toBe(true);
    expect(await prisma.otpRateLimitEvent.count()).toBe(30);
  }, 120_000);

  it("enforces both registration windows and does not count rejections", async () => {
    for (let index = 0; index < 30; index += 1) {
      await consumeOtpRateLimit({
        path: "/sign-up/email",
        email: `signup-${index}@example.com`,
        ip: "203.0.113.30",
      });
    }

    await expect(consumeOtpRateLimit({
      path: "/sign-up/email",
      email: "blocked@example.com",
      ip: "203.0.113.30",
    })).rejects.toMatchObject({ name: "OtpRateLimitExceededError" });
    expect(await prisma.otpRateLimitEvent.count()).toBe(30);

    await prisma.otpRateLimitEvent.updateMany({
      data: { createdAt: new Date(Date.now() - 61_000) },
    });

    const sample = await prisma.otpRateLimitEvent.findFirstOrThrow();
    await prisma.otpRateLimitEvent.createMany({
      data: Array.from({ length: 70 }, (_, index) => ({
        operation: "sign-up",
        category: "sign-up",
        emailHash: null,
        ipHash: sample.ipHash,
        createdAt: new Date(Date.now() - 61_000 - index),
      })),
    });

    await expect(consumeOtpRateLimit({
      path: "/sign-up/email",
      email: "over-15-minute-window@example.com",
      ip: "203.0.113.30",
    })).rejects.toMatchObject({ name: "OtpRateLimitExceededError" });
    expect(await prisma.otpRateLimitEvent.count()).toBe(100);
  }, 60_000);
});
