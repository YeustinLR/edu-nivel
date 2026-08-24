import { describe, expect, it } from "vitest";

import { ResourceType } from "@/generated/prisma/enums";
import { normalizeResourceContentForStorage } from "@/modules/content/domain/resource-document";
import {
  contentAvailabilitySchema,
  parseContentEditSearchParams,
  updateLevelSchema,
  updateModuleSchema,
  updateResourceSchema,
  withContentEditMode,
  withoutContentEditMode,
} from "@/modules/content/schemas/content-edit.schema";

const updatedAt = "2026-08-01T18:30:00.000Z";

describe("content edit schema", () => {
  it("parses valid level, module and resource updates", () => {
    expect(
      updateLevelSchema.parse({
        id: "level-1",
        expectedUpdatedAt: updatedAt,
        levelNumber: "2",
        description: "  Segundo nivel  ",
        requiresSubscription: true,
      }),
    ).toMatchObject({ levelNumber: 2, description: "Segundo nivel" });

    expect(
      updateModuleSchema.parse({
        id: "module-1",
        expectedUpdatedAt: updatedAt,
        title: "  Números naturales  ",
        description: "",
        audience: "STUDENT",
      }),
    ).toMatchObject({
      title: "Números naturales",
      description: undefined,
      audience: "STUDENT",
    });

    expect(
      updateResourceSchema.parse({
        id: "resource-1",
        expectedUpdatedAt: updatedAt,
        resourceType: ResourceType.NOTE,
        title: "Lectura inicial",
        instructions: "",
        content: "Texto de la lección",
        estimatedMinutes: "12",
      }),
    ).toMatchObject({ estimatedMinutes: 12 });
  });

  it("validates and normalizes structured resource fields", () => {
    expect(
      updateResourceSchema.parse({
        id: "resource-content",
        expectedUpdatedAt: updatedAt,
        resourceType: ResourceType.NOTE,
        title: "Contenido guiado",
        instructions: "",
        content: "  Contenido educativo  ",
        estimatedMinutes: "8",
      }),
    ).toMatchObject({
      content: normalizeResourceContentForStorage("Contenido educativo"),
      estimatedMinutes: 8,
    });

    expect(
      updateResourceSchema.parse({
        id: "resource-youtube",
        expectedUpdatedAt: updatedAt,
        resourceType: ResourceType.YOUTUBE,
        title: "Video educativo",
        instructions: "",
        videoId: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        startAt: "25",
      }),
    ).toMatchObject({ videoId: "dQw4w9WgXcQ", startAt: 25 });

    expect(
      updateResourceSchema.parse({
        id: "resource-link",
        expectedUpdatedAt: updatedAt,
        resourceType: ResourceType.LINK,
        title: "Enlace educativo",
        instructions: "",
        url: "https://example.com/recurso",
        openInNewTab: true,
      }),
    ).toMatchObject({
      url: "https://example.com/recurso",
      openInNewTab: true,
    });
  });

  it("requires subtype fields and rejects unsafe resource URLs", () => {
    expect(
      updateResourceSchema.safeParse({
        id: "resource-youtube",
        expectedUpdatedAt: updatedAt,
        resourceType: ResourceType.YOUTUBE,
        title: "Video educativo",
        instructions: "",
      }).success,
    ).toBe(false);

    expect(
      updateResourceSchema.safeParse({
        id: "resource-link",
        expectedUpdatedAt: updatedAt,
        resourceType: ResourceType.LINK,
        title: "Enlace educativo",
        instructions: "",
        url: "javascript:alert(1)",
        openInNewTab: true,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid timestamps and invalid availability targets", () => {
    expect(
      updateModuleSchema.safeParse({
        id: "module-1",
        expectedUpdatedAt: "ayer",
        title: "Módulo",
        description: "",
        audience: "BOTH",
      }).success,
    ).toBe(false);
    expect(
      contentAvailabilitySchema.safeParse({
        id: "module-1",
        expectedUpdatedAt: updatedAt,
        type: "course",
        isActive: false,
      }).success,
    ).toBe(false);
  });

  it("keeps edit mode in the URL without losing catalog context", () => {
    const href = withContentEditMode(
      "/dashboard/admin/content?tab=catalogo&levelId=level-1&subjectId=subject-1",
      "subject",
    );

    expect(href).toContain("edit=subject");
    expect(href).toContain("levelId=level-1");
    expect(withoutContentEditMode(href)).not.toContain("edit=");
    expect(parseContentEditSearchParams({ edit: "resource" })).toBe(
      "resource",
    );
    expect(parseContentEditSearchParams({ edit: "unknown" })).toBeUndefined();
  });
});
