import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  adminCatalogBreadcrumbs,
  ContentPageHeader,
  secondaryActionClass,
} from "@/modules/content/components/admin/ContentPageHeader";
import { EditorialControls } from "@/modules/content/components/admin/editorial/EditorialControls";
import { AdminResourceDeletionControl } from "@/modules/content/components/admin/detail/AdminResourceDeletionControl";
import { ResourceContentView } from "@/modules/content/components/editor/ResourceContentView";
import { getAdminEditorialTransitions } from "@/modules/content/domain/editorial-workflow";
import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/server/auth/guards";
import { getResourceContentDetail } from "@/server/content/content-detail-queries";
import { getLevelDeletionEligibility } from "@/server/content/delete-catalog-level";
import { prisma } from "@/server/db/prisma";

export default async function AdminResourceDetailPage({
  params,
}: {
  params: Promise<{ resourceId: string }>;
}) {
  const { resourceId } = await params;
  const admin = await requireRole(Role.ADMIN);
  const [resource, context] = await Promise.all([
    getResourceContentDetail({ resourceId, actor: admin }),
    prisma.resource.findUnique({
      where: { id: resourceId },
      select: {
        module: {
          select: {
            id: true,
            title: true,
            subject: {
              select: {
                id: true,
                name: true,
                level: { select: { id: true, levelNumber: true } },
              },
            },
          },
        },
      },
    }),
  ]);
  if (!resource || !context) notFound();
  const deletionEligibility = await getLevelDeletionEligibility(
    context.module.subject.level.id,
  );

  const moduleHref = `/dashboard/admin/content/modules/${encodeURIComponent(context.module.id)}`;
  const resourceHref = `/dashboard/admin/content/resources/${encodeURIComponent(resource.id)}`;

  return (
    <div className="space-y-6">
      <ContentPageHeader
        eyebrow="Recurso"
        title={resource.title}
        description="Consulta el contenido, las indicaciones y el estado editorial del recurso."
        breadcrumbs={[
          ...adminCatalogBreadcrumbs,
          { label: `Nivel ${context.module.subject.level.levelNumber}`, href: `/dashboard/admin/content/levels/${encodeURIComponent(context.module.subject.level.id)}` },
          { label: context.module.subject.name, href: `/dashboard/admin/content/subjects/${encodeURIComponent(context.module.subject.id)}` },
          { label: context.module.title, href: moduleHref },
          { label: resource.title },
        ]}
        actions={
          resource.canEdit ? (
            <Link href={`${resourceHref}/edit`} className={secondaryActionClass}><Pencil aria-hidden="true" className="h-4 w-4" />Editar recurso</Link>
          ) : undefined
        }
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,0.6fr)]">
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5" aria-label="Contenido del recurso">
          <ResourceContentView resource={resource} />
        </section>
        <aside className="rounded-xl border border-border bg-card p-4 sm:p-5" aria-labelledby="resource-editorial-heading">
          <h2 id="resource-editorial-heading" className="text-lg font-semibold text-foreground">Flujo editorial</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Administra el estado del recurso con confirmación inline.</p>
          <div className="mt-5">
            <EditorialControls
              targetType="resource"
              targetId={resource.id}
              parentId={resource.moduleId}
              transitions={getAdminEditorialTransitions("resource", resource.publicationStatus)}
              layout="stacked"
              variant="review-workspace"
              targetTitle={resource.title}
            />
          </div>
          <div className="mt-5">
            <AdminResourceDeletionControl
              resourceId={resource.id}
              title={resource.title}
              activeSubscriptionCount={deletionEligibility.activeSubscriptionCount}
              unresolvedPaymentCount={deletionEligibility.unresolvedPaymentCount}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
