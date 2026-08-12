/**
 * Protege todo el subarbol administrativo. Si el usuario esta autenticado pero pertenece a otro
 * rol, lo redirigimos a su dashboard real en vez de mostrar un error generico.
 */
import { Role, requireExactRoleOrRedirect } from "@/server/auth/guards";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireExactRoleOrRedirect(Role.ADMIN);
  return children;
}
