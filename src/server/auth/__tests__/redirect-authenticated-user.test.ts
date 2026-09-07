import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestHeaders, getSession, loadAuth, redirect } = vi.hoisted(() => ({
  requestHeaders: vi.fn(),
  getSession: vi.fn(),
  loadAuth: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: requestHeaders }));
vi.mock("next/navigation", () => ({ redirect }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  requestHeaders.mockResolvedValue(new Headers());
  getSession.mockReset().mockResolvedValue(null);
  vi.doMock("@/server/auth/auth", () => {
    loadAuth();
    return { auth: { api: { getSession } } };
  });
});

describe("redirectAuthenticatedUser", () => {
  it.each([
    "",
    "unrelated-session=value",
    "better-auth.session_data=cached-user",
  ])("does not load the auth backend without a session token: %s", async (cookie) => {
    requestHeaders.mockResolvedValue(new Headers({ cookie }));
    const { redirectAuthenticatedUser } = await import("../redirect-authenticated-user");

    expect(loadAuth).not.toHaveBeenCalled();
    await redirectAuthenticatedUser();

    expect(loadAuth).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each(["better-auth.session_token", "__Secure-better-auth.session_token"])(
    "checks the real session for %s and lets rejected/revoked sessions see the form",
    async (cookieName) => {
      const headers = new Headers({
        cookie: `${cookieName}=invalid-or-revoked; better-auth.session_data=stale-cache`,
      });
      requestHeaders.mockResolvedValue(headers);
      const { redirectAuthenticatedUser } = await import("../redirect-authenticated-user");

      expect(loadAuth).not.toHaveBeenCalled();
      await redirectAuthenticatedUser();

      expect(loadAuth).toHaveBeenCalledOnce();
      expect(getSession).toHaveBeenCalledExactlyOnceWith({
        headers,
        query: { disableCookieCache: true },
      });
      expect(redirect).not.toHaveBeenCalled();
    },
  );

  it.each([
    [true, "/dashboard"],
    [false, "/verify-email"],
  ])("preserves the redirect for emailVerified=%s", async (emailVerified, destination) => {
    requestHeaders.mockResolvedValue(new Headers({ cookie: "better-auth.session_token=token" }));
    getSession.mockResolvedValue({ user: { id: "user-1", emailVerified } });
    const { redirectAuthenticatedUser } = await import("../redirect-authenticated-user");

    await expect(redirectAuthenticatedUser()).rejects.toThrow(`REDIRECT:${destination}`);
    expect(redirect).toHaveBeenCalledExactlyOnceWith(destination);
    expect(getSession.mock.calls[0][0].query).toEqual({ disableCookieCache: true });
  });

  it("propagates backend failures instead of treating them as an anonymous session", async () => {
    requestHeaders.mockResolvedValue(new Headers({ cookie: "better-auth.session_token=token" }));
    getSession.mockRejectedValue(new Error("Session backend unavailable"));
    const { redirectAuthenticatedUser } = await import("../redirect-authenticated-user");

    await expect(redirectAuthenticatedUser()).rejects.toThrow("Session backend unavailable");
    expect(redirect).not.toHaveBeenCalled();
  });
});
