import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = {
  user: { findFirst: vi.fn(), updateMany: vi.fn() },
  account: { update: vi.fn() },
  session: { deleteMany: vi.fn() },
};
const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("better-auth/crypto", () => ({
  hashPassword: mocks.hashPassword,
  verifyPassword: mocks.verifyPassword,
}));
vi.mock("@/server/db/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));

import { completeAdminCreatedAccount } from "@/server/users/complete-admin-created-account";

const input = {
  userId: "user-1",
  sessionId: "session-current",
  ageDeclared: 30,
  passwordChangeRequired: true,
  currentPassword: "Temporal1!Segura",
  password: "Personal2!Segura",
};

describe("completeAdminCreatedAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
    mocks.hashPassword.mockResolvedValue("new-hash");
    mocks.verifyPassword.mockResolvedValue(true);
    tx.user.findFirst.mockResolvedValue({
      passwordChangeRequired: true,
      accounts: [{ id: "account-1", password: "old-hash" }],
    });
    tx.user.updateMany.mockResolvedValue({ count: 1 });
  });

  it("changes the password, records legal acceptance and revokes other sessions", async () => {
    await completeAdminCreatedAccount(input);

    expect(tx.account.update).toHaveBeenCalledWith({ where: { id: "account-1" }, data: { password: "new-hash" } });
    expect(tx.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ageDeclared: 30, passwordChangeRequired: false }),
      }),
    );
    expect(tx.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", id: { not: "session-current" } },
    });
  });

  it("rejects an incorrect temporary password", async () => {
    mocks.verifyPassword.mockResolvedValue(false);
    await expect(completeAdminCreatedAccount(input)).rejects.toMatchObject({ code: "INVALID_PASSWORD" });
    expect(tx.user.updateMany).not.toHaveBeenCalled();
  });
});
