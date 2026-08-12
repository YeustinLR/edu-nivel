import { GraduationCap, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  adminCatalogBreadcrumbs,
  ContentPageHeader,
  primaryActionClass,
} from "@/modules/content/components/admin/ContentPageHeader";
import { ContentPagination } from "@/modules/content/components/admin/ContentPagination";
import { UrlSearchField } from "@/modules/content/components/admin/UrlSearchField";
import { getAdminContentCatalogPage } from "@/server/content/admin-content-queries";

const PAGE_SIZE = 6;

function catalogPageHref(query: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return `/dashboard/admin/content/catalog${search ? `?${search}` : ""}`;
}

function CatalogSkeleton() {
  return (
    <div aria-busy="true" className="mx-auto grid w-full max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">Cargando niveles</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-xl border border-border bg-card" />
      ))}
    </div>
  );
}

async function CatalogResults({ query, page }: { query: string; page: number }) {
  const result = await getAdminContentCatalogPage({ query, page, pageSize: PAGE_SIZE });
  if (page > result.totalPages) redirect(catalogPageHref(query, 1));

  if (result.items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-5 py-12 text-center">
        <GraduationCap aria-hidden="true" className="mx-auto h-10 w-10 text-muted" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          {query ? "No encontramos coincidencias" : "Aún no hay niveles"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          {query
            ? "Prueba con otro número de nivel, nombre de materia o descripción."
            : "Crea el primer nivel para comenzar a organizar el catálogo académico."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((level) => {
          const moduleCount = level.subjects.reduce(
            (total, subject) => total + subject.moduleCount,
            0,
          );

          return (
            <li key={level.id}>
              <Link
                href={`/dashboard/admin/content/levels/${encodeURIComponent(level.id)}`}
                className="group flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-secondary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary lg:p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-secondary/10 text-secondary">
                    <GraduationCap aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${level.isActive ? "bg-success/10 text-success" : "bg-red-500/10 text-red-700 dark:text-red-300"}`}>
                    {level.isActive ? "Activo" : "Archivado"}
                  </span>
                </div>
                <h2 className="mt-2.5 text-base font-semibold text-foreground group-hover:text-secondary">
                  Nivel {level.levelNumber}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted">
                  {level.description ?? "Sin descripción configurada."}
                </p>
                <div className="mt-2.5 flex items-center gap-2 border-t border-border pt-2.5 text-xs text-muted">
                  <span>{level.subjects.length} {level.subjects.length === 1 ? "materia" : "materias"}</span>
                  <span aria-hidden="true">·</span>
                  <span>{moduleCount} {moduleCount === 1 ? "módulo" : "módulos"}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {result.totalPages > 1 ? (
        <div className="flex flex-col gap-3 border-t border-border pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted">
            Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, result.totalItems)} de {result.totalItems} niveles
          </p>
          <ContentPagination
            page={page}
            totalPages={result.totalPages}
            previousHref={page > 1 ? catalogPageHref(query, page - 1) : undefined}
            nextHref={page < result.totalPages ? catalogPageHref(query, page + 1) : undefined}
            ariaLabel="Paginación del catálogo"
          />
        </div>
      ) : null}
    </div>
  );
}

export default async function AdminCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const requestedPage = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  return (
    <div className="space-y-6">
      <ContentPageHeader
        title="Catálogo académico"
        description="Explora la jerarquía por niveles. Cada entidad tiene ahora su propia página de administración."
        breadcrumbs={[...adminCatalogBreadcrumbs]}
        actions={
          <Link href="/dashboard/admin/content/levels/new" className={primaryActionClass}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            Crear nivel
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-4xl">
        <UrlSearchField
          parameter="q"
          initialValue={query}
          label="Buscar en el catálogo"
          placeholder="Nivel, materia o descripción"
        />
      </div>

      <Suspense key={`catalog-results-${query}-${page}`} fallback={<CatalogSkeleton />}>
        <CatalogResults query={query} page={page} />
      </Suspense>
    </div>
  );
}
