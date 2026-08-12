import { z } from "zod";

import {
  ContentAudience,
  ResourceType,
} from "@/generated/prisma/enums";

export const ADMIN_REVIEW_PAGE_SIZE = 10;

export const adminReviewKinds = ["modules", "resources"] as const;
export type AdminReviewKind = (typeof adminReviewKinds)[number];

export type AdminReviewSearchParams = {
  reviewKind?: string | string[];
  reviewQuery?: string | string[];
  reviewAuthorId?: string | string[];
  reviewAudience?: string | string[];
  reviewResourceType?: string | string[];
  reviewPage?: string | string[];
  reviewId?: string | string[];
};

const singleString = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const optionalString = (maximum: number) =>
  z
    .preprocess(
      singleString,
      z.string().trim().min(1).max(maximum).optional(),
    )
    .catch(undefined);

const reviewKindParameter = z
  .preprocess(singleString, z.enum(adminReviewKinds).optional())
  .catch(undefined);

const audienceParameter = z
  .preprocess(singleString, z.nativeEnum(ContentAudience).optional())
  .catch(undefined);

const resourceTypeParameter = z
  .preprocess(singleString, z.nativeEnum(ResourceType).optional())
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

export const adminReviewSearchParamsSchema = z.object({
  reviewKind: reviewKindParameter,
  reviewQuery: optionalString(100),
  reviewAuthorId: optionalString(128),
  reviewAudience: audienceParameter,
  reviewResourceType: resourceTypeParameter,
  reviewPage: pageParameter,
  reviewId: optionalString(128),
});

export type ParsedAdminReviewSearchParams = {
  reviewKind: AdminReviewKind;
  reviewQuery: string;
  reviewAuthorId?: string;
  reviewAudience?: ContentAudience;
  reviewResourceType?: ResourceType;
  reviewPage: number;
  reviewId?: string;
};

export function parseAdminReviewSearchParams(
  searchParams: AdminReviewSearchParams,
): ParsedAdminReviewSearchParams {
  const parsed = adminReviewSearchParamsSchema.parse(searchParams);

  return {
    reviewKind: parsed.reviewKind ?? "resources",
    reviewQuery: parsed.reviewQuery ?? "",
    reviewAuthorId: parsed.reviewAuthorId,
    reviewAudience: parsed.reviewAudience,
    reviewResourceType: parsed.reviewResourceType,
    reviewPage: parsed.reviewPage,
    reviewId: parsed.reviewId,
  };
}

export function buildAdminReviewsHref(
  state: ParsedAdminReviewSearchParams,
) {
  const params = new URLSearchParams({
    tab: "revisiones",
    reviewKind: state.reviewKind,
  });

  if (state.reviewQuery) params.set("reviewQuery", state.reviewQuery);
  if (state.reviewAuthorId) {
    params.set("reviewAuthorId", state.reviewAuthorId);
  }
  if (state.reviewAudience) {
    params.set("reviewAudience", state.reviewAudience);
  }
  if (state.reviewKind === "resources" && state.reviewResourceType) {
    params.set("reviewResourceType", state.reviewResourceType);
  }
  if (state.reviewPage > 1) {
    params.set("reviewPage", String(state.reviewPage));
  }
  if (state.reviewId) params.set("reviewId", state.reviewId);

  return `/dashboard/admin/content?${params.toString()}`;
}
