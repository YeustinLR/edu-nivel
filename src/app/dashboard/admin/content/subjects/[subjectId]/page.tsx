import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminSubjectModuleList } from "@/modules/content/components/admin/AdminSubjectModuleList";
import {
  adminCatalogBreadcrumbs,
  ContentPageHeader,
  primaryActionClass,
  secondaryActionClass,
} from "@/modules/content/components/admin/ContentPageHeader";
import { ContentPagination } from "@/modules/content/components/admin/ContentPagination";
import { UrlSelectFilter } from "@/modules/content/components/admin/UrlSelectFilter";
import { getAdminModulesPage } from "@/server/content/admin-content-queries";
import { prisma } from "@/server/db/prisma";

const PAGE_SIZE = 10;

export default async function AdminSubjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{ module?: string | string[]; page?: string | string[] }>;
}) {
  const [{ subjectId }, queryParams] = await Promise.all([params, searchParams]);
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      level: { select: { id: true, levelNumber: true, isActive: true } },
    },
  });
  if (!subject) notFound();

  const moduleId = typeof queryParams.module === "string" ? queryParams.module : undefined;
  const requestedPage = typeof queryParams.page === "string" ? Number(queryParams.page) : 1;
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const result = await getAdminModulesPage({
    subjectId,
    moduleId,
    page,
    pageSize: PAGE_SIZE,
  });
  if (page > result.totalPages) redirect(`/dashboard/admin/content/subjects/${encodeURIComponent(subject.id)}`);

  const subjectHref = `/dashboard/admin/content/subjects/${encodeURIComponent(subject.id)}`;
  const queryState = new URLSearchParams();
  if (result.selectedModuleId) queryState.set("module", result.selectedModuleId);
  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams(queryState);
    if (nextPage > 1) next.set("page", String(nextPage));
    return `${subjectHref}${next.size ? `?${next.toString()}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <ContentPageHeader
        eyebrow="Materia"
        title={subject.name}
        description={subject.description ?? "Esta materia todavía no tiene una descripción."}
        breadcrumbs={[
          ...adminCatalogBreadcrumbs,
          { label: `Nivel ${subject.level.levelNumber}`, href: `/dashboard/admin/content/levels/${encodeURIComponent(subject.level.id)}` },
          { label: subject.name },
        ]}
        metadata={<span className={`rounded-full px-2.5 py-1 text-xs font-medium ${subject.isActive ? "bg-success/10 text-success" : "bg-red-500/10 text-red-700 dark:text-red-300"}`}>{subject.isActive ? "Activa" : "Archivada"}</span>}
        actions={
          <>
            <Link href={`${subjectHref}/edit`} className={secondaryActionClass}><Pencil aria-hidden="true" className="h-4 w-4" />Editar materia</Link>
            {subject.isActive && subject.level.isActive ? (
              <Link href={`/dashboard/admin/content/modules/new?subjectId=${encodeURIComponent(subject.id)}`} className={primaryActionClass}><Plus aria-hidden="true" className="h-4 w-4" />Crear módulo</Link>
            ) : null}
          </>
        }
      />

      <section className="rounded-xl border border-border bg-card" aria-labelledby="subject-modules-heading">
        <div className="border-b border-border p-4 sm:p-5">
          <h2 id="subject-modules-heading" className="text-xl font-semibold text-foreground">Módulos</h2>
          <p className="mt-1 text-sm text-muted">Selecciona un módulo o explora la lista y despliega sus recursos.</p>
          <div className="mt-4 max-w-md">
            <UrlSelectFilter
              parameter="module"
              value={result.selectedModuleId}
              label="Filtrar por módulo"
              allLabel="Todos los módulos"
              options={result.moduleOptions.map((module, index) => ({
                value: module.id,
                label: `Módulo ${index + 1} — ${module.title}`,
              }))}
            />
          </div>
        </div>

        {result.items.length > 0 ? (
          <>
            <AdminSubjectModuleList
              key={result.selectedModuleId ?? `page-${page}`}
              modules={result.items}
              selectedModuleId={result.selectedModuleId}
            />
            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-muted">{result.totalItems} {result.totalItems === 1 ? "módulo" : "módulos"}</p>
              <ContentPagination
                page={page}
                totalPages={result.totalPages}
                previousHref={page > 1 ? pageHref(page - 1) : undefined}
                nextHref={page < result.totalPages ? pageHref(page + 1) : undefined}
                ariaLabel="Paginación de módulos"
              />
            </div>
          </>
        ) : (
          <AdminSubjectModuleList modules={[]} />
        )}
      </section>
    </div>
  );
}
