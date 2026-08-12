import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/auth/guards", () => ({
  requireRole: mocks.requireRole,
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: {
      count: mocks.count,
      findMany: mocks.findMany,
    },
  },
}));

import { getAdminUsersPage } from "@/server/users/admin-user-list-queries";

describe("getAdminUsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
    mocks.count.mockResolvedValue(1);
    mocks.findMany.mockResolvedValue([
      {
        id: "user-1",
        name: "Ana Docente",
        email: "ana@example.com",
        emailVerified: false,
        role: Role.TEACHER,
        selectedLevel: { levelNumber: 7 },
        createdAt: new Date("2026-08-01T12:00:00.000Z"),
      },
    ]);
  });

  it("requires ADMIN before querying users", async () => {
    mocks.requireRole.mockRejectedValue(new Error("FORBIDDEN"));

    await expect(
      getAdminUsersPage({
        query: "",
        sort: "newest",
        page: 1,
        pageSize: 10,
      }),
    ).rejects.toThrow("FORBIDDEN");

    expect(mocks.requireRole).toHaveBeenCalledWith(Role.ADMIN);
    expect(mocks.count).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("applies normalized filters, ordering and server pagination", async () => {
    const result = await getAdminUsersPage({
      query: "ana",
      role: Role.TEACHER,
      verification: "unverified",
      sort: "name",
      page: 2,
      pageSize: 10,
    });

    const where = {
      deletedAt: null,
      role: Role.TEACHER,
      emailVerified: false,
      OR: [
        { name: { contains: "ana", mode: "insensitive" } },
        { email: { contains: "ana", mode: "insensitive" } },
      ],
    };

    expect(mocks.count).toHaveBeenCalledWith({ where });
    expect(mocks.findMany).toHaveBeenCalledWith({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: 10,
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        role: true,
        createdAt: true,
        suspendedAt: true,
        suspensionExpiresAt: true,
        adminCreatedAt: true,
        passwordChangeRequired: true,
        ageVerifiedAt: true,
        termsAcceptedAt: true,
        privacyAcceptedAt: true,
        selectedLevel: { select: { levelNumber: true } },
      },
    });
    expect(result.items[0]).toMatchObject({
      id: "user-1",
      selectedLevelNumber: 7,
    });
  });
});
