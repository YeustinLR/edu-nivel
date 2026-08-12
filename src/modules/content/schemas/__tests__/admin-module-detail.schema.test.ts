import { describe, expect, it } from "vitest";

import {
  ContentAudience,
  PublicationStatus,
} from "@/generated/prisma/enums";
import {
  buildAdminModuleDetailHref,
  parseAdminModuleDetailSearchParams,
  preserveLiveAdminModuleDetailHref,
} from "@/modules/content/schemas/admin-module-detail.schema";

describe("admin module detail search params", () => {
  it("applies safe defaults to absent or invalid values", () => {
    expect(
      parseAdminModuleDetailSearchParams({
        moduleId: [],
        detailTab: "unknown",
        resourcePage: "0",
        resourceId: "x".repeat(129),
      }),
    ).toEqual({
      moduleId: undefined,
      detailTab: "informacion",
      resourcePage: 1,
      resourceId: undefined,
    });
  });

  it("parses a valid resource selection", () => {
    expect(
      parseAdminModuleDetailSearchParams({
        moduleId: "module-1",
        detailTab: "recursos",
        resourcePage: "3",
        resourceId: "resource-1",
      }),
    ).toEqual({
      moduleId: "module-1",
      detailTab: "recursos",
      resourcePage: 3,
      resourceId: "resource-1",
    });
  });

  it("preserves catalog and module filters when opening a resource", () => {
    const href = buildAdminModuleDetailHref({
      catalogQuery: "primer nivel",
      levelId: "level-1",
      subjectId: "subject-1",
      moduleQuery: "operaciones",
      moduleStatus: PublicationStatus.IN_REVIEW,
      moduleAudience: ContentAudience.BOTH,
      moduleAuthorId: "author-1",
      modulePage: 2,
      moduleId: "module-1",
      detailTab: "recursos",
      resourcePage: 3,
      resourceId: "resource-1",
    });
    const url = new URL(href, "https://edunivel.test");

    expect(url.pathname).toBe("/dashboard/admin/content");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      tab: "catalogo",
      catalogQuery: "primer nivel",
      levelId: "level-1",
      subjectId: "subject-1",
      moduleQuery: "operaciones",
      moduleStatus: PublicationStatus.IN_REVIEW,
      moduleAudience: ContentAudience.BOTH,
      moduleAuthorId: "author-1",
      modulePage: "2",
      moduleId: "module-1",
      detailTab: "recursos",
      resourcePage: "3",
      resourceId: "resource-1",
    });
  });

  it("opens module information without carrying resource-only parameters", () => {
    const href = buildAdminModuleDetailHref({
      catalogQuery: "",
      levelId: "level-1",
      subjectId: "subject-1",
      moduleQuery: "",
      moduleStatus: undefined,
      moduleAudience: undefined,
      moduleAuthorId: undefined,
      modulePage: 1,
      moduleId: "module-1",
      detailTab: "informacion",
      resourcePage: 4,
      resourceId: "resource-1",
    });
    const url = new URL(href, "https://edunivel.test");

    expect(url.searchParams.get("moduleId")).toBe("module-1");
    expect(url.searchParams.has("detailTab")).toBe(false);
    expect(url.searchParams.has("resourcePage")).toBe(false);
    expect(url.searchParams.has("resourceId")).toBe(false);
  });

  it("preserves the live resource tab when opening a contextual action", () => {
    const href = preserveLiveAdminModuleDetailHref(
      "/dashboard/admin/content?tab=catalogo&levelId=level-1&subjectId=subject-1&moduleId=module-1&create=resource",
      new URLSearchParams({
        tab: "catalogo",
        levelId: "level-1",
        subjectId: "subject-1",
        moduleId: "module-1",
        detailTab: "recursos",
        resourcePage: "3",
        resourceId: "resource-1",
      }),
    );
    const url = new URL(href, "https://edunivel.test");

    expect(url.searchParams.get("create")).toBe("resource");
    expect(url.searchParams.get("detailTab")).toBe("recursos");
    expect(url.searchParams.get("resourcePage")).toBe("3");
    expect(url.searchParams.get("resourceId")).toBe("resource-1");
  });

  it("removes resource-only state when the live tab is review", () => {
    const href = preserveLiveAdminModuleDetailHref(
      "/dashboard/admin/content?tab=catalogo&moduleId=module-1&detailTab=recursos&resourcePage=2&resourceId=resource-1&edit=module",
      new URLSearchParams({
        tab: "catalogo",
        moduleId: "module-1",
        detailTab: "revision",
        resourcePage: "4",
        resourceId: "resource-2",
      }),
    );
    const url = new URL(href, "https://edunivel.test");

    expect(url.searchParams.get("edit")).toBe("module");
    expect(url.searchParams.get("detailTab")).toBe("revision");
    expect(url.searchParams.has("resourcePage")).toBe(false);
    expect(url.searchParams.has("resourceId")).toBe(false);
  });

  it("does not merge state from a different module", () => {
    const href =
      "/dashboard/admin/content?tab=catalogo&moduleId=module-1&edit=module";

    expect(
      preserveLiveAdminModuleDetailHref(
        href,
        new URLSearchParams({
          tab: "catalogo",
          moduleId: "module-2",
          detailTab: "revision",
        }),
      ),
    ).toBe(href);
  });
});
