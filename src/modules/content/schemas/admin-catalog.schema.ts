import { z } from "zod";

export type AdminCatalogSearchParams = {
  catalogQuery?: string | string[];
  levelId?: string | string[];
  subjectId?: string | string[];
};

const optionalQueryParameter = z
  .preprocess(
    (value) => (typeof value === "string" ? value : undefined),
    z.string().trim().max(100).optional(),
  )
  .catch(undefined);

const optionalIdParameter = z
  .preprocess(
    (value) => (typeof value === "string" ? value : undefined),
    z.string().trim().min(1).max(128).optional(),
  )
  .catch(undefined);

export const adminCatalogSearchParamsSchema = z.object({
  catalogQuery: optionalQueryParameter,
  levelId: optionalIdParameter,
  subjectId: optionalIdParameter,
});

export type ParsedAdminCatalogSearchParams = {
  catalogQuery: string;
  levelId?: string;
  subjectId?: string;
};

export function parseAdminCatalogSearchParams(
  searchParams: AdminCatalogSearchParams,
): ParsedAdminCatalogSearchParams {
  const parsed = adminCatalogSearchParamsSchema.parse(searchParams);

  return {
    catalogQuery: parsed.catalogQuery ?? "",
    levelId: parsed.levelId,
    subjectId: parsed.subjectId,
  };
}

export function buildAdminCatalogHref({
  catalogQuery,
  levelId,
  subjectId,
}: ParsedAdminCatalogSearchParams) {
  const params = new URLSearchParams({ tab: "catalogo" });

  if (catalogQuery) params.set("catalogQuery", catalogQuery);
  if (levelId) params.set("levelId", levelId);
  if (subjectId) params.set("subjectId", subjectId);

  return `/dashboard/admin/content?${params.toString()}`;
}
