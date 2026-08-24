import { FileText, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AudienceBadge, PublicationStatusBadge, ResourceTypeBadge } from "@/modules/content/components/admin/ContentBadges";
import {
  adminCatalogBreadcrumbs,
  ContentPageHeader,
  primaryActionClass,
  secondaryActionClass,
} from "@/modules/content/components/admin/ContentPageHeader";
import { ContentPagination } from "@/modules/content/components/admin/ContentPagination";
import { ModuleDetailSummary } from "@/modules/content/components/admin/detail/ModuleDetailSummary";
import { ModuleReviewWorkspace } from "@/modules/content/components/admin/detail/ModuleReviewWorkspace";
import { getResourceCreationUnavailableReason, isModuleEditablePublicationStatus } from "@/modules/content/domain/content-permissions";
import { getAdminModuleDetail } from "@/server/content/admin-content-queries";
import { prisma } from "@/server/db/prisma";

const RESOURCE_PAGE_SIZE = 10;

export default async function AdminModuleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ moduleId: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const [{ moduleId }, queryParams] = await Promise.all([params, searchParams]);
  const context = await prisma.module.findUnique({
    where: { id: moduleId },
    select: {
      subjectId: true,
      subject: {
        select: {
          id: true,
          name: true,
          isActive: true,
          level: { select: { id: true, levelNumber: true, isActive: true } },
        },
      },
    },
  });
  if (!context) notFound();

  const requestedPage = typeof queryParams.page === "string" ? Number(queryParams.page) : 1;
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const detail = await getAdminModuleDetail({
    moduleId,
    subjectId: context.subjectId,
    includeResources: true,
    includeReviewChecklist: false,
    resourcePage: page,
    resourcePageSize: RESOURCE_PAGE_SIZE,
  });
  if (!detail) notFound();
  if (detail.resources && page > detail.resources.totalPages) {
    redirect(`/dashboard/admin/content/modules/${encodeURIComponent(moduleId)}`);
  }

  const moduleHref = `/dashboard/admin/content/modules/${encodeURIComponent(detail.id)}`;
  const resourceCreationReason = getResourceCreationUnavailableReason({
    publicationStatus: detail.publicationStatus,
    moduleIsActive: detail.isActive,
    subjectIsActive: context.subject.isActive,
    levelIsActive: context.subject.level.isActive,
  });

  return (
    <div className="space-y-6">
      <ContentPageHeader
        eyebrow="Módulo"
        title={detail.title}
        description={detail.description ?? "Este módulo todavía no tiene una descripción."}
        breadcrumbs={[
          ...adminCatalogBreadcrumbs,
          { label: `Nivel ${context.subject.level.levelNumber}`, href: `/dashboard/admin/content/levels/${encodeURIComponent(context.subject.level.id)}` },
          { label: context.subject.name, href: `/dashboard/admin/content/subjects/${encodeURIComponent(context.subject.id)}` },
          { label: detail.title },
        ]}
        metadata={
          <div className="flex flex-wrap items-center gap-2">
            {detail.isActive ? (
              <PublicationStatusBadge status={detail.publicationStatus} />
            ) : null}
            <AudienceBadge audience={detail.audience} />
            <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground-secondary">{detail.isActive ? "Activo" : "Archivado"}</span>
          </div>
        }
        actions={
          <>
            {isModuleEditablePublicationStatus(detail.publicationStatus) ? (
              <Link href={`${moduleHref}/edit`} className={secondaryActionClass}><Pencil aria-hidden="true" className="h-4 w-4" />Editar módulo</Link>
            ) : null}
            {!resourceCreationReason ? (
              <Link href={`${moduleHref}/resources/new`} className={primaryActionClass}><Plus aria-hidden="true" className="h-4 w-4" />Añadir recurso</Link>
            ) : null}
          </>
        }
      />

      {resourceCreationReason ? (
        <p role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {resourceCreationReason}
        </p>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.75fr)]">
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-4 sm:p-5" aria-labelledby="module-summary-heading">
            <h2 id="module-summary-heading" className="text-lg font-semibold text-foreground">Información general</h2>
            <div className="mt-2"><ModuleDetailSummary detail={detail} /></div>
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="module-resources-heading">
            <div className="border-b border-border p-4 sm:px-5">
              <h2 id="module-resources-heading" className="text-lg font-semibold text-foreground">Recursos</h2>
              <p className="mt-1 text-sm text-muted">{detail.resourceCount} {detail.resourceCount === 1 ? "recurso asociado" : "recursos asociados"}</p>
            </div>
            {detail.resources && detail.resources.items.length > 0 ? (
              <>
                <ul className="divide-y divide-border">
                  {detail.resources.items.map((resource) => (
                    <li key={resource.id}>
                      <Link
                        href={`/dashboard/admin/content/resources/${encodeURIComponent(resource.id)}`}
                        className="flex min-h-20 items-center gap-3 px-4 py-3 hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary sm:px-5"
                      >
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-elevated text-muted"><FileText aria-hidden="true" className="h-5 w-5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2"><span className="font-semibold text-foreground">{resource.title}</span><ResourceTypeBadge type={resource.type} /></span>
                          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">{resource.isActive ? <PublicationStatusBadge status={resource.publicationStatus} /> : <span>Archivado</span>}<span>{resource.authorName}</span></span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {detail.resources.totalPages > 1 ? (
                  <div className="border-t border-border px-4 py-3 sm:px-5">
                    <ContentPagination
                      page={page}
                      totalPages={detail.resources.totalPages}
                      previousHref={page > 1 ? `${moduleHref}?page=${page - 1}` : undefined}
                      nextHref={page < detail.resources.totalPages ? `${moduleHref}?page=${page + 1}` : undefined}
                      ariaLabel="Paginación de recursos"
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="px-5 py-10 text-center"><FileText aria-hidden="true" className="mx-auto h-9 w-9 text-muted" /><h3 className="mt-3 font-semibold text-foreground">Sin recursos</h3><p className="mt-1 text-sm text-muted">Añade el primer recurso cuando el estado del módulo lo permita.</p></div>
            )}
          </section>
        </div>

        <aside className="rounded-xl border border-border bg-card p-4 sm:p-5" aria-labelledby="module-editorial-heading">
          <h2 id="module-editorial-heading" className="text-lg font-semibold text-foreground">Publicación del módulo</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Administra su disponibilidad sin pasar por una revisión editorial.</p>
          <div className="mt-4"><ModuleReviewWorkspace detail={detail} subjectId={context.subjectId} /></div>
        </aside>
      </div>
    </div>
  );
}
