import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const { invitationUpdateManyMock, transactionMock, userUpdateManyMock } =
  vi.hoisted(() => ({
    invitationUpdateManyMock: vi.fn(),
    transactionMock: vi.fn(),
    userUpdateManyMock: vi.fn(),
  }));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
  },
}));

import { finalizeSignUpInvitation } from "@/server/users/user-invitation-auth";

const tx = {
  userInvitation: { updateMany: invitationUpdateManyMock },
  user: { updateMany: userUpdateManyMock },
};

describe("finalizeSignUpInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    invitationUpdateManyMock.mockResolvedValue({ count: 1 });
    userUpdateManyMock.mockResolvedValue({ count: 1 });
  });

  it("consumes the invitation and enables the account in one transaction", async () => {
    await finalizeSignUpInvitation({
      context: { body: { invitationToken: "token" } },
      user: {
        id: "user-1",
        email: "COLLABORATOR@example.com",
        role: Role.COLLABORATOR,
      },
    });

    expect(invitationUpdateManyMock).toHaveBeenCalledOnce();
    expect(userUpdateManyMock).toHaveBeenCalledWith({
      where: {
        id: "user-1",
        email: "collaborator@example.com",
        role: Role.COLLABORATOR,
        invitationPending: true,
      },
      data: { invitationPending: false },
    });
  });

  it("keeps the account pending when the invitation cannot be consumed", async () => {
    invitationUpdateManyMock.mockResolvedValue({ count: 0 });

    await expect(
      finalizeSignUpInvitation({
        context: { body: { invitationToken: "token" } },
        user: {
          id: "user-1",
          email: "collaborator@example.com",
          role: Role.COLLABORATOR,
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      body: { code: "INVALID_USER_INVITATION" },
    });
    expect(userUpdateManyMock).not.toHaveBeenCalled();
  });
});
