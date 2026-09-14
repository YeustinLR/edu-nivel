import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  BillingInterval,
  PaymentStatus,
  PlanCode,
  PrismaClient,
  ProviderMode,
  Role,
  SubscriptionProduct,
} from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));
vi.mock("@/config/env", () => ({ env: { ONVO_ENV: "test" } }));
vi.mock("@/server/auth/guards", () => ({
  requireRole: vi.fn().mockResolvedValue({ id: "admin" }),
}));
vi.mock("@/server/db/prisma", () => ({ prisma: {} }));

import { getAdminPaymentsSummary } from "@/server/payments/admin-payment-queries";

const run = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!run)(
  "admin payment reporting in an isolated PostgreSQL schema",
  { timeout: 60_000 },
  () => {
    const schema = `admin_payment_test_${randomUUID().replaceAll("-", "")}`;
    let db: PrismaClient;
    let driver: Awaited<ReturnType<PrismaPg["connect"]>>;
    let schemaCreated = false;

    beforeAll(async () => {
      const { config } = await import("dotenv");
      config({ path: [".env.local", ".env"], quiet: true });
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) throw new Error("A PostgreSQL test connection is required");

      driver = await new PrismaPg({ connectionString }).connect();
      const connection = await driver.underlyingDriver().connect();
      try {
        if (!/^admin_payment_test_[a-f0-9]{32}$/.test(schema)) {
          throw new Error("Unsafe schema");
        }
        const folders = (await readdir("prisma/migrations", { withFileTypes: true }))
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
          .sort();
        const scripts = await Promise.all(
          folders.map((folder) =>
            readFile(`prisma/migrations/${folder}/migration.sql`, "utf8"),
          ),
        );
        const migrations = scripts
          .join("\n")
          .replace('CREATE SCHEMA IF NOT EXISTS "public";', "");
        await connection.query(
          `BEGIN; CREATE SCHEMA "${schema}"; SET LOCAL search_path TO "${schema}"; ${migrations}\nCOMMIT;`,
        );
        schemaCreated = true;
      } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
      } finally {
        connection.release();
      }
      db = new PrismaClient({
        adapter: new PrismaPg({ connectionString }, { schema }),
      });

      await db.user.createMany({
        data: [
          {
            id: "admin",
            name: "Admin",
            email: "admin@example.com",
            emailVerified: true,
            role: Role.ADMIN,
          },
          {
            id: "student",
            name: "Ana Estudiante",
            email: "ana@example.com",
            emailVerified: true,
            role: Role.STUDENT,
          },
          {
            id: "student-2",
            name: "Ana Segunda",
            email: "ana-segunda@example.com",
            emailVerified: true,
            role: Role.STUDENT,
          },
        ],
      });
      await db.level.create({
        data: { id: "level-7", levelNumber: 7, requiresSubscription: true },
      });

      let sequence = 0;
      const payment = async ({
        status,
        providerMode = ProviderMode.TEST,
        createdAt,
        appliedAt = null,
        receivedAmountMinor = null,
        userId = "student",
      }: {
        status: PaymentStatus;
        providerMode?: ProviderMode;
        createdAt: Date;
        appliedAt?: Date | null;
        receivedAmountMinor?: number | null;
        userId?: string;
      }) => {
        sequence += 1;
        return db.payment.create({
          data: {
            id: `payment-${sequence}`,
            userId,
            levelId: "level-7",
            planCode: PlanCode.STUDENT_MONTHLY,
            product: SubscriptionProduct.STUDENT_PREMIUM,
            billingInterval: BillingInterval.MONTHLY,
            durationMonths: 1,
            roleAtCheckout: Role.STUDENT,
            expectedAmountMinor: 350_000,
            receivedAmountMinor,
            providerMode,
            internalReference: `reference-${sequence}`,
            checkoutRequestId: randomUUID(),
            status,
            providerStatus: status.toLowerCase(),
            confirmedAt: appliedAt,
            appliedAt,
            createdAt,
          },
        });
      };

      await payment({
        status: PaymentStatus.SUCCEEDED,
        createdAt: new Date("2026-09-05T12:00:00.000Z"),
        appliedAt: new Date("2026-09-05T12:01:00.000Z"),
        receivedAmountMinor: 400_000,
      });
      await payment({
        status: PaymentStatus.SUCCEEDED,
        createdAt: new Date("2026-09-10T12:00:00.000Z"),
        appliedAt: new Date("2026-09-10T12:01:00.000Z"),
      });
      await payment({
        status: PaymentStatus.SUCCEEDED,
        createdAt: new Date("2026-08-10T12:00:00.000Z"),
        appliedAt: new Date("2026-08-10T12:01:00.000Z"),
      });
      await payment({
        status: PaymentStatus.SUCCEEDED,
        createdAt: new Date("2026-08-20T12:00:00.000Z"),
        appliedAt: new Date("2026-08-20T12:01:00.000Z"),
      });
      await payment({
        status: PaymentStatus.FAILED,
        createdAt: new Date("2026-09-03T12:00:00.000Z"),
      });
      await payment({
        status: PaymentStatus.CANCELED,
        createdAt: new Date("2026-09-04T12:00:00.000Z"),
      });
      await payment({
        status: PaymentStatus.REQUIRES_REVIEW,
        createdAt: new Date("2026-07-15T12:00:00.000Z"),
      });
      await payment({
        status: PaymentStatus.PROCESSING,
        createdAt: new Date("2026-09-12T12:00:00.000Z"),
        userId: "student-2",
      });
      await payment({
        status: PaymentStatus.SUCCEEDED,
        providerMode: ProviderMode.LIVE,
        createdAt: new Date("2026-09-05T12:00:00.000Z"),
        appliedAt: new Date("2026-09-05T12:01:00.000Z"),
        receivedAmountMinor: 9_999_999,
      });
    });

    afterAll(async () => {
      await db?.$disconnect();
      if (!driver) return;
      if (!/^admin_payment_test_[a-f0-9]{32}$/.test(schema)) {
        throw new Error("Unsafe schema cleanup");
      }
      try {
        if (schemaCreated) {
          await driver.underlyingDriver().query(
            `DROP SCHEMA IF EXISTS "${schema}" CASCADE`,
          );
        }
      } finally {
        await driver.dispose();
      }
    });

    it("reports calendar-month collections and keeps TEST isolated from LIVE", async () => {
      const summary = await getAdminPaymentsSummary(
        {
          query: "ana",
          period: "90d",
          page: 1,
          pageSize: 20,
        },
        new Date("2026-09-13T18:00:00.000Z"),
        db,
      );

      expect(summary.paymentMode).toBe(ProviderMode.TEST);
      expect(summary.metrics).toEqual({
        collectedAmountMinor: {
          current: 750_000,
          previous: 350_000,
          percentage: expect.closeTo(114.2857, 3),
        },
        confirmedPayments: { current: 2, previous: 1, percentage: 100 },
        requiringReview: 1,
        failedOrCanceled: 2,
      });
      expect(summary.monthlyTrend.find((item) => item.monthKey === "2026-08")).toMatchObject({
        amountMinor: 700_000,
        paymentCount: 2,
      });
      expect(summary.monthlyTrend.find((item) => item.monthKey === "2026-09")).toMatchObject({
        amountMinor: 750_000,
        paymentCount: 2,
        current: true,
      });
      expect(summary.planBreakdown[0]).toMatchObject({
        planCode: PlanCode.STUDENT_MONTHLY,
        amountMinor: 750_000,
        paymentCount: 2,
      });
      expect(summary.history.totalItems).toBe(8);
      expect(summary.history.items).toHaveLength(8);
      expect(summary.history.items.every((item) => item.id !== "payment-9")).toBe(true);
    });
  },
);
