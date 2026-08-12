import { describe, expect, it } from "vitest";

import {
  createUploadFingerprint,
  formatUploadSize,
  getLocalLinkPreview,
  isResourceAttachmentReady,
  normalizeYoutubeUrl,
  validateUploadFile,
} from "@/modules/content/domain/resource-attachment";

const baseReadiness = {
  moduleId: "module-1",
  title: "Recurso de prueba",
  description: "",
  youtubeUrl: "",
  linkUrl: "",
  file: null,
  lessonContent: "",
  estimatedMinutes: "",
  didacticContent: "",
  objective: "",
};

describe("resource attachment helpers", () => {
  it("accepts supported PDF and image policies", () => {
    expect(
      validateUploadFile({
        name: "guia.pdf",
        type: "application/pdf",
        size: 50 * 1024 * 1024,
      }),
    ).toMatchObject({ success: true, data: { resourceType: "PDF" } });

    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(
        validateUploadFile({
          name: "imagen",
          type,
          size: 10 * 1024 * 1024,
        }),
      ).toMatchObject({ success: true, data: { resourceType: "IMAGE" } });
    }
  });

  it("rejects unsupported and oversized files", () => {
    expect(
      validateUploadFile({
        name: "audio.mp3",
        type: "audio/mpeg",
        size: 1_000,
      }).success,
    ).toBe(false);
    expect(
      validateUploadFile({
        name: "grande.png",
        type: "image/png",
        size: 10 * 1024 * 1024 + 1,
      }).success,
    ).toBe(false);
  });

  it("requires a YouTube URL instead of a raw video id", () => {
    expect(
      normalizeYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
    expect(normalizeYoutubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(
      normalizeYoutubeUrl("https://youtube.com/embed/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
    expect(
      normalizeYoutubeUrl(
        "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      ),
    ).toBe("dQw4w9WgXcQ");
    expect(normalizeYoutubeUrl("dQw4w9WgXcQ")).toBeNull();
    expect(normalizeYoutubeUrl("https://example.com/video")).toBeNull();
  });

  it("builds local previews only for HTTP and HTTPS links", () => {
    expect(getLocalLinkPreview("https://www.example.com/recurso")).toEqual({
      hostname: "example.com",
      url: "https://www.example.com/recurso",
    });
    expect(getLocalLinkPreview("javascript:alert(1)")).toBeNull();
  });

  it("keeps creation disabled until the selected type is complete", () => {
    expect(
      isResourceAttachmentReady({ ...baseReadiness, attachment: null }),
    ).toBe(true);
    expect(
      isResourceAttachmentReady({
        ...baseReadiness,
        attachment: null,
        title: "",
      }),
    ).toBe(false);
    expect(
      isResourceAttachmentReady({
        ...baseReadiness,
        attachment: "YOUTUBE",
        youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
      }),
    ).toBe(true);
    expect(
      isResourceAttachmentReady({
        ...baseReadiness,
        attachment: "LESSON",
        lessonContent: "Contenido",
        estimatedMinutes: "0",
      }),
    ).toBe(false);
    expect(
      isResourceAttachmentReady({
        ...baseReadiness,
        attachment: "DIDACTIC",
        didacticContent: "Actividad",
      }),
    ).toBe(true);
  });

  it("changes the upload fingerprint when submitted data changes", () => {
    const input = {
      moduleId: "module-1",
      title: "Guía",
      description: "Práctica",
      file: { name: "guia.pdf", type: "application/pdf", size: 1_024 },
    };
    expect(createUploadFingerprint(input)).not.toBe(
      createUploadFingerprint({ ...input, title: "Otra guía" }),
    );
    expect(formatUploadSize(1_048_576)).toBe("1.0 MB");
  });
});
