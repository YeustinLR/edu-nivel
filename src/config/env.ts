import "server-only";

import { z } from "zod";

const BETTER_AUTH_SECRET_PLACEHOLDER =
  "cambia-esto-por-una-clave-segura-de-32-caracteres";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL es requerida").url(),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32, "BETTER_AUTH_SECRET debe tener al menos 32 caracteres"),
    BETTER_AUTH_URL: z.string().min(1, "BETTER_AUTH_URL es requerida").url(),
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1, "EMAIL_FROM es requerido").optional(),
    CONTACT_WHATSAPP_NUMBER: z
      .string()
      .regex(
        /^\d{11,15}$/,
        "CONTACT_WHATSAPP_NUMBER debe incluir codigo de pais y solo digitos",
      )
      .default("50670196686"),
    ONVO_ENV: z.enum(["test", "live"]).optional(),
    ONVO_LIVE_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    ONVO_SECRET_KEY: z.string().min(1).optional(),
    ONVO_WEBHOOK_SECRET: z.string().min(1).optional(),
    ONVO_SINPE_DESTINATION_NUMBER: z.string().min(8).optional(),
    CRON_SECRET: z.string().min(16).optional(),
    VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
    R2_UPLOADS_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    R2_ACCOUNT_ID: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_BUCKET_NAME: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (
      env.NODE_ENV === "production" &&
      env.BETTER_AUTH_SECRET === BETTER_AUTH_SECRET_PLACEHOLDER
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_SECRET"],
        message: "BETTER_AUTH_SECRET no puede usar el placeholder en produccion",
      });
    }

    if (env.NODE_ENV === "production" && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY es requerido en produccion",
      });
    }

    if (env.NODE_ENV === "production" && !env.EMAIL_FROM) {
      ctx.addIssue({
        code: "custom",
        path: ["EMAIL_FROM"],
        message: "EMAIL_FROM es requerido en produccion",
      });
    }

    if (env.ONVO_ENV && !env.ONVO_SECRET_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["ONVO_SECRET_KEY"],
        message: "ONVO_SECRET_KEY es requerida cuando ONVO_ENV esta configurada",
      });
    }

    if (!env.ONVO_ENV && env.ONVO_SECRET_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["ONVO_ENV"],
        message: "ONVO_ENV es requerida cuando ONVO_SECRET_KEY esta configurada",
      });
    }

    if (env.ONVO_ENV) {
      const requiredOnvoOperationsVariables = [
        "ONVO_WEBHOOK_SECRET",
        "ONVO_SINPE_DESTINATION_NUMBER",
        "CRON_SECRET",
      ] as const;

      for (const variable of requiredOnvoOperationsVariables) {
        if (!env[variable]) {
          ctx.addIssue({
            code: "custom",
            path: [variable],
            message: `${variable} es requerida cuando ONVO_ENV esta configurada`,
          });
        }
      }
    }

    if (
      env.ONVO_ENV === "live" &&
      (!env.ONVO_LIVE_ENABLED || env.VERCEL_ENV !== "production")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["ONVO_LIVE_ENABLED"],
        message:
          "ONVO live requiere ONVO_LIVE_ENABLED=true y VERCEL_ENV=production",
      });
    }

    const expectedOnvoKeyPrefix =
      env.ONVO_ENV === "test"
        ? "onvo_test_secret_key_"
        : env.ONVO_ENV === "live"
          ? "onvo_live_secret_key_"
          : null;

    if (
      expectedOnvoKeyPrefix &&
      env.ONVO_SECRET_KEY &&
      !env.ONVO_SECRET_KEY.startsWith(expectedOnvoKeyPrefix)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["ONVO_SECRET_KEY"],
        message: `ONVO_SECRET_KEY debe iniciar con ${expectedOnvoKeyPrefix}`,
      });
    }

    if (
      env.ONVO_WEBHOOK_SECRET &&
      !env.ONVO_WEBHOOK_SECRET.startsWith("webhook_secret_")
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["ONVO_WEBHOOK_SECRET"],
        message: "ONVO_WEBHOOK_SECRET debe iniciar con webhook_secret_",
      });
    }

    if (env.R2_UPLOADS_ENABLED) {
      const requiredR2Variables = [
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET_NAME",
      ] as const;

      for (const variable of requiredR2Variables) {
        if (!env[variable]) {
          ctx.addIssue({
            code: "custom",
            path: [variable],
            message: `${variable} es requerida cuando R2_UPLOADS_ENABLED=true`,
          });
        }
      }

      if (!env.CRON_SECRET) {
        ctx.addIssue({
          code: "custom",
          path: ["CRON_SECRET"],
          message:
            "CRON_SECRET es requerido para limpiar cargas R2 abandonadas",
        });
      }
    }
  });

const parsedEnv = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  CONTACT_WHATSAPP_NUMBER: process.env.CONTACT_WHATSAPP_NUMBER,
  ONVO_ENV: process.env.ONVO_ENV,
  ONVO_LIVE_ENABLED: process.env.ONVO_LIVE_ENABLED,
  ONVO_SECRET_KEY: process.env.ONVO_SECRET_KEY,
  ONVO_WEBHOOK_SECRET: process.env.ONVO_WEBHOOK_SECRET,
  ONVO_SINPE_DESTINATION_NUMBER: process.env.ONVO_SINPE_DESTINATION_NUMBER,
  CRON_SECRET: process.env.CRON_SECRET,
  VERCEL_ENV: process.env.VERCEL_ENV,
  R2_UPLOADS_ENABLED: process.env.R2_UPLOADS_ENABLED,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
});

if (!parsedEnv.success) {
  console.error(
    "Variables de entorno invalidas:",
    parsedEnv.error.flatten().fieldErrors,
  );

  throw new Error("Configuracion de entorno invalida");
}

export const env = parsedEnv.data;
