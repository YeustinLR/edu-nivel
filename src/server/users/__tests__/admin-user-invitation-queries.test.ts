import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/db/prisma", () => ({
  prisma: { userInvitation: { findMany: mocks.findMany } },
}));

import { getAdminPendingUserInvitations } from "@/server/users/admin-user-invitation-queries";

describe("getAdminPendingUserInvitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
  });

  it("requires ADMIN before reading invitations", async () => {
    mocks.requireRole.mockRejectedValue(new Error("FORBIDDEN"));

    await expect(getAdminPendingUserInvitations()).rejects.toThrow("FORBIDDEN");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("selects and maps only active invitation summaries", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: "invitation-1",
        name: "Ana",
        email: "ana@example.com",
        role: Role.STUDENT,
        expiresAt: new Date("2026-08-11T00:00:00.000Z"),
        createdAt: new Date("2026-08-08T00:00:00.000Z"),
        selectedLevel: { levelNumber: 7 },
      },
    ]);

    await expect(getAdminPendingUserInvitations()).resolves.toMatchObject([
      { id: "invitation-1", levelNumber: 7 },
    ]);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          activeEmail: { not: null },
          acceptedAt: null,
          canceledAt: null,
        },
        take: 12,
      }),
    );
  });
});
