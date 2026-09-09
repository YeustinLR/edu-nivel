import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), user: vi.fn(), count: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({ getCurrentSession: mocks.session }));
vi.mock("@/server/db/prisma", () => ({ prisma: { user: { findUnique: mocks.user }, notificationRecipient: { count: mocks.count } } }));
import { GET } from "@/app/api/dashboard/notifications/unread-count/route";

const enabled = { id: "owner", role: "STUDENT", emailVerified: true, deletedAt: null, suspendedAt: null, suspensionExpiresAt: null, adminCreatedAt: null };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ user: { id: "owner" } });
  mocks.user.mockResolvedValue(enabled);
  mocks.count.mockResolvedValue(3);
});

describe("private unread counter", () => {
  it("returns only the authenticated user's count without cacheable responses", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ unreadCount: 3 });
    expect(mocks.user).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "owner" } }));
    expect(mocks.count).toHaveBeenCalledWith({ where: {
      userId: "owner",
      readAt: null,
      receivedAt: { lte: expect.any(Date) },
    } });
  });
  it("does not access recipients without a session", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.count).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { ...enabled, deletedAt: new Date() },
    { ...enabled, suspendedAt: new Date() },
    { ...enabled, emailVerified: false },
    { ...enabled, adminCreatedAt: new Date(), passwordChangeRequired: true },
  ])("rejects unavailable accounts before counting", async user => {
    mocks.user.mockResolvedValue(user);
    expect((await GET()).status).toBe(403);
    expect(mocks.count).not.toHaveBeenCalled();
  });
});
