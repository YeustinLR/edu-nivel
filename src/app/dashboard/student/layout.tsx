/**
 * Protege el area de estudiante con autorizacion exacta de rol a nivel de subarbol.
 */
import { Role, requireExactRoleOrRedirect } from "@/server/auth/guards";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireExactRoleOrRedirect(Role.STUDENT);
  return children;
}
