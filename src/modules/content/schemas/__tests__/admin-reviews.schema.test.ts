import { describe, expect, it } from "vitest";

import {
  ContentAudience,
  ResourceType,
} from "@/generated/prisma/enums";
import {
  buildAdminReviewsHref,
  parseAdminReviewSearchParams,
} from "@/modules/content/schemas/admin-reviews.schema";

describe("admin review search params", () => {
  it("applies safe defaults to absent or invalid values", () => {
    expect(
      parseAdminReviewSearchParams({
        reviewKind: "unknown",
        reviewAudience: "unknown",
        reviewResourceType: "unknown",
        reviewPage: "0",
      }),
    ).toEqual({
      reviewKind: "resources",
      reviewQuery: "",
      reviewAuthorId: undefined,
      reviewAudience: undefined,
      reviewResourceType: undefined,
      reviewPage: 1,
      reviewId: undefined,
    });
  });

  it("parses supported review filters", () => {
    expect(
      parseAdminReviewSearchParams({
        reviewKind: "resources",
        reviewQuery: "  fracciones  ",
        reviewAuthorId: "author-1",
        reviewAudience: ContentAudience.STUDENT,
        reviewResourceType: ResourceType.PDF,
        reviewPage: "3",
        reviewId: "resource-1",
      }),
    ).toEqual({
      reviewKind: "resources",
      reviewQuery: "fracciones",
      reviewAuthorId: "author-1",
      reviewAudience: ContentAudience.STUDENT,
      reviewResourceType: ResourceType.PDF,
      reviewPage: 3,
      reviewId: "resource-1",
    });
  });

  it("serializes only filters supported by the selected queue", () => {
    const href = buildAdminReviewsHref({
      reviewKind: "modules",
      reviewQuery: "álgebra",
      reviewAuthorId: "author-1",
      reviewAudience: ContentAudience.BOTH,
      reviewResourceType: ResourceType.IMAGE,
      reviewPage: 2,
      reviewId: "module-1",
    });
    const url = new URL(href, "https://edunivel.test");

    expect(url.pathname).toBe("/dashboard/admin/content");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      tab: "revisiones",
      reviewKind: "modules",
      reviewQuery: "álgebra",
      reviewAuthorId: "author-1",
      reviewAudience: ContentAudience.BOTH,
      reviewPage: "2",
      reviewId: "module-1",
    });
    expect(url.searchParams.has("reviewResourceType")).toBe(false);
  });
});
