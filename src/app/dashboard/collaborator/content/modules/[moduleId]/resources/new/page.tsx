import { Role } from "@/generated/prisma/enums";
import { ModuleResourceCreationView } from "@/modules/content/components/catalog/ContentResourceCreationView";
import { requireRole } from "@/server/auth/guards";

export default async function CollaboratorModuleResourcePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const [{ moduleId }, actor] = await Promise.all([params, requireRole(Role.COLLABORATOR)]);
  return <ModuleResourceCreationView moduleId={moduleId} actor={actor} contentRootHref="/dashboard/collaborator/content" mode="collaborator" />;
}
