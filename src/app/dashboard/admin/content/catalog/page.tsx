import { Suspense } from "react";

import { CatalogSkeleton, ContentCatalogView } from "@/modules/content/components/catalog/ContentCatalogView";

export default async function AdminCatalogPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const requestedPage = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  return <Suspense key={`${query}-${page}`} fallback={<CatalogSkeleton />}><ContentCatalogView basePath="/dashboard/admin/content/catalog" contentRootHref="/dashboard/admin/content" query={query} page={page} canManageStructure /></Suspense>;
}
