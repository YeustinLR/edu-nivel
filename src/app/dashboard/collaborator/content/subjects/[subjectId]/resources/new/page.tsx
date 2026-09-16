import { Role } from "@/generated/prisma/enums";
import { SubjectResourceCreationView } from "@/modules/content/components/catalog/ContentResourceCreationView";
import { requireRole } from "@/server/auth/guards";

export default async function CollaboratorSubjectResourcePage({ params }: { params: Promise<{ subjectId: string }> }) {
  const [{ subjectId }, actor] = await Promise.all([params, requireRole(Role.COLLABORATOR)]);
  return <SubjectResourceCreationView subjectId={subjectId} actor={actor} contentRootHref="/dashboard/collaborator/content" mode="collaborator" />;
}
