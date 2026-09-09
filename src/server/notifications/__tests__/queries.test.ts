import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), requireUser: vi.fn(), count: vi.fn(), findMany: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole, requireUser: mocks.requireUser }));
vi.mock("@/server/db/prisma", () => ({ prisma: {
  notificationRecipient: { count: mocks.count, findMany: mocks.findMany },
  user: { count: mocks.count, findMany: mocks.findMany },
} }));
import { getAdminNotification, getAdminNotifications, getNotificationCandidates, getRenewalCandidates, getNotificationInbox, normalizeNotificationSearch } from "@/server/notifications/queries";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue({ id: "admin" });
  mocks.requireUser.mockResolvedValue({ id: "owner", role: "STUDENT" });
  mocks.count.mockResolvedValue(41);
  mocks.findMany.mockResolvedValue([]);
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
    () => getNotificationCandidates({}),
    () => getRenewalCandidates({}),
  ])("guards every administrative read before querying", async query => {
    mocks.requireRole.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(query()).rejects.toThrow("FORBIDDEN");
    expect(mocks.requireRole).toHaveBeenCalledWith("ADMIN");
    expect(mocks.count).not.toHaveBeenCalled();
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
