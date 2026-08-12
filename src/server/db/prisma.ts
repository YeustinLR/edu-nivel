/**
 * Responsabilidad del archivo:
 * - Crear y exportar la unica instancia de Prisma Client usada por el backend.
 *
 * Papel en la arquitectura:
 * - Es el punto de entrada a PostgreSQL para Better Auth y para los guards del dashboard.
 * - Centraliza la configuracion del adaptador `pg`, de modo que el resto del sistema no
 *   necesita saber como se abre la conexion a la base de datos.
 *
 * Cuando participa:
 * - En cualquier lectura o escritura de datos: registro, login, carga del usuario actual,
 *   sesiones, suscripciones y relaciones educativas.
 *
 * Dependencias:
 * - `src/server/auth/auth.ts` conecta Better Auth con Prisma usando esta instancia.
 * - `src/server/auth/guards.ts` la usa para obtener el usuario autenticado con sus relaciones.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/config/env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

// En desarrollo, Next puede recargar modulos muchas veces. Reusar la instancia evita abrir
// conexiones nuevas en cada hot reload y reduce errores por saturacion de conexiones.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
