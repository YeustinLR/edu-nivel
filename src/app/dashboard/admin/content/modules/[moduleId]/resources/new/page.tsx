import { Role } from "@/generated/prisma/enums";
import { ModuleResourceCreationView } from "@/modules/content/components/catalog/ContentResourceCreationView";
import { requireRole } from "@/server/auth/guards";

export default async function CreateAdminResourcePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const [{ moduleId }, actor] = await Promise.all([params, requireRole(Role.ADMIN)]);
  return <ModuleResourceCreationView moduleId={moduleId} actor={actor} contentRootHref="/dashboard/admin/content" mode="admin" />;
}
