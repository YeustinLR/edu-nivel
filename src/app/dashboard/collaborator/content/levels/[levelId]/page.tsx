import { Role } from "@/generated/prisma/enums";
import { ContentLevelView } from "@/modules/content/components/catalog/ContentLevelView";
import { requireRole } from "@/server/auth/guards";

export default async function CollaboratorLevelPage({ params }: { params: Promise<{ levelId: string }> }) {
  const [{ levelId }] = await Promise.all([params, requireRole(Role.COLLABORATOR)]);
  return <ContentLevelView levelId={levelId} contentRootHref="/dashboard/collaborator/content" canManageStructure={false} />;
}
