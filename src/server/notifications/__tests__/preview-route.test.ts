import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  user: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({ getCurrentSession: mocks.session }));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.user },
    notificationRecipient: {
      count: mocks.count,
      findMany: mocks.findMany,
    },
  },
}));

import { GET } from "@/app/api/dashboard/notifications/preview/route";
import { NOTIFICATION_PREVIEW_SIZE } from "@/modules/notifications/domain/notifications";

const enabled = {
  id: "owner",
  name: "Owner",
  email: "owner@example.com",
  role: "STUDENT",
  emailVerified: true,
  deletedAt: null,
  suspendedAt: null,
  suspensionExpiresAt: null,
  adminCreatedAt: null,
  passwordChangeRequired: false,
  ageVerifiedAt: null,
  termsAcceptedAt: null,
  privacyAcceptedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ user: { id: "owner" } });
  mocks.user.mockResolvedValue(enabled);
  mocks.count.mockResolvedValue(2);
  mocks.findMany.mockResolvedValue([
    {
      id: "recipient-1",
      readAt: null,
      receivedAt: new Date("2026-09-09T12:30:00.000Z"),
      levelNumberSnapshot: 7,
      notification: {
        type: "IMPORTANT_NOTICE",
        title: "Cambio de horario",
        body: "  El horario cambió.\nRevisa los detalles.  ",
      },
    },
  ]);
});

describe("private notification preview", () => {
  it("returns a small no-store inbox scoped to the authenticated user", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      unreadCount: 2,
      items: [
        {
          id: "recipient-1",
          type: "IMPORTANT_NOTICE",
          title: "Cambio de horario",
          excerpt: "El horario cambió. Revisa los detalles.",
          receivedAt: "2026-09-09T12:30:00.000Z",
          readAt: null,
          levelNumber: 7,
        },
      ],
    });
    expect(mocks.count).toHaveBeenCalledWith({ where: {
      userId: "owner",
      readAt: null,
      receivedAt: { lte: expect.any(Date) },
    } });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "owner", receivedAt: { lte: expect.any(Date) } },
        take: NOTIFICATION_PREVIEW_SIZE,
        orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
      }),
    );
    const countDate = mocks.count.mock.calls[0]?.[0].where.receivedAt.lte;
    const listDate = mocks.findMany.mock.calls[0]?.[0].where.receivedAt.lte;
    expect(countDate).toBe(listDate);
  });

  it("does not query notification data without a session", async () => {
    mocks.session.mockResolvedValue(null);

    expect((await GET()).status).toBe(401);
    expect(mocks.user).not.toHaveBeenCalled();
    expect(mocks.count).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("rejects an unavailable account before reading its inbox", async () => {
    mocks.user.mockResolvedValue({ ...enabled, suspendedAt: new Date() });

    expect((await GET()).status).toBe(403);
    expect(mocks.count).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
