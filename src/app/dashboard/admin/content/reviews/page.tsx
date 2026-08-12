import { ClipboardCheck, Eye } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ContentAudience, ResourceType } from "@/generated/prisma/enums";
import { AudienceBadge, resourceTypeLabels } from "@/modules/content/components/admin/ContentBadges";
import { ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { ContentPagination } from "@/modules/content/components/admin/ContentPagination";
import { UrlSearchField } from "@/modules/content/components/admin/UrlSearchField";
import { UrlSelectFilter } from "@/modules/content/components/admin/UrlSelectFilter";
import { getAdminReviewQueue } from "@/server/content/admin-review-queries";

const PAGE_SIZE = 10;
const audienceOptions = [
  { value: ContentAudience.STUDENT, label: "Estudiantes" },
  { value: ContentAudience.TEACHER, label: "Docentes" },
  { value: ContentAudience.BOTH, label: "Ambos" },
];
const resourceTypeOptions = Object.values(ResourceType).map((type) => ({ value: type, label: resourceTypeLabels[type] }));

function enumValue<T extends string>(value: unknown, values: readonly T[]) {
  return typeof value === "string" && values.includes(value as T) ? (value as T) : undefined;
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[]; q?: string | string[]; author?: string | string[]; audience?: string | string[]; type?: string | string[]; page?: string | string[] }>;
}) {
  const params = await searchParams;
  const kind = "resources" as const;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const authorId = typeof params.author === "string" ? params.author : undefined;
  const audience = enumValue(params.audience, Object.values(ContentAudience));
  const resourceType = enumValue(params.type, Object.values(ResourceType));
  const requestedPage = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const result = await getAdminReviewQueue({ kind, query, authorId, audience, resourceType, page, pageSize: PAGE_SIZE });
  if (page > result.totalPages) redirect(`/dashboard/admin/content/reviews?kind=${kind}`);

  const queryState = new URLSearchParams({ kind });
  if (query) queryState.set("q", query);
  if (authorId) queryState.set("author", authorId);
  if (audience) queryState.set("audience", audience);
  if (resourceType) queryState.set("type", resourceType);
  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams(queryState);
    if (nextPage > 1) next.set("page", String(nextPage));
    return `/dashboard/admin/content/reviews?${next.toString()}`;
  };

  return (
    <div className="space-y-6">
      <ContentPageHeader
        title="Bandeja de revisiones"
        description="Evalúa los recursos enviados por colaboradores antes de publicarlos."
        breadcrumbs={[{ label: "Contenido", href: "/dashboard/admin/content" }, { label: "Revisiones" }]}
      />

      <section className="overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="reviews-list-heading">
        <div className="border-b border-border p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 id="reviews-list-heading" className="text-xl font-semibold text-foreground">Pendientes</h2><p className="mt-1 text-sm text-muted">{result.totalItems} elementos en esta vista.</p></div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <UrlSearchField parameter="q" initialValue={query} label="Buscar" placeholder="Título o descripción" />
            <UrlSelectFilter parameter="author" value={authorId} label="Autor" allLabel="Todos los autores" options={result.authors.map((author) => ({ value: author.id, label: author.name }))} />
            <UrlSelectFilter parameter="audience" value={audience} label="Audiencia" allLabel="Todas las audiencias" options={audienceOptions} />
            <UrlSelectFilter parameter="type" value={resourceType} label="Tipo" allLabel="Todos los tipos" options={resourceTypeOptions} />
          </div>
        </div>

        {result.items.length > 0 ? (
          <>
            <ul className="divide-y divide-border">
              {result.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/dashboard/admin/content/reviews/resources/${encodeURIComponent(item.id)}`}
                    className="flex items-center gap-3 px-4 py-4 hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary sm:px-5"
                  >
                    <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 sm:inline-flex dark:text-amber-300"><ClipboardCheck aria-hidden="true" className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-foreground">{item.title}</span>
                      <span className="mt-1 block text-sm text-muted">{item.context}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted"><AudienceBadge audience={item.audience} /><span>{item.authorName}</span>{item.resourceType ? <span>{resourceTypeLabels[item.resourceType]}</span> : <span>{item.resourceCount} recursos</span>}</span>
                    </span>
                    <Eye aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-muted">{result.totalItems} elementos pendientes</p>
              <ContentPagination
                page={page}
                totalPages={result.totalPages}
                previousHref={page > 1 ? pageHref(page - 1) : undefined}
                nextHref={page < result.totalPages ? pageHref(page + 1) : undefined}
                ariaLabel="Paginación de revisiones"
              />
            </div>
          </>
        ) : (
          <div className="px-5 py-12 text-center"><ClipboardCheck aria-hidden="true" className="mx-auto h-9 w-9 text-success" /><h3 className="mt-3 text-lg font-semibold text-foreground">No hay pendientes</h3><p className="mt-1 text-sm text-muted">El contenido enviado a revisión aparecerá en esta bandeja.</p></div>
        )}
      </section>
    </div>
  );
}
