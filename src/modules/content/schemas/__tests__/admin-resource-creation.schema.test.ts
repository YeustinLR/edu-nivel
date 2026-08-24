import { describe, expect, it } from "vitest";

import { ResourceType } from "@/generated/prisma/enums";
import {
  createAdminStructuredResourceSchema,
  getAdminStructuredResourceFormValues,
  normalizeYoutubeVideoId,
  withCreatedResourceSelection,
} from "@/modules/content/schemas/admin-resource-creation.schema";

const requestId = "734790ea-f53c-4f2c-a70c-22f13683c6f1";

function base(resourceType: ResourceType) {
  return {
    requestId,
    moduleId: "module-1",
    resourceType,
    title: "Recurso educativo",
    instructions: "Sigue los pasos indicados",
    content: "Contenido educativo",
    estimatedMinutes: "15",
    disposition: "DRAFT",
  };
}

describe("admin resource creation schema", () => {
  it("normalizes the supported YouTube URL formats", () => {
    const id = "dQw4w9WgXcQ";

    expect(normalizeYoutubeVideoId(id)).toBe(id);
    expect(
      normalizeYoutubeVideoId(`https://www.youtube.com/watch?v=${id}&t=20`),
    ).toBe(id);
    expect(normalizeYoutubeVideoId(`https://youtu.be/${id}`)).toBe(id);
    expect(normalizeYoutubeVideoId(`https://youtube.com/embed/${id}`)).toBe(
      id,
    );
    expect(
      normalizeYoutubeVideoId(`https://www.youtube-nocookie.com/embed/${id}`),
    ).toBe(id);
    expect(normalizeYoutubeVideoId(`https://youtube.com/shorts/${id}`)).toBe(
      id,
    );
    expect(normalizeYoutubeVideoId("https://example.com/video")).toBeNull();
  });

  it("accepts each structured resource type", () => {
    expect(
      createAdminStructuredResourceSchema.parse({
        ...base(ResourceType.NOTE),
      }),
    ).toMatchObject({ resourceType: ResourceType.NOTE });

    expect(
      createAdminStructuredResourceSchema.parse({
        ...base(ResourceType.YOUTUBE),
        videoId: "dQw4w9WgXcQ",
        startAt: "20",
      }),
    ).toMatchObject({
      resourceType: ResourceType.YOUTUBE,
      startAt: 20,
    });

    expect(
      createAdminStructuredResourceSchema.parse({
        ...base(ResourceType.LINK),
        url: "https://example.com/recurso",
        openInNewTab: true,
      }),
    ).toMatchObject({
      resourceType: ResourceType.LINK,
      url: "https://example.com/recurso",
    });
  });

  it("accepts a resource with only a title", () => {
    expect(
      createAdminStructuredResourceSchema.parse({
        ...base(ResourceType.NOTE),
        description: "",
        content: "",
        estimatedMinutes: "",
      }),
    ).toMatchObject({
      resourceType: ResourceType.NOTE,
      title: "Recurso educativo",
      content: undefined,
      estimatedMinutes: undefined,
    });
  });

  it("rejects unsupported types and unsafe URLs", () => {
    expect(
      createAdminStructuredResourceSchema.safeParse({
        ...base(ResourceType.PDF),
      }).success,
    ).toBe(false);

    expect(
      createAdminStructuredResourceSchema.safeParse({
        ...base(ResourceType.LINK),
        url: "javascript:alert(1)",
        openInNewTab: true,
      }).success,
    ).toBe(false);
  });

  it("extracts and normalizes browser form values", () => {
    const formData = new FormData();
    formData.set("requestId", requestId);
    formData.set("moduleId", "module-1");
    formData.set("resourceType", ResourceType.YOUTUBE);
    formData.set("title", "Video");
    formData.set("content", "Explicación del video");
    formData.set("disposition", "PUBLISH");
    formData.set(
      "videoId",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    formData.set("startAt", "30");

    expect(getAdminStructuredResourceFormValues(formData)).toMatchObject({
      videoId: "dQw4w9WgXcQ",
      content: "Explicación del video",
      startAt: "30",
      openInNewTab: false,
    });
  });

  it("opens the canonical page for the created resource", () => {
    expect(
      withCreatedResourceSelection(
        "/dashboard/admin/content?tab=catalogo&levelId=level-1&subjectId=subject-1&moduleId=module-1&create=resource",
        "resource-1",
      ),
    ).toBe("/dashboard/admin/content/resources/resource-1");
  });
});
