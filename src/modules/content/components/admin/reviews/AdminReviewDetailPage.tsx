import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicationStatus, Role } from "@/generated/prisma/enums";
import { AudienceBadge, PublicationStatusBadge, ResourceTypeBadge } from "@/modules/content/components/admin/ContentBadges";
import { ContentPageHeader, secondaryActionClass } from "@/modules/content/components/admin/ContentPageHeader";
import { EditorialControls } from "@/modules/content/components/admin/editorial/EditorialControls";
import { ResourceContentView } from "@/modules/content/components/editor/ResourceContentView";
import { getAdminReviewTransitions } from "@/modules/content/domain/editorial-workflow";
import { requireRole } from "@/server/auth/guards";
import { getAdminReviewDetail } from "@/server/content/admin-review-queries";
import { getResourceContentDetail } from "@/server/content/content-detail-queries";

const dateFormatter = new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Costa_Rica" });

export async function AdminReviewDetailPage({ reviewId }: { reviewId: string }) {
  const admin = await requireRole(Role.ADMIN);
  const filters = { kind: "resources" as const, query: "", page: 1, pageSize: 10 };
  const detail = await getAdminReviewDetail(filters, reviewId);
  if (!detail) notFound();

  const resourceDetail = await getResourceContentDetail({ resourceId: detail.id, expectedModuleId: detail.parentId, actor: admin });
  const reviewsHref = "/dashboard/admin/content/reviews";
  const reviewHref = (id: string) => `/dashboard/admin/content/reviews/resources/${encodeURIComponent(id)}`;

  return (
    <div className="space-y-6">
      <ContentPageHeader
        eyebrow="Revisión de recurso"
        title={detail.title}
        description={detail.context}
        breadcrumbs={[{ label: "Revisiones", href: reviewsHref }, { label: detail.title }]}
        metadata={<div className="flex flex-wrap items-center gap-2"><PublicationStatusBadge status={PublicationStatus.IN_REVIEW} /><AudienceBadge audience={detail.audience} />{detail.resourceType ? <ResourceTypeBadge type={detail.resourceType} /> : null}</div>}
      />

      <nav aria-label="Navegación entre revisiones" className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        {detail.previousId ? <Link href={reviewHref(detail.previousId)} className={secondaryActionClass}><ChevronLeft aria-hidden="true" className="h-4 w-4" />Anterior</Link> : <span />}
        <Link href={reviewsHref} className="text-sm font-medium text-muted hover:text-foreground">Volver a pendientes</Link>
        {detail.nextId ? <Link href={reviewHref(detail.nextId)} className={secondaryActionClass}>Siguiente<ChevronRight aria-hidden="true" className="h-4 w-4" /></Link> : <span />}
      </nav>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.7fr)]">
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5" aria-labelledby="review-preview-heading">
          <h2 id="review-preview-heading" className="text-lg font-semibold text-foreground">Contenido a revisar</h2>
          <dl className="mt-4 grid gap-3 rounded-xl bg-surface p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Autor</dt><dd className="mt-1 font-medium text-foreground">{detail.authorName}</dd></div>
            <div><dt className="text-muted">Enviado</dt><dd className="mt-1 font-medium text-foreground">{detail.submittedAt ? dateFormatter.format(detail.submittedAt) : "Sin fecha"}</dd></div>
          </dl>
          <div className="mt-5">
            {resourceDetail ? <ResourceContentView resource={resourceDetail} /> : null}
          </div>
        </section>

        <aside className="rounded-xl border border-border bg-card p-4 sm:p-5" aria-labelledby="review-decision-heading">
          <h2 id="review-decision-heading" className="text-lg font-semibold text-foreground">Decisión editorial</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Publica el contenido o devuelve observaciones concretas. La confirmación ocurre aquí mismo.</p>
          <div className="mt-5">
            <EditorialControls
              targetType="resource"
              targetId={detail.id}
              parentId={detail.parentId}
              transitions={getAdminReviewTransitions(PublicationStatus.IN_REVIEW)}
              layout="stacked"
              variant="review-workspace"
              targetTitle={detail.title}
              successHref={reviewsHref}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
