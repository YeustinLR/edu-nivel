import { Role } from "@/generated/prisma/enums";
import { CollaboratorDashboardHome } from "@/modules/dashboard/components/collaborator/CollaboratorDashboardHome";
import { requireRole } from "@/server/auth/guards";
import { getCollaboratorDashboardData } from "@/server/dashboard/collaborator-dashboard-queries";

export default async function CollaboratorDashboardPage() {
  const user = await requireRole(Role.COLLABORATOR);
  const data = await getCollaboratorDashboardData(user.id);

  return (
    <CollaboratorDashboardHome userName={user.name} data={data} />
  );
}
