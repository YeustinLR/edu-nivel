/**
 * Protege el area de docente. La validacion ocurre en servidor y no puede ser omitida
 * manipulando el router del navegador.
 */
import { Role, requireExactRoleOrRedirect } from "@/server/auth/guards";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireExactRoleOrRedirect(Role.TEACHER);
  return children;
}
