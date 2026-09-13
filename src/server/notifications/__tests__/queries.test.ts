import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), requireUser: vi.fn(), count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole, requireUser: mocks.requireUser }));
vi.mock("@/server/db/prisma", () => ({ prisma: {
  notification: { count: mocks.count, findMany: mocks.findMany },
  notificationRecipient: { count: mocks.count, findMany: mocks.findMany, groupBy: mocks.groupBy },
  user: { count: mocks.count, findMany: mocks.findMany },
} }));
import { getAdminNotification, getAdminNotifications, getAdminNotificationSenders, getNotificationCandidates, getRenewalCandidates, getNotificationInbox, normalizeNotificationSearch } from "@/server/notifications/queries";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue({ id: "admin" });
  mocks.requireUser.mockResolvedValue({ id: "owner", role: "STUDENT" });
  mocks.count.mockResolvedValue(41);
  mocks.findMany.mockResolvedValue([]);
  mocks.groupBy.mockResolvedValue([]);
});

describe("notification query boundaries", () => {
  it("normalizes repeated URL parameters and malformed action arguments safely", () => {
    expect(normalizeNotificationSearch(null)).toEqual({});
    expect(normalizeNotificationSearch([])).toEqual({});
    expect(normalizeNotificationSearch({ q: ["x"], senderId: {}, page: " 2 ", type: " GENERAL_ALERT " })).toEqual({ page: "2", type: "GENERAL_ALERT" });
    expect(normalizeNotificationSearch({ q: "a".repeat(1000) }).q).toHaveLength(150);
  });
  it.each([
    () => getAdminNotification("n"),
    () => getAdminNotifications({}),
    () => getAdminNotificationSenders(),
    () => getNotificationCandidates({}),
    () => getRenewalCandidates({}),
  ])("guards every administrative read before querying", async query => {
    mocks.requireRole.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(query()).rejects.toThrow("FORBIDDEN");
    expect(mocks.requireRole).toHaveBeenCalledWith("ADMIN");
    expect(mocks.count).not.toHaveBeenCalled();
  });
  it("searches the administrative history by readable fields and calculates read totals", async () => {
    const sentAt = new Date("2026-09-09T12:00:00.000Z");
    mocks.count.mockResolvedValueOnce(1);
    mocks.findMany.mockResolvedValueOnce([{ id: "notice", type: "GENERAL_ALERT", title: "Bienvenida", body: "Hola", sentAt, sentBy: { id: "admin", name: "Ana", email: "ana@example.com" }, _count: { recipients: 4 } }]);
    mocks.groupBy.mockResolvedValueOnce([{ notificationId: "notice", _count: { _all: 3 } }]);

    const result = await getAdminNotifications({ q: " ana ", senderId: "admin", type: "GENERAL_ALERT" });

    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        sentById: "admin",
        type: "GENERAL_ALERT",
        OR: expect.arrayContaining([{ title: { contains: "ana", mode: "insensitive" } }]),
      }),
    }));
    expect(result.items[0].readCount).toBe(3);
  });
  it("clamps pagination and never accepts an inbox owner from input", async () => {
    const result = await getNotificationInbox({ page: "9999", userId: "victim", unread: "1", type: "IMPORTANT_NOTICE" });
    expect(result.page).toBe(3);
    expect(result.totalPages).toBe(3);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: "owner",
        receivedAt: { lte: expect.any(Date) },
        readAt: null,
        notification: { type: "IMPORTANT_NOTICE" },
      },
      skip: 40, take: 20,
    }));
    expect(mocks.count).toHaveBeenCalledWith({ where: {
      userId: "owner",
      readAt: null,
      receivedAt: { lte: expect.any(Date) },
    } });
  });
});
