import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), requireUser: vi.fn(), send: vi.fn(), read: vi.fn(), destination: vi.fn(), candidates: vi.fn(), renewals: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole, requireUser: mocks.requireUser }));
vi.mock("@/server/db/prisma", () => ({ prisma: { user: { count: vi.fn().mockResolvedValue(1) } } }));
vi.mock("@/server/notifications/send", () => ({ sendNotification: mocks.send, NotificationError: class extends Error {} }));
vi.mock("@/server/notifications/queries", () => ({ markNotificationsRead: mocks.read, getNotificationRenewalDestination: mocks.destination, getNotificationCandidates: mocks.candidates, getRenewalCandidates: mocks.renewals }));
import { sendNotificationAction, sendRenewalRemindersAction, resendRenewalReminderAction, previewNotificationRecipientsAction, previewNotificationAudienceAction, markNotificationReadAction, markAllNotificationsReadAction, openNotificationAction, openNotificationRenewalAction } from "@/modules/notifications/actions/notification-actions";

beforeEach(() => { vi.clearAllMocks(); mocks.requireRole.mockResolvedValue({ id: "admin" }); mocks.requireUser.mockResolvedValue({ id: "owner", role: "STUDENT" }); mocks.send.mockResolvedValue({ notificationId: "n" }); });
describe("notification action authorization", () => {
  it.each([sendNotificationAction, sendRenewalRemindersAction, resendRenewalReminderAction])("guards administrative sends before reaching the service", async action => {
    mocks.requireRole.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(action({})).rejects.toThrow("FORBIDDEN");
    expect(mocks.requireRole).toHaveBeenCalledWith("ADMIN"); expect(mocks.send).not.toHaveBeenCalled();
  });
  it("guards both recipient previews", async () => {
    mocks.requireRole.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(previewNotificationRecipientsAction({})).rejects.toThrow("FORBIDDEN");
    await expect(previewNotificationAudienceAction({ mode: "ALL_USERS" })).rejects.toThrow("FORBIDDEN");
    expect(mocks.candidates).not.toHaveBeenCalled();
  });
  it("uses the session actor and forces the operation", async () => {
    await sendNotificationAction({ operation: "resend", actorId: "forged" });
    expect(mocks.send).toHaveBeenCalledWith({ operation: "send", actorId: "forged" }, "admin");
  });
  it("marks only for the session user", async () => {
    await markNotificationReadAction("r"); await markAllNotificationsReadAction();
    expect(mocks.read).toHaveBeenNthCalledWith(1, "owner", "r");
    expect(mocks.read).toHaveBeenNthCalledWith(2, "owner");
  });
  it("marks an inbox item before opening its anchored history entry", async () => {
    const form = new FormData(); form.set("recipientId", "recipient-1"); form.set("userId", "forged");
    await expect(openNotificationAction(form)).rejects.toThrow("REDIRECT:/dashboard/notifications#notification-recipient-1");
    expect(mocks.read).toHaveBeenCalledWith("owner", "recipient-1");
  });
  it("does not mark a notification when opening its renewal action", async () => {
    mocks.destination.mockResolvedValue("/dashboard/subscription/renew/s");
    const form = new FormData(); form.set("recipientId", "r"); form.set("userId", "forged");
    await expect(openNotificationRenewalAction(form)).rejects.toThrow("REDIRECT:/dashboard/subscription/renew/s");
    expect(mocks.destination).toHaveBeenCalledWith("owner", "STUDENT", "r"); expect(mocks.read).not.toHaveBeenCalled();
  });
});
