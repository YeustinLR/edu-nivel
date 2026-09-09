/** Development-only HTTP acceptance. No email, browser dependency or existing-user writes. */
import assert, { AssertionError } from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { config } from "dotenv";
import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: [".env.local", ".env"], quiet: true });
const baseURL = "http://127.0.0.1:3100";
const runId = randomUUID();
const roles = ["ADMIN", "STUDENT", "TEACHER", "COLLABORATOR"] as const;
type TestRole = (typeof roles)[number];
const ids = Object.fromEntries(roles.map(role => [role, `notification-smoke-${runId}-${role}`])) as Record<TestRole, string>;
const cookies = new Map<TestRole, string>();
const createdIds: string[] = [];
let step = "preflight";

async function main() {
  assert.equal(process.env.RUN_NOTIFICATION_HTTP_SMOKE, "1", "Enable RUN_NOTIFICATION_HTTP_SMOKE explicitly.");
  assert.notEqual(process.env.VERCEL_ENV, "production", "Do not run against production.");
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required.");
  const anonymous = await fetch(`${baseURL}/api/dashboard/notifications/unread-count`);
  assert.equal(anonymous.status, 401, "Start the local production build on port 3100 first.");

  const manifest = JSON.parse(await readFile(".next/server/server-reference-manifest.json", "utf8")) as {
    node: Record<string, { filename?: string; exportedName?: string }>;
  };
  const actions = new Map(Object.entries(manifest.node)
    .filter(([, item]) => item.filename === "src/modules/notifications/actions/notification-actions.ts")
    .map(([id, item]) => [item.exportedName, id]));
  assert.ok(actions.has("sendNotificationAction"), "Rebuild with notifications before running this smoke test.");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  async function get(path: string, role: TestRole) {
    return fetch(`${baseURL}${path}`, { headers: { Cookie: cookies.get(role)! }, redirect: "manual" });
  }
  async function action(name: string, args: unknown[], role: TestRole) {
    const actionId = actions.get(name);
    assert.ok(actionId, `Missing server action: ${name}`);
    const response = await fetch(`${baseURL}/dashboard/notifications`, {
      method: "POST",
      headers: { Cookie: cookies.get(role)!, Origin: baseURL, "Next-Action": actionId, "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(args),
      redirect: "manual",
    });
    return { status: response.status, text: await response.text() };
  }
  async function count(role: TestRole) {
    const response = await get("/api/dashboard/notifications/unread-count", role);
    assert.equal(response.status, 200, `Counter must accept ${role}.`);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    return (await response.json() as { unreadCount: number }).unreadCount;
  }
  async function signIn(email: string, password: string): Promise<Response> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch(`${baseURL}/api/auth/sign-in/email`, {
        method: "POST", headers: { "Content-Type": "application/json", Origin: baseURL },
        body: JSON.stringify({ email, password }),
      });
      if (response.status !== 429 || attempt === 3) return response;
      // Respect the real login rate limit; never disable it or clear its database records.
      const retryAfter = Number(response.headers.get("retry-after") ?? 15);
      assert.ok(Number.isFinite(retryAfter) && retryAfter >= 0 && retryAfter <= 59, "Login rate limit requires a longer manual wait.");
      console.info("WAIT respecting Better Auth login rate limit");
      await delay((retryAfter + 1) * 1000);
    }
    throw new Error("Unreachable login retry");
  }
  function passed(message: string) { console.info(`PASS ${message}`); }

  try {
    step = "temporary fixtures and real email/password login";
    const password = `Smoke-${randomUUID()}-Aa9!`;
    const passwordHash = await hashPassword(password);
    for (const role of roles) {
      const id = ids[role];
      const email = `${id}@notifications.invalid`.toLowerCase();
      const now = new Date();
      await db.user.create({ data: {
        id, email, name: `Prueba temporal ${role}`, role, emailVerified: true,
        ageDeclared: 25, ageVerifiedAt: now, termsAcceptedAt: now, privacyAcceptedAt: now,
        accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: passwordHash } },
      } });
      createdIds.push(id);
      const login = await signIn(email, password);
      assert.equal(login.status, 200, `Real sign-in failed for ${role}.`);
      const cookie = login.headers.getSetCookie().map(value => value.split(";", 1)[0]).join("; ");
      assert.ok(cookie.includes("session_token"), "Better Auth must issue a session cookie.");
      cookies.set(role, cookie);
      assert.equal(await count(role), 0);
    }
    passed("four roles sign in through Better Auth; private counters start empty");

    step = "administrative route rendering";
    for (const path of ["/dashboard/admin/notifications", "/dashboard/admin/notifications/new", "/dashboard/admin/notifications/renewals"]) {
      const response = await get(path, "ADMIN");
      assert.equal(response.status, 200, `ADMIN page failed: ${path}`);
      assert.ok((await response.text()).includes("notificaciones") || path.endsWith("/renewals"));
    }
    passed("administrative pages render with a real session");

    step = "sending and idempotent retry through Server Actions";
    const requestId = randomUUID();
    const title = `Prueba HTTP ${runId}`;
    const input = { requestId, type: "GENERAL_ALERT", title, body: "Aviso interno temporal de aceptación.", audience: { mode: "SELECTED_USERS", userIds: createdIds } };
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await action("sendNotificationAction", [input], "ADMIN");
      assert.equal(response.status, 200);
      assert.ok(response.text.includes('"status":"success"'), "Send must return success through HTTP.");
    }
    const notification = await db.notification.findUniqueOrThrow({ where: { requestId } });
    assert.equal(await db.notificationRecipient.count({ where: { notificationId: notification.id } }), 4);
    assert.equal(await db.adminAuditLog.count({ where: { actorId: ids.ADMIN } }), 4);
    passed("HTTP send + identical retry produce four deliveries and four audit entries, not eight");

    step = "personal inboxes, ownership and read state";
    const studentDelivery = await db.notificationRecipient.findFirstOrThrow({ where: { notificationId: notification.id, userId: ids.STUDENT } });
    for (const role of roles) {
      assert.equal(await count(role), 1);
      const response = await get("/dashboard/notifications", role);
      assert.equal(response.status, 200);
      assert.ok((await response.text()).includes(title), `${role} must see its own notice.`);
    }
    const forbiddenRead = await action("markNotificationReadAction", [studentDelivery.id], "TEACHER");
    assert.ok(forbiddenRead.text.includes('"status":"error"'));
    assert.equal(await count("STUDENT"), 1);
    const read = await action("markNotificationReadAction", [studentDelivery.id], "STUDENT");
    assert.ok(read.text.includes('"status":"success"'));
    const firstRead = (await db.notificationRecipient.findUniqueOrThrow({ where: { id: studentDelivery.id } })).readAt;
    await action("markNotificationReadAction", [studentDelivery.id], "STUDENT");
    assert.deepEqual((await db.notificationRecipient.findUniqueOrThrow({ where: { id: studentDelivery.id } })).readAt, firstRead);
    assert.equal(await count("STUDENT"), 0);
    assert.equal(await count("TEACHER"), 1);
    const readAll = await action("markAllNotificationsReadAction", [], "TEACHER");
    assert.ok(readAll.text.includes('"status":"success"'));
    assert.equal(await count("TEACHER"), 0);
    assert.equal(await count("COLLABORATOR"), 1);
    passed("all inboxes render; individual/all reads update only the owner and preserve first read time");

    step = "non-admin authorization and suspension";
    for (const role of ["STUDENT", "TEACHER", "COLLABORATOR"] as const) {
      const denied = await action("sendNotificationAction", [{ ...input, requestId: randomUUID() }], role);
      assert.ok(!denied.text.includes('"status":"success"'), `${role} must not send.`);
    }
    assert.equal(await db.notification.count({ where: { sentById: { in: createdIds } } }), 1);
    await db.user.update({ where: { id: ids.COLLABORATOR }, data: { suspendedAt: new Date() } });
    assert.equal((await get("/api/dashboard/notifications/unread-count", "COLLABORATOR")).status, 403);
    passed("non-admin sends rejected; a suspended account loses counter access despite its existing cookie");
  } finally {
    // Only UUID-scoped fixtures created by this run; never truncate or alter existing accounts.
    try {
      if (createdIds.length) {
        await db.$transaction(async tx => {
          const own = { sentById: { in: createdIds } };
          await tx.notification.updateMany({ where: own, data: { resendOfRecipientId: null } });
          await tx.notificationRecipient.deleteMany({ where: { notification: own } });
          await tx.notification.deleteMany({ where: own });
          await tx.adminAuditLog.deleteMany({ where: { actorId: { in: createdIds }, targetUserId: { in: createdIds } } });
          await tx.user.deleteMany({ where: { id: { in: createdIds } } });
        });
        console.info("CLEANUP temporary accounts, sessions, notices and audits removed; existing accounts untouched");
      }
    } finally { await db.$disconnect(); }
  }
}

main().catch(error => {
  // Never print credentials, cookies, environment variables or raw response bodies.
  console.error(`FAIL ${step}: ${error instanceof AssertionError ? error.message : error instanceof Error ? error.name : "Unknown error"}`);
  process.exitCode = 1;
});
