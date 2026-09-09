import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { RENEWAL_WINDOW_MS } from "@/modules/notifications/domain/notifications";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({ requireUser: vi.fn(), requireRole: vi.fn() }));
// The service receives an isolated client explicitly; never use the application's database client.
vi.mock("@/server/db/prisma", () => ({ prisma: {} }));
import { sendNotification } from "@/server/notifications/send";
import { getNotificationRenewalDestination, markNotificationsRead } from "@/server/notifications/queries";

const run = process.env.RUN_DATABASE_INTEGRATION === "1";
describe.skipIf(!run)("internal notifications in an isolated PostgreSQL schema", { timeout: 30_000 }, () => {
  const schema = `notification_test_${randomUUID().replaceAll("-", "")}`;
  let db: PrismaClient;
  let driver: Awaited<ReturnType<PrismaPg["connect"]>>;
  let schemaCreated = false;
  const enabledUser = (id: string, role: "ADMIN" | "STUDENT" | "TEACHER" | "COLLABORATOR" = "STUDENT") => ({ id, name: id, email: `${id}@example.com`, role, emailVerified: true });
  const notice = (audience: object = { mode: "SELECTED_USERS", userIds: ["student"] }) => ({ operation: "send", requestId: randomUUID(), type: "GENERAL_ALERT", title: "Aviso", body: "Contenido", audience });
  const renewal = (id: string, periodEnd: Date) => ({ operation: "renew", requestId: randomUUID(), subscriptions: [{ id, periodEnd: periodEnd.toISOString() }] });

  beforeAll(async () => {
    const { config } = await import("dotenv"); config({ path: [".env.local", ".env"], quiet: true });
    const connectionString = process.env.NOTIFICATION_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!connectionString) throw new Error("A PostgreSQL test connection is required");
    driver = await new PrismaPg({ connectionString }).connect();
    const connection = await driver.underlyingDriver().connect();
    try {
      // Only generated identifiers are interpolated. All migrations run inside our private schema.
      if (!/^notification_test_[a-f0-9]{32}$/.test(schema)) throw new Error("Unsafe schema");
      const folders = (await readdir("prisma/migrations", { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
      const scripts = await Promise.all(folders.map(folder => readFile(`prisma/migrations/${folder}/migration.sql`, "utf8")));
      const migrations = scripts.join("\n").replace('CREATE SCHEMA IF NOT EXISTS "public";', "");
      await connection.query(`BEGIN; CREATE SCHEMA "${schema}"; SET LOCAL search_path TO "${schema}"; ${migrations}\nCOMMIT;`);
      schemaCreated = true;
    } catch (error) { await connection.query("ROLLBACK"); throw error; }
    finally { connection.release(); }
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString }, { schema }) });
  }, 60_000);
  afterAll(async () => {
    await db?.$disconnect();
    if (driver) {
      if (!/^notification_test_[a-f0-9]{32}$/.test(schema)) throw new Error("Unsafe schema cleanup");
      try {
        if (schemaCreated) await driver.underlyingDriver().query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      } finally { await driver.dispose(); }
    }
  });
  beforeEach(async () => {
    await db.$executeRawUnsafe(`TRUNCATE TABLE "${schema}"."user", "${schema}"."level" CASCADE`);
    await db.user.createMany({ data: [enabledUser("admin", "ADMIN"), enabledUser("student"), enabledUser("teacher", "TEACHER"), enabledUser("collaborator", "COLLABORATOR")] });
  });

  async function subscription(end = new Date(Date.now() - 1000)) {
    const level = await db.level.create({ data: { levelNumber: 1, requiresSubscription: true } });
    const sub = await db.subscription.create({ data: { userId: "student", levelId: level.id, product: "STUDENT_PREMIUM", currentPeriodStart: new Date(Date.now() - 30 * 86400_000), currentPeriodEnd: end } });
    await db.payment.create({ data: { userId: "student", levelId: level.id, subscriptionId: sub.id, planCode: "STUDENT_MONTHLY", product: "STUDENT_PREMIUM", billingInterval: "MONTHLY", durationMonths: 1, roleAtCheckout: "STUDENT", expectedAmountMinor: 1000, providerMode: "TEST", internalReference: randomUUID(), checkoutRequestId: randomUUID(), status: "SUCCEEDED", appliedAt: new Date(), confirmedAt: new Date() } });
    return sub;
  }

  it("keeps notification audience roles non-null at the database boundary", async () => {
    const columns = await db.$queryRaw<Array<{ is_nullable: string }>>`
      SELECT "is_nullable"
      FROM "information_schema"."columns"
      WHERE "table_schema" = ${schema}
        AND "table_name" = 'notification'
        AND "column_name" = 'audienceRoles'
    `;
    expect(columns).toEqual([{ is_nullable: "NO" }]);
  });

  it("delivers and audits exactly once under concurrent retries", async () => {
    const command = notice();
    const results = await Promise.all([sendNotification(command, "admin", db), sendNotification(command, "admin", db)]);
    expect(results[0].notificationId).toBe(results[1].notificationId);
    expect(await db.notificationRecipient.count()).toBe(1); expect(await db.adminAuditLog.count()).toBe(1);
    await expect(sendNotification({ ...command, body: "Changed" }, "admin", db)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("deduplicates selected IDs and canonicalizes their order", async () => {
    const command = notice({ mode: "SELECTED_USERS", userIds: ["teacher", "student", "student"] });
    const first = await sendNotification(command, "admin", db);
    const retry = await sendNotification({ ...command, audience: { mode: "SELECTED_USERS", userIds: ["student", "teacher"] } }, "admin", db);
    expect(first.notificationId).toBe(retry.notificationId); expect(await db.notificationRecipient.count()).toBe(2);
  });
  it("all means currently enabled accounts, including the administrator, not future accounts", async () => {
    await db.user.update({ where: { id: "teacher" }, data: { suspendedAt: new Date() } });
    await db.user.update({ where: { id: "collaborator" }, data: { adminCreatedAt: new Date(), passwordChangeRequired: true } });
    const command = notice({ mode: "ALL_USERS" });
    await sendNotification(command, "admin", db);
    await db.user.create({ data: enabledUser("future") }); await sendNotification(command, "admin", db);
    expect((await db.notificationRecipient.findMany()).map(row => row.userId).sort()).toEqual(["admin", "student"]);
  });
  it("filters by role and rejects explicit unavailable recipients atomically", async () => {
    await sendNotification(notice({ mode: "ROLES", roles: ["TEACHER", "COLLABORATOR"] }), "admin", db);
    expect(await db.notificationRecipient.count()).toBe(2);
    await db.user.update({ where: { id: "student" }, data: { deletedAt: new Date() } });
    await expect(sendNotification(notice({ mode: "SELECTED_USERS", userIds: ["student", "admin"] }), "admin", db)).rejects.toMatchObject({ code: "INELIGIBLE_RECIPIENT" });
    expect(await db.notification.count()).toBe(1);
  });
  it.each(["student", "teacher", "collaborator"])("rejects %s at the service boundary", async actor => {
    await expect(sendNotification(notice(), actor, db)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.notification.count()).toBe(0);
  });
  it("rejects a suspended administrator even on an idempotent replay", async () => {
    const command = notice(); await sendNotification(command, "admin", db);
    await db.user.update({ where: { id: "admin" }, data: { suspendedAt: new Date() } });
    await expect(sendNotification(command, "admin", db)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("preserves the first read timestamp and isolates owners", async () => {
    await sendNotification(notice({ mode: "ALL_USERS" }), "admin", db);
    const item = await db.notificationRecipient.findFirstOrThrow({ where: { userId: "student" } });
    await expect(markNotificationsRead("teacher", item.id, db)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await markNotificationsRead("student", item.id, db);
    const first = await db.notificationRecipient.findUniqueOrThrow({ where: { id: item.id } });
    await markNotificationsRead("student", item.id, db); await markNotificationsRead("student", undefined, db);
    expect((await db.notificationRecipient.findUniqueOrThrow({ where: { id: item.id } })).readAt).toEqual(first.readAt);
    expect(await db.notificationRecipient.count({ where: { userId: "teacher", readAt: null } })).toBe(1);
  });
  it("links reminders to their period and preserves old read status across re-sends", async () => {
    const sub = await subscription();
    await sendNotification(renewal(sub.id, sub.currentPeriodEnd), "admin", db);
    const item = await db.notificationRecipient.findFirstOrThrow();
    await markNotificationsRead("student", item.id, db);
    await sendNotification({ operation: "resend", requestId: randomUUID(), recipientId: item.id }, "admin", db);
    expect(await db.notificationRecipient.count({ where: { readAt: null } })).toBe(1);
    expect((await db.notificationRecipient.findUniqueOrThrow({ where: { id: item.id } })).readAt).not.toBeNull();
    expect(await db.adminAuditLog.count({ where: { action: "NOTIFICATION_RENEWAL_RESENT" } })).toBe(1);
    expect(await getNotificationRenewalDestination("student", "STUDENT", item.id, db)).toContain(`/renew/${sub.id}`);
    expect(await getNotificationRenewalDestination("teacher", "TEACHER", item.id, db)).toContain("obsolete");
  });
  it("allows only one initial reminder and one successor under concurrent requests", async () => {
    const sub = await subscription();
    const first = await Promise.allSettled([sendNotification(renewal(sub.id, sub.currentPeriodEnd), "admin", db), sendNotification(renewal(sub.id, sub.currentPeriodEnd), "admin", db)]);
    expect(first.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const item = await db.notificationRecipient.findFirstOrThrow();
    const next = await Promise.allSettled([sendNotification({ operation: "resend", requestId: randomUUID(), recipientId: item.id }, "admin", db), sendNotification({ operation: "resend", requestId: randomUUID(), recipientId: item.id }, "admin", db)]);
    expect(next.filter(result => result.status === "fulfilled")).toHaveLength(1); expect(await db.notification.count()).toBe(2);
  }, 30_000);
  it("rejects renewed periods and removes their renewal destination", async () => {
    const sub = await subscription(); await sendNotification(renewal(sub.id, sub.currentPeriodEnd), "admin", db);
    const item = await db.notificationRecipient.findFirstOrThrow();
    await db.subscription.update({ where: { id: sub.id }, data: { currentPeriodEnd: new Date(Date.now() + 30 * 86400_000) } });
    await expect(sendNotification({ operation: "resend", requestId: randomUUID(), recipientId: item.id }, "admin", db)).rejects.toMatchObject({ code: "PERIOD_CHANGED" });
    expect(await getNotificationRenewalDestination("student", "STUDENT", item.id, db)).toContain("obsolete");
  });
  it("directs an existing reminder to a pending payment without creating a checkout", async () => {
    const sub = await subscription();
    await sendNotification(renewal(sub.id, sub.currentPeriodEnd), "admin", db);
    const item = await db.notificationRecipient.findFirstOrThrow();
    const payment = await db.payment.findFirstOrThrow();
    // Real pending checkouts need not have a subscriptionId until payment application.
    await db.payment.update({ where: { id: payment.id }, data: { subscriptionId: null, status: "REQUIRES_REVIEW" } });
    expect(await getNotificationRenewalDestination("student", "STUDENT", item.id, db)).toBe(`/dashboard/subscription/payments/${payment.id}`);
    expect(await db.payment.count()).toBe(1);
  });
  it("allows a new initial reminder only for the next eligible period", async () => {
    const sub = await subscription();
    await sendNotification(renewal(sub.id, sub.currentPeriodEnd), "admin", db);
    const end = new Date(Date.now() + RENEWAL_WINDOW_MS - 60_000);
    await db.subscription.update({ where: { id: sub.id }, data: { currentPeriodEnd: end } });
    await sendNotification(renewal(sub.id, end), "admin", db);
    expect(await db.notificationRecipient.count({ where: { initialReminderKey: { not: null } } })).toBe(2);
  });
  it("keeps historical deliveries for deleted users while blocking new deliveries and reads", async () => {
    await sendNotification(notice(), "admin", db);
    const item = await db.notificationRecipient.findFirstOrThrow();
    await db.user.update({ where: { id: "student" }, data: { deletedAt: new Date(), email: "deleted@example.com", name: "Cuenta eliminada" } });
    await expect(markNotificationsRead("student", item.id, db)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(sendNotification(notice(), "admin", db)).rejects.toMatchObject({ code: "INELIGIBLE_RECIPIENT" });
    expect(await db.notificationRecipient.count()).toBe(1);
    expect(await db.adminAuditLog.count()).toBe(1);
  });
  it("marks only existing unread items without including a later delivery", async () => {
    const first = await sendNotification(notice(), "admin", db);
    await sendNotification(notice(), "admin", db);
    await db.notificationRecipient.updateMany({ where: { notificationId: { not: first.notificationId } }, data: { receivedAt: new Date(Date.now() + 60_000) } });
    await markNotificationsRead("student", undefined, db);
    expect(await db.notificationRecipient.count({ where: { readAt: null } })).toBe(1);
    expect(await db.notificationRecipient.count({ where: { readAt: { not: null } } })).toBe(1);
  });
  it.each(["future", "refunded", "level", "role", "pending"])("excludes non-eligible renewal: %s", async reason => {
    const sub = await subscription();
    if (reason === "future") {
      sub.currentPeriodEnd = new Date(Date.now() + RENEWAL_WINDOW_MS + 60_000);
      await db.subscription.update({ where: { id: sub.id }, data: { currentPeriodEnd: sub.currentPeriodEnd } });
    }
    if (reason === "refunded") await db.subscription.update({ where: { id: sub.id }, data: { status: "REFUNDED" } });
    if (reason === "level") await db.level.update({ where: { id: sub.levelId }, data: { isActive: false } });
    if (reason === "role") await db.user.update({ where: { id: "student" }, data: { role: "TEACHER" } });
    if (reason === "pending") await db.payment.updateMany({ data: { status: "PROCESSING" } });
    await expect(sendNotification(renewal(sub.id, sub.currentPeriodEnd), "admin", db)).rejects.toMatchObject({ code: "PERIOD_CHANGED" });
  });
  it("rolls back deliveries when audit insertion fails", async () => {
    await db.$executeRawUnsafe(`ALTER TABLE "${schema}"."admin_audit_log" ADD CONSTRAINT test_reject_notification CHECK (action <> 'NOTIFICATION_SENT')`);
    try {
      await expect(sendNotification(notice(), "admin", db)).rejects.toMatchObject({ code: "SEND_FAILED" });
      expect(await db.notification.count()).toBe(0); expect(await db.notificationRecipient.count()).toBe(0);
    } finally { await db.$executeRawUnsafe(`ALTER TABLE "${schema}"."admin_audit_log" DROP CONSTRAINT test_reject_notification`); }
  });
  it("delivers 10,000 recipients atomically within the agreed transaction budget", async () => {
    await db.user.createMany({ data: Array.from({ length: 9996 }, (_, index) => enabledUser(`load-${index}`)) });
    const start = Date.now(); await sendNotification(notice({ mode: "ALL_USERS" }), "admin", db);
    const elapsed = Date.now() - start;
    expect(await db.notificationRecipient.count()).toBe(10_000); expect(await db.adminAuditLog.count()).toBe(10_000);
    expect(elapsed).toBeLessThan(30_000);
    console.info(`Notification delivery benchmark: 10,000 recipients in ${elapsed} ms`);
    await db.user.create({ data: enabledUser("over-limit") });
    await expect(sendNotification(notice({ mode: "ALL_USERS" }), "admin", db)).rejects.toMatchObject({ code: "AUDIENCE_LIMIT" });
    expect(await db.notification.count()).toBe(1);
  }, 60_000);
});
