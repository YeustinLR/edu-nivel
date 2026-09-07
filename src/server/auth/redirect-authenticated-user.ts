/**
 * Evita mostrar login o registro a un usuario cuya sesion sigue siendo valida.
 *
 * La comprobacion vive en las paginas publicas de auth, no en su layout compartido, para que se
 * ejecute tambien durante navegaciones parciales entre rutas hermanas.
 */
import "server-only";

import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function redirectAuthenticatedUser(): Promise<void> {
  const requestHeaders = await headers();

  // Sin token no puede existir una sesion. Este early return mantiene barata la ruta publica.
  if (!getSessionCookie(requestHeaders)) {
    return;
  }

  // El visitante anonimo no necesita cargar ni inicializar el backend de autenticacion.
  const { auth } = await import("@/server/auth/auth");

  // En login/registro comprobamos la fuente real para que una sesion revocada no produzca un
  // ciclo entre estas paginas y el dashboard mientras la cookie cacheada siga vigente.
  const session = await auth.api.getSession({
    headers: requestHeaders,
    query: {
      disableCookieCache: true,
    },
  });

  if (!session?.user) {
    return;
  }

  if (!session.user.emailVerified) {
    redirect("/verify-email");
  }

  redirect("/dashboard");
}
