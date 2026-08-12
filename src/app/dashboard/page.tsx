/**
 * Responsabilidad del archivo:
 * - Resolver `/dashboard` hacia la landing privada correcta segun el rol del usuario.
 *
 * Papel en la arquitectura:
 * - Evita que el frontend tenga que conocer reglas de ruteo por rol.
 * - Centraliza el punto de entrada a todas las areas privadas.
 */
import { redirect } from "next/navigation";

import { getDashboardPathForRole } from "@/modules/auth/lib/dashboard-path";
import { requireUser } from "@/server/auth/guards";

export default async function DashboardPage() {
  const user = await requireUser();
  const target = getDashboardPathForRole(user.role);
  // La redireccion ocurre en servidor antes del render final. Asi evitamos exponer una vista
  // intermedia o depender de logica de cliente para decidir el area privada correcta.
  redirect(target);
}
