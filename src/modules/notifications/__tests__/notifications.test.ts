import { describe, expect, it } from "vitest";
import { eligibleUserWhere, isNotificationUserEligible, NOTIFICATION_PREVIEW_EXCERPT_CHARACTERS, notificationPage, notificationPreviewExcerpt, reminderKey, RENEWAL_WINDOW_MS, renewalWhere, type NotificationUser } from "@/modules/notifications/domain/notifications";
import {
  notificationPanelModeForViewport,
  parseNotificationPreviewPayload,
} from "@/modules/notifications/domain/notification-preview";
import { notificationCommandSchema } from "@/modules/notifications/schemas/notification.schema";

const now = new Date("2026-09-07T12:00:00Z");
const user: NotificationUser = { id: "u", name: "Test", email: "u@example.com", role: "STUDENT", deletedAt: null, emailVerified: true, suspendedAt: null, suspensionExpiresAt: null, adminCreatedAt: null, passwordChangeRequired: false, ageVerifiedAt: null, termsAcceptedAt: null, privacyAcceptedAt: null };
describe("notification eligibility and contracts", () => {
  it.each(["ADMIN", "STUDENT", "TEACHER", "COLLABORATOR"] as const)("allows enabled %s without requiring premium", role => expect(isNotificationUserEligible({ ...user, role }, now)).toBe(true));
  it.each([
    { deletedAt: now }, { emailVerified: false }, { suspendedAt: now },
    { suspendedAt: now, suspensionExpiresAt: new Date(now.getTime() + 1) },
    { adminCreatedAt: now },
    { adminCreatedAt: now, ageVerifiedAt: now, termsAcceptedAt: now, privacyAcceptedAt: now, passwordChangeRequired: true },
  ])("excludes unavailable accounts: %j", patch => expect(isNotificationUserEligible({ ...user, ...patch }, now)).toBe(false));
  it("allows an expired suspension at the boundary and completed admin setup", () => {
    expect(isNotificationUserEligible({ ...user, suspendedAt: now, suspensionExpiresAt: now }, now)).toBe(true);
    expect(isNotificationUserEligible({ ...user, adminCreatedAt: now, ageVerifiedAt: now, termsAcceptedAt: now, privacyAcceptedAt: now }, now)).toBe(true);
    expect(eligibleUserWhere(now)).toMatchObject({ deletedAt: null, emailVerified: true });
  });
  it("uses the same period key regardless of the input timezone", () => expect(reminderKey("s", new Date("2026-09-07T06:00:00-06:00"))).toBe("s:2026-09-07T12:00:00.000Z"));
  it("includes the exact seven-day boundary", () => expect(renewalWhere(now)).toMatchObject({ currentPeriodEnd: { lte: new Date(now.getTime() + RENEWAL_WINDOW_MS) } }));
  it.each([undefined, "-1", "0", "1.2", "Infinity", "99999999999999999999", ["2"]])("normalizes malformed pagination %j", value => expect(notificationPage(value)).toBe(1));
  it("creates compact, Unicode-safe notification previews", () => {
    expect(notificationPreviewExcerpt("  Primera línea\n\n segunda   línea  ")).toBe("Primera línea segunda línea");
    const excerpt = notificationPreviewExcerpt("😀".repeat(NOTIFICATION_PREVIEW_EXCERPT_CHARACTERS + 1));
    expect(Array.from(excerpt)).toHaveLength(NOTIFICATION_PREVIEW_EXCERPT_CHARACTERS + 1);
    expect(excerpt.endsWith("…")).toBe(true);
  });
  it("validates the notification preview boundary before rendering it", () => {
    const item = {
      id: "recipient-1",
      type: "IMPORTANT_NOTICE",
      title: "Aviso",
      excerpt: "Contenido",
      receivedAt: "2026-09-09T12:00:00.000Z",
      readAt: null,
      levelNumber: 3,
    };
    expect(parseNotificationPreviewPayload({ unreadCount: 1, items: [item] }))
      .toEqual({ unreadCount: 1, items: [item] });
    expect(parseNotificationPreviewPayload({ unreadCount: -1, items: [] })).toBeNull();
    expect(parseNotificationPreviewPayload({ unreadCount: 1, items: [{ ...item, type: "UNKNOWN" }] })).toBeNull();
    expect(parseNotificationPreviewPayload({ unreadCount: 1, items: [{ ...item, receivedAt: "invalid" }] })).toBeNull();
  });
  it("maps both responsive notification modes explicitly", () => {
    expect(notificationPanelModeForViewport(false)).toBe("desktop");
    expect(notificationPanelModeForViewport(true)).toBe("mobile");
  });
  it("validates required content and rejects renewal masquerading as a general notice", () => {
    const value = { operation: "send", requestId: "868a86bf-9d80-4229-8270-a5b647d147a1", type: "GENERAL_ALERT", title: "Aviso", body: "Contenido", audience: { mode: "ALL_USERS" } };
    expect(notificationCommandSchema.safeParse(value).success).toBe(true);
    for (const patch of [{ title: " " }, { body: "x".repeat(5001) }, { type: "SUBSCRIPTION_RENEWAL" }, { requestId: "invalid" }, { audience: { mode: "SELECTED_USERS", userIds: [] } }, { audience: { mode: "ROLES", roles: ["UNKNOWN"] } }]) expect(notificationCommandSchema.safeParse({ ...value, ...patch }).success).toBe(false);
  });
});
