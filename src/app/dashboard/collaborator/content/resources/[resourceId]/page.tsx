import { notFound } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import { ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { CollaboratorResourcePanel } from "@/modules/content/components/collaborator/CollaboratorResourcePanel";
import { requireRole } from "@/server/auth/guards";
import { getResourceContentDetail } from "@/server/content/content-detail-queries";

export default async function CollaboratorResourcePage({ params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params;
  const user = await requireRole(Role.COLLABORATOR);
  const resource = await getResourceContentDetail({ resourceId, actor: user });
  if (!resource) notFound();

  return (
    <div className="space-y-8">
      <ContentPageHeader
        eyebrow="Recurso"
        title={resource.title}
        description="Consulta el contenido y edítalo cuando el estado editorial lo permita."
        breadcrumbs={[{ label: "Mis contenidos", href: "/dashboard/collaborator/content" }, { label: resource.title }]}
      />
      <CollaboratorResourcePanel resource={resource} />
    </div>
  );
}
