import "server-only";

import { headers } from "next/headers";

import type {
  AccountSession,
  AccountSessionAccess,
} from "@/modules/account/types/account-session";
import { auth } from "@/server/auth/auth";
import { getCurrentSession, requireUser } from "@/server/auth/guards";

function serializeSession(session: {
  id: string;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}): AccountSession {
  return {
    id: session.id,
    token: session.token,
    createdAt: new Date(session.createdAt).toISOString(),
    updatedAt: new Date(session.updatedAt).toISOString(),
    expiresAt: new Date(session.expiresAt).toISOString(),
    ipAddress: session.ipAddress ?? null,
    userAgent: session.userAgent ?? null,
  };
}

function authErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("body" in error)) return null;
  const body = error.body;
  if (!body || typeof body !== "object" || !("code" in body)) return null;
  return typeof body.code === "string" ? body.code : null;
}

async function getSessionAccess(
  requestHeaders: Headers,
): Promise<AccountSessionAccess> {
  try {
    const sessions = await auth.api.listSessions({ headers: requestHeaders });
    return { status: "ready", sessions: sessions.map(serializeSession) };
  } catch (error) {
    if (authErrorCode(error) === "SESSION_NOT_FRESH") {
      return { status: "reauth-required", sessions: [] };
    }
    throw error;
  }
}

export async function getAccountSettingsData() {
  // La autorización se resuelve antes de consultar sesiones. listSessions vuelve a
  // validar la cookie y Better Auth limita el resultado al propietario autenticado.
  const user = await requireUser();
  const requestHeaders = await headers();
  const [currentSession, sessionAccess] = await Promise.all([
    getCurrentSession(),
    getSessionAccess(requestHeaders),
  ]);

  return {
    user: {
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      selectedLevelNumber: user.selectedLevel?.levelNumber ?? null,
    },
    currentSessionToken: currentSession?.session.token ?? null,
    sessionAccess,
  };
}
