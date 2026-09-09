/**
 * Responsabilidad del archivo:
 * - Definir la configuracion central de Better Auth para toda la aplicacion.
 *
 * Papel en la arquitectura:
 * - Une Better Auth con Prisma/PostgreSQL.
 * - Activa el flujo de email+password.
 * - Controla el ciclo de vida de las sesiones y la integracion con cookies de Next.
 *
 * Cuando participa:
 * - Registro de usuarios.
 * - Inicio y cierre de sesion.
 * - Resolucion de la sesion actual desde Server Components, Route Handlers y proxy.
 *
 * Dependencias:
 * - `src/app/api/auth/[...all]/route.ts` expone por HTTP todas las rutas generadas por Better Auth.
 * - `src/server/auth/guards.ts` usa `auth.api.getSession(...)` para convertir la cookie en identidad.
 */
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { APIError, betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { z } from "zod";

import { env } from "@/config/env";
import { isAllowedDeclaredAge } from "@/modules/auth/lib/age";
import { isUserCurrentlySuspended } from "@/modules/users/domain/user-suspension";
import { AUTH_OTP_EXPIRES_SECONDS, AUTH_OTP_LENGTH } from "@/modules/auth/lib/otp";
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_CONTAINS_EMAIL_MESSAGE,
  PASSWORD_WEAK_MESSAGE,
  isStrongPassword,
  passwordContainsEmail,
} from "@/modules/auth/lib/password";
import {
  accountRegistrationRoleSchema,
  registrationRoleSchema,
} from "@/modules/auth/lib/registration-role";
import { prisma } from "@/server/db/prisma";
import { sendVerificationOTP } from "@/server/mail/send-verification-otp";
import {
  assertSignUpInvitationAllowed,
  finalizeSignUpInvitation,
  getInvitedLevelFromAuthContext,
} from "@/server/users/user-invitation-auth";

