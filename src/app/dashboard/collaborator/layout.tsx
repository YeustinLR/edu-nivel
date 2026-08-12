/**
 * Protege el area de colaborador y encapsula la regla "un usuario solo puede entrar
 * a la seccion correspondiente a su rol".
 */
import { Role, requireExactRoleOrRedirect } from "@/server/auth/guards";

export default async function CollaboratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireExactRoleOrRedirect(Role.COLLABORATOR);
  return children;
}
