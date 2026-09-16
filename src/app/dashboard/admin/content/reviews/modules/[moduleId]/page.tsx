import { notFound } from "next/navigation";

import { PublicationStatus, Role } from "@/generated/prisma/enums";
import { AudienceBadge, PublicationStatusBadge } from "@/modules/content/components/admin/ContentBadges";
import { ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { EditorialControls } from "@/modules/content/components/admin/editorial/EditorialControls";
import { getAdminReviewTransitions } from "@/modules/content/domain/editorial-workflow";
import { requireRole } from "@/server/auth/guards";
import { getAdminReviewDetail } from "@/server/content/admin-review-queries";

export default async function AdminModuleReviewPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const [{ moduleId }] = await Promise.all([params, requireRole(Role.ADMIN)]);
  const detail = await getAdminReviewDetail({ kind: "modules", query: "", page: 1, pageSize: 10 }, moduleId);
  if (!detail) notFound();
  return <div className="space-y-6">
    <ContentPageHeader eyebrow="Revisión de módulo" title={detail.title} description={detail.context} breadcrumbs={[{ label: "Revisiones", href: "/dashboard/admin/content/reviews?kind=modules" }, { label: detail.title }]} metadata={<div className="flex flex-wrap gap-2"><PublicationStatusBadge status={PublicationStatus.IN_REVIEW} /><AudienceBadge audience={detail.audience} /></div>} />
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,.7fr)]">
      <section className="rounded-xl border border-border bg-card p-5"><h2 className="text-lg font-semibold text-foreground">Propuesta</h2><p className="mt-3 text-sm leading-6 text-muted">{detail.description ?? "Sin descripción."}</p><dl className="mt-4 grid gap-3 rounded-xl bg-surface p-4 text-sm sm:grid-cols-2"><div><dt className="text-muted">Responsable de la revisión</dt><dd className="mt-1 font-medium">{detail.authorName}</dd></div><div><dt className="text-muted">Recursos asociados</dt><dd className="mt-1 font-medium">{detail.resourceCount}</dd></div></dl></section>
      <aside className="rounded-xl border border-border bg-card p-5"><h2 className="text-lg font-semibold text-foreground">Decisión editorial</h2><p className="mt-1 text-sm text-muted">La versión publicada se conserva hasta aprobar esta propuesta.</p><div className="mt-5"><EditorialControls targetType="module" targetId={detail.id} parentId={detail.parentId} transitions={getAdminReviewTransitions(PublicationStatus.IN_REVIEW)} layout="stacked" variant="review-workspace" targetTitle={detail.title} successHref="/dashboard/admin/content/reviews?kind=modules" /></div></aside>
    </div>
  </div>;
}
