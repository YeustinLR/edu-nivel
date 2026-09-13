import { notFound } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import { ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { CollaboratorResourcePanel } from "@/modules/content/components/collaborator/CollaboratorResourcePanel";
import { requireRole } from "@/server/auth/guards";
import { getResourceContentDetail } from "@/server/content/content-detail-queries";

export default async function CollaboratorResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resourceId: string }>;
  searchParams: Promise<{
    edit?: string | string[];
    notice?: string | string[];
  }>;
}) {
  const [{ resourceId }, queryParams] = await Promise.all([params, searchParams]);
  const user = await requireRole(Role.COLLABORATOR);
  const resource = await getResourceContentDetail({ resourceId, actor: user });
  if (!resource) notFound();
  const creationNotice =
    queryParams.notice === "resource-draft"
      ? `Borrador de “${resource.title}” guardado.`
      : queryParams.notice === "resource-submitted"
        ? `“${resource.title}” fue enviado a revisión.`
        : undefined;

  return (
    <div className="space-y-8">
      <ContentPageHeader
        eyebrow="Recurso"
        title={resource.title}
        description="Consulta el contenido y edítalo cuando el estado editorial lo permita."
        breadcrumbs={[{ label: "Mis contenidos", href: "/dashboard/collaborator/content" }, { label: resource.title }]}
      />
      <CollaboratorResourcePanel
        resource={resource}
        initiallyEditing={queryParams.edit === "1" && resource.canEdit}
        creationNotice={creationNotice}
      />
    </div>
  );
}
