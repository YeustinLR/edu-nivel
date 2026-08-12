import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/config/env", () => ({
  env: {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/edu_app",
    BETTER_AUTH_SECRET: "test-only-better-auth-secret-with-32-characters",
    BETTER_AUTH_URL: "http://localhost:3000",
    RESEND_API_KEY: "re_test_placeholder",
    EMAIL_FROM: "EduNivel Test <test@example.com>",
  },
}));

vi.mock("@/server/mail/send-verification-otp", () => ({
  sendVerificationOTP: vi.fn(),
}));

type Auth = typeof import("@/server/auth/auth").auth;

let auth: Auth;

const validBody = {
  name: "Registro de prueba",
  email: "registro@example.com",
  password: "Segura9!alfabeto",
  ageDeclared: 25,
};

describe("public registration role protection", () => {
  beforeAll(async () => {
    ({ auth } = await import("@/server/auth/auth"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(["ADMIN", "COLLABORATOR", "UNKNOWN"])(
    "rejects the privileged or unknown role %s before creating a user",
    async (role) => {
      await expect(
        auth.api.signUpEmail({
          body: {
            ...validBody,
            role,
          },
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    },
  );

  it("rejects a registration request without a role", async () => {
    await expect(
      auth.api.signUpEmail({
        body: validBody as typeof validBody & { role: "STUDENT" },
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects a collaborator registration with an invalid invitation", async () => {
    const { prisma } = await import("@/server/db/prisma");
    const findInvitation = vi
      .spyOn(prisma.userInvitation, "findUnique")
      .mockResolvedValue(null);

    await expect(
      auth.api.signUpEmail({
        body: {
          ...validBody,
          role: "COLLABORATOR",
          invitationToken: "a".repeat(43),
        } as NonNullable<Parameters<typeof auth.api.signUpEmail>[0]>["body"],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      body: { code: "INVALID_USER_INVITATION" },
    });
    expect(findInvitation).toHaveBeenCalledOnce();
  });

  it("rejects an existing email after normalizing casing and whitespace", async () => {
    const { prisma } = await import("@/server/db/prisma");
    const findUnique = vi
      .spyOn(prisma.user, "findUnique")
      .mockResolvedValue({ id: "existing-user" } as never);

    await expect(
      auth.api.signUpEmail({
        body: {
          ...validBody,
          role: "STUDENT",
          email: "  REGISTRO@EXAMPLE.COM  ",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 422,
      body: {
        code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
      },
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "registro@example.com" },
      select: { id: true },
    });
  });

  it("rejects self-service role changes before session resolution", async () => {
    await expect(
      auth.api.updateUser({
        body: {
          role: "TEACHER",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      body: { code: "ROLE_CHANGE_NOT_ALLOWED" },
    });
  });
});
