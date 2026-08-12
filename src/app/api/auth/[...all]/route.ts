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

import { auth } from "@/server/auth/auth";

export const { GET, POST } = toNextJsHandler(auth);
