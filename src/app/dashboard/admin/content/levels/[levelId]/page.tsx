import { ContentLevelView } from "@/modules/content/components/catalog/ContentLevelView";

export default async function AdminLevelDetailPage({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = await params;
  return <ContentLevelView levelId={levelId} contentRootHref="/dashboard/admin/content" canManageStructure />;
}
