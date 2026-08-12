/**
 * Responsabilidad del archivo:
 * - Proteger el dashboard comun y montar el shell compartido para todas las areas privadas.
 *
 * Papel en la arquitectura:
 * - Es el primer Server Component protegido despues del proxy.
 * - Convierte una sesion valida en un `AuthenticatedUser` cargado desde Prisma.
 * - Pasa al shell solo los datos que la UI necesita para renderizar encabezado y sidebar.
 *
 * Cuando participa:
 * - En cualquier request a `/dashboard/*`.
 *
 * Seguridad:
 * - Aunque el proxy ya filtra requests sin sesion, este layout vuelve a resolver el usuario real.
 *   Esta validacion server-side es la que realmente protege el arbol React contra acceso indebido
 *   y contra inconsistencias entre cookie y base de datos.
 */
import { requireUser } from "@/server/auth/guards";

import { Role } from "@/generated/prisma/enums";
import { DashboardShell } from "@/modules/dashboard/components/layout/DashboardShell";
import { getLearnerDashboardData } from "@/server/content/learner-dashboard-queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const learnerRole =
    user.role === Role.STUDENT || user.role === Role.TEACHER
      ? user.role
      : null;
  const learnerDashboardData = learnerRole
    ? await getLearnerDashboardData(learnerRole)
    : null;

  return (
    <DashboardShell
      userName={user.name}
      userEmail={user.email}
      userRole={user.role}
      userImage={user.image}
      learnerShellData={learnerDashboardData
        ? {
            access: learnerDashboardData.access,
            searchItems: learnerDashboardData.searchItems,
          }
        : undefined}
    >
      {children}
    </DashboardShell>
  );
}
