import { notFound } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import { ContentFormSurface } from "@/modules/content/components/admin/ContentFormSurface";
import { ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { EditResourceForm } from "@/modules/content/components/editor/EditResourceForm";
import { requireRole } from "@/server/auth/guards";
import { getResourceContentDetail } from "@/server/content/content-detail-queries";
import { prisma } from "@/server/db/prisma";

export default async function CollaboratorResourceEditPage({ params }: { params: Promise<{ resourceId: string }> }) {
  const [{ resourceId }, actor] = await Promise.all([params, requireRole(Role.COLLABORATOR)]);
  const [resource, context] = await Promise.all([
    getResourceContentDetail({ resourceId, actor }),
    prisma.resource.findUnique({ where: { id: resourceId }, select: { module: { select: { id: true, title: true, subjectId: true } } } }),
  ]);
  if (!resource || !context) notFound();
  const resourceHref = `/dashboard/collaborator/content/resources/${encodeURIComponent(resource.id)}`;
  return <div className="space-y-6">
    <ContentPageHeader eyebrow="Colaboración editorial" title={`Editar ${resource.title}`} description={`Recurso del módulo ${context.module.title}. La autoría original se conservará.`} breadcrumbs={[{ label: "Contenido", href: "/dashboard/collaborator/content" }, { label: "Catálogo", href: "/dashboard/collaborator/content/catalog" }, { label: context.module.title, href: `/dashboard/collaborator/content/subjects/${encodeURIComponent(context.module.subjectId)}?module=${encodeURIComponent(context.module.id)}` }, { label: resource.title, href: resourceHref }, { label: "Editar" }]} />
    <ContentFormSurface wide>
      {resource.canEdit ? <div className="space-y-4">{resource.publicationStatus === "PUBLISHED" ? <p className="rounded-lg border border-secondary/20 bg-secondary/5 p-3 text-sm text-foreground">{resource.revisionStatus === "IN_REVIEW" ? "Esta propuesta está en revisión. Puedes continuar editándola; al guardar, el administrador recibirá la versión más reciente." : resource.revisionStatus === "CHANGES_REQUESTED" ? "Corrige la propuesta según las observaciones y vuelve a enviarla. La versión publicada continúa disponible." : "Estás editando una propuesta. La versión publicada seguirá disponible hasta que un administrador apruebe los cambios."}</p> : null}<EditResourceForm resource={{ ...resource, updatedAt: resource.updatedAt.toISOString() }} closeHref={resourceHref} submitForReview={resource.publicationStatus === "PUBLISHED"} revisionStatus={resource.revisionStatus} /></div> : <p role="alert" className="rounded-lg bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">Este recurso no puede editarse en su estado actual.</p>}
    </ContentFormSurface>
  </div>;
}
