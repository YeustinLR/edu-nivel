import {
  ArrowRight,
  BookOpen,
  CircleCheck,
  Clock3,
  GraduationCap,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ContentPageHeader,
  primaryActionClass,
  secondaryActionClass,
} from "@/modules/content/components/admin/ContentPageHeader";
import { getAdminContentSummary } from "@/server/content/admin-content-queries";

type LegacySearchParams = {
  tab?: string | string[];
  create?: string | string[];
  edit?: string | string[];
  levelId?: string | string[];
  subjectId?: string | string[];
  moduleId?: string | string[];
  resourceId?: string | string[];
  reviewId?: string | string[];
  reviewKind?: string | string[];
};

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function redirectLegacyWorkspace(params: LegacySearchParams) {
  const tab = single(params.tab);
  const create = single(params.create);
  const edit = single(params.edit);
  const levelId = single(params.levelId);
  const subjectId = single(params.subjectId);
  const moduleId = single(params.moduleId);
  const resourceId = single(params.resourceId);
  const reviewId = single(params.reviewId);
  const reviewKind = single(params.reviewKind);

  if (tab === "revisiones") {
    if (reviewId) {
      redirect(
        reviewKind === "modules"
          ? `/dashboard/admin/content/modules/${encodeURIComponent(reviewId)}`
          : `/dashboard/admin/content/reviews/resources/${encodeURIComponent(reviewId)}`,
      );
    }
    redirect("/dashboard/admin/content/reviews");
  }

  if (create === "level") redirect("/dashboard/admin/content/levels/new");
  if (create === "subject" && levelId) {
    redirect(`/dashboard/admin/content/subjects/new?levelId=${encodeURIComponent(levelId)}`);
  }
  if (create === "module" && subjectId) {
    redirect(`/dashboard/admin/content/modules/new?subjectId=${encodeURIComponent(subjectId)}`);
  }
  if (create === "resource" && moduleId) {
    redirect(`/dashboard/admin/content/modules/${encodeURIComponent(moduleId)}/resources/new`);
  }

  if (edit === "level" && levelId) {
    redirect(`/dashboard/admin/content/levels/${encodeURIComponent(levelId)}/edit`);
  }
  if (edit === "subject" && subjectId) {
    redirect(`/dashboard/admin/content/subjects/${encodeURIComponent(subjectId)}/edit`);
  }
  if (edit === "module" && moduleId) {
    redirect(`/dashboard/admin/content/modules/${encodeURIComponent(moduleId)}/edit`);
  }
  if (edit === "resource" && resourceId) {
    redirect(`/dashboard/admin/content/resources/${encodeURIComponent(resourceId)}/edit`);
  }

  if (tab === "catalogo") {
    if (resourceId) {
      redirect(`/dashboard/admin/content/resources/${encodeURIComponent(resourceId)}`);
    }
    if (moduleId) {
      redirect(`/dashboard/admin/content/modules/${encodeURIComponent(moduleId)}`);
    }
    if (subjectId) {
      redirect(`/dashboard/admin/content/subjects/${encodeURIComponent(subjectId)}`);
    }
    if (levelId) {
      redirect(`/dashboard/admin/content/levels/${encodeURIComponent(levelId)}`);
    }
    redirect("/dashboard/admin/content/catalog");
  }
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof BookOpen;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
    </div>
  );
}

export default async function AdminContentOverviewPage({
  searchParams,
}: {
  searchParams: Promise<LegacySearchParams>;
}) {
  const params = await searchParams;
  redirectLegacyWorkspace(params);
  const summary = await getAdminContentSummary();

  return (
    <div className="space-y-6">
      <ContentPageHeader
        eyebrow="Administración"
        title="Contenido educativo"
        description="Supervisa el catálogo, organiza la estructura académica y resuelve el flujo editorial desde un solo punto."
        actions={
          <>
            <Link href="/dashboard/admin/content/reviews" className={secondaryActionClass}>
              <Clock3 aria-hidden="true" className="h-4 w-4" />
              Ver revisiones
            </Link>
            <Link href="/dashboard/admin/content/levels/new" className={primaryActionClass}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              Crear nivel
            </Link>
          </>
        }
      />

      <section aria-labelledby="content-health-heading">
        <h2 id="content-health-heading" className="sr-only">Estado del contenido</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Niveles"
            value={summary.levelsConfigured}
            detail="Niveles configurados en el catálogo."
            icon={GraduationCap}
          />
          <Metric
            label="Módulos"
            value={summary.totalModules}
            detail="Total de módulos, sin importar su estado."
            icon={BookOpen}
          />
          <Metric
            label="Pendientes"
            value={summary.pendingReview.total}
            detail={`${summary.pendingReview.resources} recursos de colaboradores esperan revisión.`}
            icon={Clock3}
          />
          <Metric
            label="Publicados"
            value={summary.publishedContent.total}
            detail={`${summary.publishedContent.modules} módulos y ${summary.publishedContent.resources} recursos publicados.`}
            icon={CircleCheck}
          />
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2" aria-labelledby="content-workspaces-heading">
        <h2 id="content-workspaces-heading" className="sr-only">Espacios de trabajo</h2>
        <Link
          href="/dashboard/admin/content/catalog"
          className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-secondary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">Catálogo académico</p>
              <p className="mt-1 max-w-xl text-sm leading-5 text-muted">
                Recorre niveles, materias, módulos y recursos en páginas independientes y con contexto claro.
              </p>
            </div>
            <ArrowRight aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-secondary transition-transform group-hover:translate-x-1 motion-reduce:transform-none" />
          </div>
        </Link>
        <Link
          href="/dashboard/admin/content/reviews"
          className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-secondary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">Bandeja de revisiones</p>
              <p className="mt-1 max-w-xl text-sm leading-5 text-muted">
                Evalúa cada entrega en una página completa, con observaciones y decisiones editoriales inline.
              </p>
            </div>
            <ArrowRight aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-secondary transition-transform group-hover:translate-x-1 motion-reduce:transform-none" />
          </div>
        </Link>
      </section>
    </div>
  );
}
