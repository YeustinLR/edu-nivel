import { Suspense } from "react";

import { Role } from "@/generated/prisma/enums";
import { CatalogSkeleton, ContentCatalogView } from "@/modules/content/components/catalog/ContentCatalogView";
import { requireRole } from "@/server/auth/guards";

export default async function CollaboratorCatalogPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> }) {
  await requireRole(Role.COLLABORATOR);
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const requestedPage = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  return <Suspense key={`${query}-${page}`} fallback={<CatalogSkeleton />}><ContentCatalogView basePath="/dashboard/collaborator/content/catalog" contentRootHref="/dashboard/collaborator/content" query={query} page={page} canManageStructure={false} /></Suspense>;
}