// Rutas de Better Auth que reciben una contrasena nueva en el body.
const PASSWORD_SETTING_PATHS = new Set([
  "/sign-up/email",
  "/email-otp/reset-password",
  "/change-password",
]);

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  // Better Auth persiste usuarios, cuentas, sesiones y verificaciones sobre los modelos
  // definidos en Prisma. Aqui delegamos el acceso a PostgreSQL al adaptador oficial.
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      ageDeclared: {
        type: "number",
        required: true,
        returned: false,
        validator: {
          input: z.number().int().refine(isAllowedDeclaredAge),
        },
      },
      role: {
        type: "string",
        required: true,
        // El cliente usa su propio rol para navegar directamente al dashboard canonico.
        // La autorizacion real continua en los guards server-side.
        returned: true,
        validator: { input: accountRegistrationRoleSchema },
      },
      adminCreatedAt: {
        type: "date",
        required: false,
        returned: false,
        input: false,
      },
      passwordChangeRequired: {
        type: "boolean",
        required: false,
        returned: false,
        input: false,
        defaultValue: false,
      },
      deletedAt: {
        type: "date",
        required: false,
        returned: false,
        input: false,
      },
      termsAcceptedAt: {
        type: "date",
        required: false,
        returned: false,
      },
      privacyAcceptedAt: {
        type: "date",
        required: false,
        returned: false,
      },
      ageVerifiedAt: {
        type: "date",
        required: false,
        returned: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    // Tras un restablecimiento de contrasena todas las sesiones previas quedan revocadas:
    // si la cuenta estaba comprometida, el atacante pierde acceso junto con la victima.
    revokeSessionsOnPasswordReset: true,
    // El login por email/password queda bloqueado hasta que Better Auth marque
    // `emailVerified=true` despues de validar el OTP.
    requireEmailVerification: true,
    async onPasswordReset({ user }) {
      await prisma.user.updateMany({
        where: { id: user.id, deletedAt: null },
        data: { passwordChangeRequired: false },
      });
    },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
    window: 60,
    max: 100,
    customRules: {
      // Estas rutas usan ventanas moviles exactas por correo e IP en el handler HTTP.
      // `false` evita sumar el contador agregado incorporado de Better Auth.
      "/sign-up/email": false,
      "/email-otp/send-verification-otp": false,
      "/email-otp/verify-email": false,
      "/email-otp/request-password-reset": false,
      "/email-otp/reset-password": false,
    },
  },
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["x-vercel-forwarded-for", "x-forwarded-for"],
    },
  },
  session: {
    // Duracion de sesion suficientemente larga para una plataforma educativa de uso recurrente.
    expiresIn: 30 * 24 * 60 * 60,
    // Better Auth renueva la sesion de forma incremental en vez de emitir cookies nuevas en cada
    // request. Esto reduce ruido y escrituras innecesarias.
    updateAge: 24 * 60 * 60,
    cookieCache: {
      enabled: true,
      // Permite que la capa temprana de proteccion (proxy) pueda resolver la sesion con menos costo.
      maxAge: 5 * 60,
    },
  },
  hooks: {
    // Refuerzo server-side de las reglas de contrasena. Better Auth solo exige el largo
    // minimo; la complejidad se valida aqui para que un cliente no pueda saltarla
    // llamando directo a la API. Cubre registro, reset por OTP y cambio de contrasena.
    // La regla de contencion del correo aplica en las rutas que traen `email` en el body
    // (registro y reset por OTP); el cambio de contrasena no la puede comprobar aqui.
    before: createAuthMiddleware(async (ctx) => {
      const body = ctx.body as Record<string, unknown> | undefined;

      // `role` es escribible durante el registro para que el usuario pueda elegir entre
      // estudiante y docente. Better Auth tambien expone los additionalFields en update-user,
      // por eso bloqueamos explicitamente cualquier cambio de rol por autoservicio.
      if (
        ctx.path === "/update-user" &&
        body &&
        Object.prototype.hasOwnProperty.call(body, "role")
      ) {
        throw APIError.from("FORBIDDEN", {
          code: "ROLE_CHANGE_NOT_ALLOWED",
          message: "El tipo de cuenta no se puede cambiar desde el perfil.",
        });
      }

      if (!PASSWORD_SETTING_PATHS.has(ctx.path)) {
        return;
      }

      const candidate = body?.password ?? body?.newPassword;

      if (typeof candidate !== "string" || !isStrongPassword(candidate)) {
        throw APIError.from("BAD_REQUEST", {
          code: "WEAK_PASSWORD",
          message: PASSWORD_WEAK_MESSAGE,
        });
      }

      if (
        typeof body?.email === "string" &&
        passwordContainsEmail(candidate, body.email)
      ) {
        throw APIError.from("BAD_REQUEST", {
          code: "PASSWORD_CONTAINS_EMAIL",
          message: PASSWORD_CONTAINS_EMAIL_MESSAGE,
        });
      }

      if (
        ctx.path === "/sign-up/email" &&
        typeof body?.email === "string" &&
        accountRegistrationRoleSchema.safeParse(body.role).success
      ) {
        const normalizedEmail = body.email.trim().toLowerCase();
        const invitationToken =
          typeof body.invitationToken === "string"
            ? body.invitationToken.trim()
            : "";
        await assertSignUpInvitationAllowed({
          token: invitationToken,
          email: normalizedEmail,
          role: String(body.role),
          isPublicRole: registrationRoleSchema.safeParse(body.role).success,
        });

        const existingUser = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        });

        if (existingUser) {
          throw APIError.from("UNPROCESSABLE_ENTITY", {
            code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
            message: "Ya existe una cuenta con ese correo.",
          });
        }
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        async before(user, context) {
          const ageDeclared = Number(user.ageDeclared);

          if (!Number.isInteger(ageDeclared) || !isAllowedDeclaredAge(ageDeclared)) {
            throw APIError.from("FORBIDDEN", {
              code: "AGE_RESTRICTED",
              message: "Debes tener 18 anos o mas para crear una cuenta.",
            });
          }

          const now = new Date();
          const invitedLevelId = await getInvitedLevelFromAuthContext({
            context,
            email: user.email,
            role: String(user.role),
          });

          return {
            data: {
              ...user,
              ageDeclared,
              termsAcceptedAt: now,
              privacyAcceptedAt: now,
              ageVerifiedAt: now,
              ...(invitedLevelId !== undefined
                ? { selectedLevelId: invitedLevelId }
                : {}),
            },
          };
        },
        async after(user, context) {
          await finalizeSignUpInvitation({
            context,
            user: { id: user.id, email: user.email, role: String(user.role) },
          });
        },
      },
    },
    session: {
      create: {
        async before(session, ctx) {
          const user = await ctx?.context.internalAdapter.findUserById(session.userId);
          const ageVerifiedAt = (
            user as { ageVerifiedAt?: Date | string | null } | null
          )?.ageVerifiedAt;

          const suspensionState = user as {
            suspendedAt?: Date | string | null;
            suspensionExpiresAt?: Date | string | null;
            adminCreatedAt?: Date | string | null;
            deletedAt?: Date | string | null;
          } | null;
          const suspendedAt = suspensionState?.suspendedAt
            ? new Date(suspensionState.suspendedAt)
            : null;
          const suspensionExpiresAt = suspensionState?.suspensionExpiresAt
            ? new Date(suspensionState.suspensionExpiresAt)
            : null;

          if (suspensionState?.deletedAt) {
            throw APIError.from("FORBIDDEN", {
              code: "USER_DELETED",
              message: "La cuenta fue eliminada.",
            });
          }

          if (!ageVerifiedAt && !suspensionState?.adminCreatedAt) {
            throw APIError.from("FORBIDDEN", {
              code: "AGE_RESTRICTED",
              message: "Debes tener 18 anos o mas para iniciar sesion.",
            });
          }

          if (
            isUserCurrentlySuspended({ suspendedAt, suspensionExpiresAt })
          ) {
            throw APIError.from("FORBIDDEN", {
              code: "USER_SUSPENDED",
              message: "Tu cuenta está suspendida.",
            });
          }
        },
      },
    },
  },
  plugins: [
    emailOTP({
      sendVerificationOTP,
      otpLength: AUTH_OTP_LENGTH,
      expiresIn: AUTH_OTP_EXPIRES_SECONDS,
      allowedAttempts: 3,
      storeOTP: "hashed",
      resendStrategy: "rotate",
      overrideDefaultEmailVerification: true,
    }),
    // `nextCookies()` debe ir al final para aplicar correctamente los cambios de cookies que
    // produzcan los plugins anteriores.
    nextCookies(),
  ],
});
