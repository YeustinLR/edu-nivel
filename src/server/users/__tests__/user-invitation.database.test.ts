import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

vi.mock("server-only", () => ({}));
vi.mock("@/server/mail/send-verification-otp", () => ({
  sendVerificationOTP: vi.fn(),
}));

const RUN_DATABASE_INTEGRATION = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!RUN_DATABASE_INTEGRATION)(
  "administrative user invitations with PostgreSQL",
  () => {
    it(
      "creates an invited collaborator and consumes the token once",
      async () => {
        const { config } = await import("dotenv");
        config({ path: [".env.local", ".env"], quiet: true });

        const [{ auth }, { prisma }, tokenHelpers] = await Promise.all([
          import("@/server/auth/auth"),
          import("@/server/db/prisma"),
          import("@/server/users/user-invitation-token"),
        ]);
        const unique = randomUUID();
        const inviterId = `inviter-${unique}`;
        const email = `invited-${unique}@example.com`;
        const token = tokenHelpers.generateUserInvitationToken();
        let invitationId: string | null = null;

        try {
          await prisma.user.create({
            data: {
              id: inviterId,
              name: "Administrador de prueba",
              email: `admin-${unique}@example.com`,
              emailVerified: true,
              role: Role.ADMIN,
            },
          });

          const invitation = await prisma.userInvitation.create({
            data: {
              email,
              activeEmail: email,
              name: "Colaborador invitado",
              role: Role.COLLABORATOR,
              tokenHash: tokenHelpers.hashUserInvitationToken(token),
              invitedById: inviterId,
              expiresAt: tokenHelpers.getUserInvitationExpiration(),
            },
            select: { id: true },
          });
          invitationId = invitation.id;

          await auth.api.signUpEmail({
            body: {
              name: "Colaborador invitado",
              email,
              password: "Segura9!alfabeto",
              ageDeclared: 30,
              role: "COLLABORATOR",
              invitationToken: token,
            } as NonNullable<Parameters<typeof auth.api.signUpEmail>[0]>["body"],
          });

          const createdUser = await prisma.user.findUniqueOrThrow({
            where: { email },
            include: { accounts: true },
          });
          expect(createdUser).toMatchObject({
            role: Role.COLLABORATOR,
            selectedLevelId: null,
            emailVerified: false,
          });
          expect(createdUser.accounts).toHaveLength(1);

          await expect(
            prisma.userInvitation.findUniqueOrThrow({
              where: { id: invitation.id },
            }),
          ).resolves.toMatchObject({
            activeEmail: null,
            acceptedUserId: createdUser.id,
            acceptedAt: expect.any(Date),
          });

          await expect(
            auth.api.signUpEmail({
              body: {
                name: "Segundo intento",
                email,
                password: "OtraSegura9!alfabeto",
                ageDeclared: 30,
                role: "COLLABORATOR",
                invitationToken: token,
              } as NonNullable<Parameters<typeof auth.api.signUpEmail>[0]>["body"],
            }),
          ).rejects.toMatchObject({
            statusCode: 400,
            body: { code: "INVALID_USER_INVITATION" },
          });
        } finally {
          await prisma.verification.deleteMany({
            where: { identifier: { contains: email } },
          });
          if (invitationId) {
            await prisma.userInvitation.deleteMany({
              where: { id: invitationId },
            });
          }
          await prisma.user.deleteMany({
            where: {
              OR: [{ id: inviterId }, { email }],
            },
          });
        }
      },
      30_000,
    );
  },
);
