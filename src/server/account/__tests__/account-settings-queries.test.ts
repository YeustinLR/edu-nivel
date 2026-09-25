import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const { getCurrentSessionMock, listSessionsMock, requireUserMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  listSessionsMock: vi.fn(),
  requireUserMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("@/server/auth/auth", () => ({
  auth: { api: { listSessions: listSessionsMock } },
}));
vi.mock("@/server/auth/guards", () => ({
  getCurrentSession: getCurrentSessionMock,
  requireUser: requireUserMock,
}));

import { getAccountSettingsData } from "@/server/account/account-settings-queries";

describe("getAccountSettingsData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({
      name: "Ana Estudiante",
      email: "ana@example.com",
      emailVerified: true,
      role: Role.STUDENT,
      selectedLevel: { levelNumber: 8 },
    });
    getCurrentSessionMock.mockResolvedValue({ session: { token: "current-token" } });
    listSessionsMock.mockResolvedValue([
      {
        id: "session-1",
        token: "current-token",
        createdAt: new Date("2026-09-20T10:00:00.000Z"),
        updatedAt: new Date("2026-09-24T10:00:00.000Z"),
        expiresAt: new Date("2026-10-20T10:00:00.000Z"),
        ipAddress: "127.0.0.1",
        userAgent: "Firefox/140.0",
      },
    ]);
  });

  it("autoriza primero y obtiene únicamente las sesiones de Better Auth", async () => {
    const result = await getAccountSettingsData();

    expect(requireUserMock).toHaveBeenCalledOnce();
    expect(listSessionsMock).toHaveBeenCalledWith({ headers: expect.any(Headers) });
    expect(result.currentSessionToken).toBe("current-token");
    expect(result.sessionAccess.status).toBe("ready");
    expect(result.sessionAccess.sessions[0]).toMatchObject({
      id: "session-1",
      createdAt: "2026-09-20T10:00:00.000Z",
      ipAddress: "127.0.0.1",
    });
  });

  it("mantiene disponible la configuración cuando la sesión requiere reautenticación", async () => {
    listSessionsMock.mockRejectedValueOnce({
      body: { code: "SESSION_NOT_FRESH", message: "Session is not fresh" },
    });

    await expect(getAccountSettingsData()).resolves.toMatchObject({
      currentSessionToken: "current-token",
      sessionAccess: { status: "reauth-required", sessions: [] },
    });
  });

  it("propaga errores de sesión que no son de frescura", async () => {
    listSessionsMock.mockRejectedValueOnce(new Error("DATABASE_UNAVAILABLE"));

    await expect(getAccountSettingsData()).rejects.toThrow("DATABASE_UNAVAILABLE");
  });

  it("no consulta sesiones cuando el guard rechaza al usuario", async () => {
    requireUserMock.mockRejectedValue(new Error("UNAUTHENTICATED"));

    await expect(getAccountSettingsData()).rejects.toThrow("UNAUTHENTICATED");
    expect(listSessionsMock).not.toHaveBeenCalled();
    expect(getCurrentSessionMock).not.toHaveBeenCalled();
  });
});
