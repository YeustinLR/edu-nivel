import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const tx = {
  user: {
    findUnique: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  session: { deleteMany: vi.fn() },
  adminAuditLog: { create: vi.fn() },
};
const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));

import { manageUserSuspension } from "@/server/users/manage-user-suspension";

const actor = { id: "admin-1", role: Role.ADMIN };
const reason = "Revisión administrativa";

describe("manageUserSuspension", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    tx.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: Role.STUDENT,
      suspendedAt: null,
      suspensionExpiresAt: null,
    });
    tx.user.count.mockResolvedValue(1);
    tx.user.update.mockResolvedValue({});
    tx.session.deleteMany.mockResolvedValue({ count: 2 });
    tx.adminAuditLog.create.mockResolvedValue({});
  });

  it("suspends, revokes sessions and audits atomically", async () => {
    await expect(
      manageUserSuspension(
        {
          userId: "user-1",
          operation: "suspend",
          reason,
          expiresAt: null,
        },
        actor,
      ),
    ).resolves.toEqual({ operation: "suspend" });

    expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "USER_SUSPENDED", reason }),
      }),
    );
  });

  it("prevents self-suspension", async () => {
    tx.user.findUnique.mockResolvedValue({
      id: "admin-1",
      role: Role.ADMIN,
      suspendedAt: null,
      suspensionExpiresAt: null,
    });

    await expect(
      manageUserSuspension(
        { userId: "admin-1", operation: "suspend", reason, expiresAt: null },
        actor,
      ),
    ).rejects.toMatchObject({ code: "SELF_SUSPENSION" });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("protects the last active administrator", async () => {
    tx.user.findUnique.mockResolvedValue({
      id: "admin-2",
      role: Role.ADMIN,
      suspendedAt: null,
      suspensionExpiresAt: null,
    });
    tx.user.count.mockResolvedValue(0);

    await expect(
      manageUserSuspension(
        { userId: "admin-2", operation: "suspend", reason, expiresAt: null },
        actor,
      ),
    ).rejects.toMatchObject({ code: "LAST_ADMIN" });
  });

  it("allows suspending another administrator when one remains active", async () => {
    tx.user.findUnique.mockResolvedValue({
      id: "admin-2",
      role: Role.ADMIN,
      suspendedAt: null,
      suspensionExpiresAt: null,
    });

    await expect(
      manageUserSuspension(
        { userId: "admin-2", operation: "suspend", reason, expiresAt: null },
        actor,
      ),
    ).resolves.toEqual({ operation: "suspend" });
    expect(tx.user.count).toHaveBeenCalled();
  });

  it("reactivates an active suspension and audits the reason", async () => {
    tx.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: Role.STUDENT,
      suspendedAt: new Date("2026-08-01T00:00:00.000Z"),
      suspensionExpiresAt: null,
    });

    await expect(
      manageUserSuspension(
        { userId: "user-1", operation: "reactivate", reason, expiresAt: null },
        actor,
      ),
    ).resolves.toEqual({ operation: "reactivate" });
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "USER_REACTIVATED" }),
      }),
    );
  });
});
