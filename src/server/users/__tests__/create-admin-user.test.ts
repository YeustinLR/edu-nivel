import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const tx = {
  user: { findUnique: vi.fn(), create: vi.fn() },
  level: { findUnique: vi.fn() },
  userInvitation: { updateMany: vi.fn() },
  adminAuditLog: { create: vi.fn() },
};
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), hashPassword: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("better-auth/crypto", () => ({ hashPassword: mocks.hashPassword }));
vi.mock("@/server/db/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));

import { createAdminUser } from "@/server/users/create-admin-user";

const input = {
  name: "Ana Directa",
  email: "ana@example.com",
  role: Role.STUDENT,
  selectedLevelId: "level-7",
  password: "Temporal1!Segura",
  confirmPassword: "Temporal1!Segura",
};
const actor = { id: "admin-1", role: Role.ADMIN };

describe("createAdminUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hashPassword.mockResolvedValue("hashed-password");
    mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx));
    tx.user.findUnique.mockResolvedValue(null);
    tx.level.findUnique.mockResolvedValue({ isActive: true });
    tx.user.create.mockResolvedValue({ id: "user-1", email: input.email });
  });

  it("creates a verified pending account, cancels invitations and audits", async () => {
    await expect(createAdminUser(input, actor)).resolves.toEqual({ id: "user-1", email: input.email });

    expect(tx.userInvitation.updateMany).toHaveBeenCalledWith({
      where: { activeEmail: input.email, acceptedAt: null, canceledAt: null },
      data: { activeEmail: null, canceledAt: expect.any(Date) },
    });
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          emailVerified: true,
          adminCreatedAt: expect.any(Date),
          passwordChangeRequired: true,
          accounts: { create: expect.objectContaining({ password: "hashed-password" }) },
        }),
      }),
    );
    expect(tx.adminAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "USER_CREATED_BY_ADMIN" }) }),
    );
  });

  it("rejects an occupied email before creating records", async () => {
    tx.user.findUnique.mockResolvedValue({ id: "existing" });
    await expect(createAdminUser(input, actor)).rejects.toMatchObject({ code: "EMAIL_IN_USE" });
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it("rejects an inactive selected level", async () => {
    tx.level.findUnique.mockResolvedValue({ isActive: false });
    await expect(createAdminUser(input, actor)).rejects.toMatchObject({ code: "INVALID_LEVEL" });
  });
});
