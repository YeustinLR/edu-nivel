import { z } from "zod";

import {
  ContentAudience,
  PublicationStatus,
} from "@/generated/prisma/enums";
import type { ParsedAdminCatalogSearchParams } from "@/modules/content/schemas/admin-catalog.schema";

export const ADMIN_MODULE_PAGE_SIZE = 10;

export type AdminModuleSearchParams = {
  moduleQuery?: string | string[];
  moduleStatus?: string | string[];
  moduleAudience?: string | string[];
  moduleAuthorId?: string | string[];
  modulePage?: string | string[];
};

const singleString = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const optionalQueryParameter = z
  .preprocess(singleString, z.string().trim().max(100).optional())
  .catch(undefined);

const optionalIdParameter = z
  .preprocess(
    singleString,
    z.string().trim().min(1).max(128).optional(),
  )
  .catch(undefined);

const optionalStatusParameter = z
  .preprocess(singleString, z.nativeEnum(PublicationStatus).optional())
  .catch(undefined);

const optionalAudienceParameter = z
  .preprocess(singleString, z.nativeEnum(ContentAudience).optional())
  .catch(undefined);

const pageParameter = z
  .preprocess(
    (value) => {
      const singleValue = singleString(value);
      return singleValue ? Number(singleValue) : 1;
    },
    z.number().int().min(1).max(100_000),
  )
  .catch(1);

export const adminModuleSearchParamsSchema = z.object({
  moduleQuery: optionalQueryParameter,
  moduleStatus: optionalStatusParameter,
  moduleAudience: optionalAudienceParameter,
  moduleAuthorId: optionalIdParameter,
  modulePage: pageParameter,
});

export type ParsedAdminModuleSearchParams = {
  moduleQuery: string;
  moduleStatus?: PublicationStatus;
  moduleAudience?: ContentAudience;
  moduleAuthorId?: string;
  modulePage: number;
};

export type AdminModulesUrlState = ParsedAdminCatalogSearchParams &
  ParsedAdminModuleSearchParams;

export function parseAdminModuleSearchParams(
  searchParams: AdminModuleSearchParams,
): ParsedAdminModuleSearchParams {
  const parsed = adminModuleSearchParamsSchema.parse(searchParams);

  return {
    moduleQuery: parsed.moduleQuery ?? "",
    moduleStatus: parsed.moduleStatus,
    moduleAudience: parsed.moduleAudience,
    moduleAuthorId: parsed.moduleAuthorId,
    modulePage: parsed.modulePage,
  };
}

export function buildAdminModulesHref(state: AdminModulesUrlState) {
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

  return `/dashboard/admin/content?${params.toString()}`;
}
