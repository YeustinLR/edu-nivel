import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const tx = {
  userInvitation: {
    updateMany: vi.fn(),
    create: vi.fn(),
  },
};
const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  levelFindUnique: vi.fn(),
  invitationUpdateMany: vi.fn(),
  transaction: vi.fn(),
  sendUserInvitation: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    level: { findUnique: mocks.levelFindUnique },
    userInvitation: { updateMany: mocks.invitationUpdateMany },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/server/mail/send-user-invitation", () => ({
  sendUserInvitation: mocks.sendUserInvitation,
}));

import { createUserInvitation } from "@/server/users/create-user-invitation";

const input = {
  name: "Ana Invitada",
  email: "ana@example.com",
  role: Role.STUDENT,
  selectedLevelId: "level-7",
};
const actor = { id: "admin-1", name: "Administrador", role: Role.ADMIN };

describe("createUserInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.levelFindUnique.mockResolvedValue({ isActive: true });
    mocks.transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    tx.userInvitation.updateMany.mockResolvedValue({ count: 0 });
    tx.userInvitation.create.mockResolvedValue({
      id: "invitation-1",
      email: input.email,
      expiresAt: new Date("2026-08-11T00:00:00.000Z"),
    });
    mocks.sendUserInvitation.mockResolvedValue(undefined);
  });

  it("cancels a previous link, stores a hash and sends the raw token once", async () => {
    await createUserInvitation(input, actor);

    expect(tx.userInvitation.updateMany).toHaveBeenCalledWith({
      where: { activeEmail: input.email },
      data: { activeEmail: null, canceledAt: expect.any(Date) },
    });
    const createData = tx.userInvitation.create.mock.calls[0]?.[0].data;
    const sentToken = mocks.sendUserInvitation.mock.calls[0]?.[0].token;
    expect(createData.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createData.tokenHash).not.toBe(sentToken);
    expect(sentToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("rejects an email that already belongs to a user", async () => {
    mocks.userFindUnique.mockResolvedValue({ id: "user-1" });

    await expect(createUserInvitation(input, actor)).rejects.toMatchObject({
      code: "EMAIL_IN_USE",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects inactive levels before creating an invitation", async () => {
    mocks.levelFindUnique.mockResolvedValue({ isActive: false });

    await expect(createUserInvitation(input, actor)).rejects.toMatchObject({
      code: "INVALID_LEVEL",
    });
  });

  it("cancels the new invitation when email delivery fails", async () => {
    mocks.sendUserInvitation.mockRejectedValue(new Error("RESEND_FAILED"));
    mocks.invitationUpdateMany.mockResolvedValue({ count: 1 });

    await expect(createUserInvitation(input, actor)).rejects.toMatchObject({
      code: "SEND_FAILED",
    });
    expect(mocks.invitationUpdateMany).toHaveBeenCalledWith({
      where: { id: "invitation-1", acceptedAt: null },
      data: { activeEmail: null, canceledAt: expect.any(Date) },
    });
  });
});
