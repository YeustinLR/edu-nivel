/**
 * Responsabilidad del archivo:
 * - Aplicar una proteccion temprana a nivel de ruta antes de renderizar el arbol React.
 *
 * Papel en la arquitectura:
 * - Distingue entre autenticacion y autorizacion:
 *   - aqui solo comprobamos si existe la cookie oficial de sesion
 *   - la autorizacion por rol ocurre mas abajo, en Server Components/guards
 *
 * Cuando participa:
 * - En cada request a `/dashboard/*`.
 *
 * Dependencias:
 * - Usa el parser oficial de cookies de Better Auth como filtro optimista.
 * - La cookie no se considera una prueba de autenticacion: el guard server-side siempre resuelve
 *   la sesion y el usuario reales antes de renderizar datos privados.
 */
import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Aplica la politica minima de acceso por ruta:
 * - dashboard sin cookie de sesion se redirige temprano al login
 * - dashboard con cookie continua hacia el guard definitivo del servidor
 *
 * @param request Request de Next antes de llegar al App Router.
 * @returns `NextResponse.next()` o una redireccion.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  // Better Auth conoce el nombre exacto de su cookie y sus variantes seguras. Evitamos buscar
  // texto como "session" en el header, porque otras cookies podrian producir falsos positivos.
  const hasSessionCookie = Boolean(getSessionCookie(request));

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Limitamos el proxy a las rutas donde aporta valor real. El resto de la app publica no paga
  // el costo de resolver una sesion innecesariamente.
  matcher: [
    "/dashboard/:path*",
  ],
};
