/**
 * Responsabilidad del archivo:
 * - Publicar las rutas HTTP de Better Auth dentro del App Router de Next.js.
 *
 * Papel en la arquitectura:
 * - Este archivo convierte la configuracion `auth` en endpoints concretos como:
 *   `/api/auth/sign-in/email`,
 *   `/api/auth/sign-up/email`, 
 *   `/api/auth/sign-out`
 * y `/api/auth/get-session`.
 * - El frontend no implementa manualmente esas rutas; Better Auth las genera a partir
 *   de la configuracion central y Prisma se usa por debajo para persistir usuarios/sesiones.
 *
 * Cuando participa:
 * - Cada vez que un Client Component invoca `authClient`.
 * - Cuando un consumidor HTTP usa explicitamente alguno de los endpoints de Better Auth.
 */
import { toNextJsHandler } from "better-auth/next-js";
import { getIp } from "better-auth/api";
import type { BetterAuthOptions } from "better-auth";

import { auth } from "@/server/auth/auth";
import {
  OTP_RATE_LIMIT_PATHS,
  OtpRateLimitExceededError,
  RATE_LIMIT_MESSAGE,
  consumeOtpRateLimit,
  removeOtpRateLimitEvents,
  type OtpRateLimitPath,
} from "@/server/auth/otp-rate-limit";
import { otpRateLimitRequestContext } from "@/server/auth/otp-rate-limit-request-context";

const handlers = toNextJsHandler(auth);

const IP_OPTIONS = {
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["x-vercel-forwarded-for", "x-forwarded-for"],
    },
  },
} as BetterAuthOptions;

function rateLimitResponse(retryAfter: number) {
  const value = String(retryAfter);
  return Response.json(
    { code: "RATE_LIMITED", message: RATE_LIMIT_MESSAGE, retryAfter },
    {
      status: 429,
      headers: { "Retry-After": value, "X-Retry-After": value },
    },
  );
}

function serviceUnavailableResponse() {
  return Response.json(
    {
      code: "AUTH_SERVICE_UNAVAILABLE",
      message: "No se pudo procesar la solicitud. Intenta de nuevo mas tarde.",
    },
    { status: 503 },
  );
}

export const GET = handlers.GET;

export async function POST(request: Request) {
  const pathname = new URL(request.url).pathname.replace(/^\/api\/auth/, "");

  if (!(pathname in OTP_RATE_LIMIT_PATHS)) {
    return handlers.POST(request);
  }

  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
    body = null;
  }

  const email =
    body && typeof body === "object" && typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email
      : null;
  const isSignUp = pathname === "/sign-up/email";
  let receipt: Awaited<ReturnType<typeof consumeOtpRateLimit>>;

  try {
    receipt = await consumeOtpRateLimit({
      path: pathname as OtpRateLimitPath,
      email,
      ip: getIp(request, IP_OPTIONS),
      // Se reserva el cupo para cerrar carreras concurrentes. Si el registro o Resend
      // fallan, se elimina abajo; solo un envio confirmado queda contabilizado.
      reserveInitialVerification: isSignUp && Boolean(email),
    });
  } catch (error) {
    if (error instanceof OtpRateLimitExceededError) {
      return rateLimitResponse(error.retryAfter);
    }
    console.error("OTP rate limiter failed closed", error);
    return serviceUnavailableResponse();
  }

  try {
    const requestState = { isSignUp, initialOtpSent: false };
    const response = await otpRateLimitRequestContext.run(
      requestState,
      () => handlers.POST(request),
    );
    if (isSignUp && !requestState.initialOtpSent && receipt.eventIds[1]) {
      await removeOtpRateLimitEvents([receipt.eventIds[1]]);
    }
    return response;
  } catch (error) {
    if (isSignUp && receipt.eventIds[1]) {
      await removeOtpRateLimitEvents([receipt.eventIds[1]]).catch(() => undefined);
    }
    console.error("Authentication request failed while rate limited", error);
    return serviceUnavailableResponse();
  }
}
