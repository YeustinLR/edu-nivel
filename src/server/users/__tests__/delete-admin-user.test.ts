import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const tx = {
  user: { findUnique: vi.fn(), update: vi.fn() },
  adminAuditLog: { create: vi.fn() },
  session: { deleteMany: vi.fn() },
  account: { deleteMany: vi.fn() },
  resourceProgress: { deleteMany: vi.fn() },
  savedResource: { deleteMany: vi.fn() },
  verification: { deleteMany: vi.fn() },
  payment: { updateMany: vi.fn() },
  userInvitation: { updateMany: vi.fn() },
};
const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));

import { deleteAdminUser } from "@/server/users/delete-admin-user";

const actor = { id: "admin-1", role: Role.ADMIN };
const input = { userId: "user-1", confirmationEmail: "ana@example.com", reason: "Solicitud administrativa" };

describe("deleteAdminUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
    tx.user.findUnique.mockResolvedValue({ id: "user-1", email: "ana@example.com", deletedAt: null });
  });

  it("anonymizes identity and credentials while retaining the user row", async () => {
    await deleteAdminUser(input, actor);

    expect(tx.account.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(tx.resourceProgress.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(tx.savedResource.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: {
        payerPhoneLast4: null,
        payerIdentificationLast4: null,
        payerIdentificationType: null,
      },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({
        name: "Usuario eliminado",
        email: "user-1@deleted.invalid",
        deletedAt: expect.any(Date),
      }),
    });
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "USER_DELETED" }) }),
    );
    expect((tx.user as { delete?: unknown }).delete).toBeUndefined();
  });

  it("protects the acting administrator", async () => {
    tx.user.findUnique.mockResolvedValue({ id: "admin-1", email: "admin@example.com", deletedAt: null });
    await expect(
      deleteAdminUser({ ...input, userId: "admin-1", confirmationEmail: "admin@example.com" }, actor),
    ).rejects.toMatchObject({ code: "SELF_DELETION" });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("requires an exact normalized email confirmation", async () => {
    await expect(
      deleteAdminUser({ ...input, confirmationEmail: "otro@example.com" }, actor),
    ).rejects.toMatchObject({ code: "EMAIL_MISMATCH" });
  });
});
