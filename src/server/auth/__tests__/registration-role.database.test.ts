import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/client";
import { PUBLIC_REGISTRATION_ROLES } from "@/modules/auth/lib/registration-role";

vi.mock("server-only", () => ({}));

vi.mock("@/server/mail/send-verification-otp", () => ({
  sendVerificationOTP: vi.fn(),
}));

const RUN_DATABASE_INTEGRATION =
  process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!RUN_DATABASE_INTEGRATION)(
  "public registration roles with PostgreSQL",
  () => {
    it(
      "persists student and teacher roles and rejects privileged roles",
      async () => {
        const { config } = await import("dotenv");
        config({ path: [".env.local", ".env"], quiet: true });

        const [{ auth }, { prisma }] = await Promise.all([
          import("@/server/auth/auth"),
          import("@/server/db/prisma"),
        ]);
        const unique = randomUUID();
        const emails = PUBLIC_REGISTRATION_ROLES.map(
          (role) => `db-role-${role.toLowerCase()}-${unique}@example.com`,
        );
        const privilegedEmail = `db-role-admin-${unique}@example.com`;

        try {
          for (const [index, role] of PUBLIC_REGISTRATION_ROLES.entries()) {
            const email = emails[index]!;

            await auth.api.signUpEmail({
              body: {
                role,
                name: `Registro ${role}`,
                email,
                password: "Segura9!alfabeto",
                ageDeclared: 25,
              },
            });

            await expect(
              prisma.user.findUniqueOrThrow({ where: { email } }),
            ).resolves.toMatchObject({
              email,
              role: role === "STUDENT" ? Role.STUDENT : Role.TEACHER,
              emailVerified: false,
            });
          }

          const duplicateEmail = emails[0]!;
          const userBeforeDuplicate = await prisma.user.findUniqueOrThrow({
            where: { email: duplicateEmail },
            include: {
              accounts: true,
            },
          });
          const verificationsBeforeDuplicate =
            await prisma.verification.findMany({
              where: { identifier: { contains: duplicateEmail } },
              orderBy: { createdAt: "asc" },
            });

          await expect(
            auth.api.signUpEmail({
              body: {
                role: "TEACHER",
                name: "Intento duplicado",
                email: duplicateEmail.toUpperCase(),
                password: "OtraSegura9!alfabeto",
                ageDeclared: 30,
              },
            }),
          ).rejects.toMatchObject({
            statusCode: 422,
            body: {
              code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
            },
          });

          await expect(
            prisma.user.findUniqueOrThrow({
              where: { email: duplicateEmail },
              include: {
                accounts: true,
              },
            }),
          ).resolves.toEqual(userBeforeDuplicate);
          await expect(
            prisma.verification.findMany({
              where: { identifier: { contains: duplicateEmail } },
              orderBy: { createdAt: "asc" },
            }),
          ).resolves.toEqual(verificationsBeforeDuplicate);

          await expect(
            auth.api.signUpEmail({
              body: {
                role: "ADMIN",
                name: "Registro ADMIN",
                email: privilegedEmail,
                password: "Segura9!alfabeto",
                ageDeclared: 25,
              },
            }),
          ).rejects.toMatchObject({ statusCode: 400 });

          await expect(
            prisma.user.findUnique({ where: { email: privilegedEmail } }),
          ).resolves.toBeNull();

          const verifiedStudentEmail = emails[0]!;
          await prisma.user.update({
            where: { email: verifiedStudentEmail },
            data: { emailVerified: true },
          });

          const signInResult = await auth.api.signInEmail({
            returnHeaders: true,
            body: {
              email: verifiedStudentEmail,
              password: "Segura9!alfabeto",
            },
          });

          expect(signInResult.response.user).toMatchObject({
            email: verifiedStudentEmail,
            role: Role.STUDENT,
          });

          // Las paginas publicas de auth deben consultar la sesion real incluso si el
          // navegador conserva una cookie de cache emitida antes de la revocacion.
          const cookie = signInResult.headers.getSetCookie()
            .map((value) => value.split(";")[0])
            .join("; ");
          expect(cookie).toContain("better-auth.session_token=");
          expect(cookie).toContain("better-auth.session_data=");
          const sessionRequest = {
            headers: new Headers({ cookie }),
            query: { disableCookieCache: true },
          };

          await expect(auth.api.getSession(sessionRequest)).resolves.toMatchObject({
            user: { email: verifiedStudentEmail },
          });
          await expect(auth.api.getSession({
            ...sessionRequest,
            headers: new Headers({
              cookie: cookie.replace(
                /((?:__Secure-)?better-auth\.session_token=)[^;]+/,
                "$1invalid-signature",
              ),
            }),
          })).resolves.toBeNull();

          await prisma.session.deleteMany({
            where: { token: signInResult.response.token },
          });
          await expect(auth.api.getSession(sessionRequest)).resolves.toBeNull();
        } finally {
          await prisma.verification.deleteMany({
            where: {
              OR: [
                ...emails.map((email) => ({ identifier: { contains: email } })),
                { identifier: { contains: privilegedEmail } },
              ],
            },
          });
          await prisma.user.deleteMany({
            where: {
              email: { in: [...emails, privilegedEmail] },
            },
          });
        }
      },
      30_000,
    );
  },
);
