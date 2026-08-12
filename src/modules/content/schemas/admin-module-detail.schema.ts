import { z } from "zod";

import type { ParsedAdminModuleSearchParams } from "@/modules/content/schemas/admin-modules.schema";
import type { ParsedAdminCatalogSearchParams } from "@/modules/content/schemas/admin-catalog.schema";

export const ADMIN_DETAIL_RESOURCE_PAGE_SIZE = 8;

export const adminModuleDetailTabs = [
  "informacion",
  "recursos",
  "revision",
] as const;

export type AdminModuleDetailTab = (typeof adminModuleDetailTabs)[number];

export type AdminModuleDetailSearchParams = {
  moduleId?: string | string[];
  detailTab?: string | string[];
  resourcePage?: string | string[];
  resourceId?: string | string[];
};

const singleString = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const moduleIdParameter = z
  .preprocess(
    singleString,
    z.string().trim().min(1).max(128).optional(),
  )
  .catch(undefined);

const resourceIdParameter = z
  .preprocess(
    singleString,
    z.string().trim().min(1).max(128).optional(),
  )
  .catch(undefined);

const detailTabParameter = z
  .preprocess(singleString, z.enum(adminModuleDetailTabs).optional())
  .catch(undefined);

const resourcePageParameter = z
  .preprocess(
    (value) => {
      const singleValue = singleString(value);
      return singleValue ? Number(singleValue) : 1;
    },
    z.number().int().min(1).max(100_000),
  )
  .catch(1);

export const adminModuleDetailSearchParamsSchema = z.object({
  moduleId: moduleIdParameter,
  detailTab: detailTabParameter,
  resourcePage: resourcePageParameter,
  resourceId: resourceIdParameter,
});

export type ParsedAdminModuleDetailSearchParams = {
  moduleId?: string;
  detailTab: AdminModuleDetailTab;
  resourcePage: number;
  resourceId?: string;
};

export function parseAdminModuleDetailSearchParams(
  searchParams: AdminModuleDetailSearchParams,
): ParsedAdminModuleDetailSearchParams {
  const parsed = adminModuleDetailSearchParamsSchema.parse(searchParams);

  return {
    moduleId: parsed.moduleId,
    detailTab: parsed.detailTab ?? "informacion",
    resourcePage: parsed.resourcePage,
    resourceId: parsed.resourceId,
  };
}

export type AdminModuleDetailUrlState = ParsedAdminCatalogSearchParams &
  ParsedAdminModuleSearchParams & {
    moduleId: string;
    detailTab: AdminModuleDetailTab;
    resourcePage: number;
    resourceId?: string;
  };

type SearchParamReader = {
  get(name: string): string | null;
};

export function preserveLiveAdminModuleDetailHref(
  href: string,
  currentSearchParams: SearchParamReader,
) {
  const [pathname, query = ""] = href.split("?", 2);
  const targetParams = new URLSearchParams(query);
  const targetModuleId = targetParams.get("moduleId");

  if (
    !targetModuleId ||
    targetModuleId !== currentSearchParams.get("moduleId")
  ) {
    return href;
  }

  const currentTab = currentSearchParams.get("detailTab") ?? "informacion";

  if (currentTab === "informacion") {
    targetParams.delete("detailTab");
  } else {
    targetParams.set("detailTab", currentTab);
  }

  if (currentTab === "recursos") {
    for (const key of ["resourcePage", "resourceId"] as const) {
      const value = currentSearchParams.get(key);

      if (value) targetParams.set(key, value);
      else targetParams.delete(key);
    }
  } else {
    targetParams.delete("resourcePage");
    targetParams.delete("resourceId");
  }

  return `${pathname}?${targetParams.toString()}`;
}

export function buildAdminModuleDetailHref(
  state: AdminModuleDetailUrlState,
) {
  const params = new URLSearchParams({ tab: "catalogo" });

  if (state.catalogQuery) params.set("catalogQuery", state.catalogQuery);
  if (state.levelId) params.set("levelId", state.levelId);
  if (state.subjectId) params.set("subjectId", state.subjectId);
  if (state.moduleQuery) params.set("moduleQuery", state.moduleQuery);
  if (state.moduleStatus) params.set("moduleStatus", state.moduleStatus);
  if (state.moduleAudience) {
    params.set("moduleAudience", state.moduleAudience);
  }
  if (state.moduleAuthorId) {
    params.set("moduleAuthorId", state.moduleAuthorId);
  }
  if (state.modulePage > 1) {
    params.set("modulePage", String(state.modulePage));
  }

  params.set("moduleId", state.moduleId);
  if (state.detailTab !== "informacion") {
    params.set("detailTab", state.detailTab);
  }
  if (state.detailTab === "recursos" && state.resourcePage > 1) {
    params.set("resourcePage", String(state.resourcePage));
  }
  if (state.detailTab === "recursos" && state.resourceId) {
    params.set("resourceId", state.resourceId);
  }

  return `/dashboard/admin/content?${params.toString()}`;
}
