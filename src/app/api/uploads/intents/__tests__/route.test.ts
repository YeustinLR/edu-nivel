import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MAX_SERIALIZED_RESOURCE_DOCUMENT_BYTES,
  getResourceDocumentByteLength,
  normalizeResourceDocument,
  serializeResourceDocument,
} from "@/modules/content/domain/resource-document";

const mocks = vi.hoisted(() => ({ createContentUploadIntent: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/server/content/create-upload-intent", () => ({
  createContentUploadIntent: mocks.createContentUploadIntent,
}));

import { POST } from "@/app/api/uploads/intents/route";

function largeTableContent(padding: number, validate = true) {
  const rows = Array.from({ length: 100 }, (_, rowIndex) => ({
    cells: Array.from({ length: 33 }, (_, cellIndex) =>
      rowIndex === 0 && cellIndex === 0 ? "x".repeat(padding) : "",
    ),
  }));
  const document = normalizeResourceDocument([
    { id: "upload-table", type: "table", props: {}, content: { type: "tableContent", rows }, children: [] },
  ]);
  return validate ? serializeResourceDocument(document) : JSON.stringify(document);
}

function uploadBody(content: string) {
  return {
    editorSessionId: "editor-session-1",
    moduleId: "module-1",
    resourceType: "PDF",
    title: "Guía extensa",
    content,
    originalName: "guia.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1_024,
    disposition: "DRAFT",
  };
}

describe("POST /api/uploads/intents content transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createContentUploadIntent.mockResolvedValue({
      uploadId: "upload-1",
      uploadUrl: "https://upload.test",
      expiresAt: new Date("2026-08-21T23:00:00.000Z"),
    });
  });

  it("parses and preserves valid JSON close to 512 KiB", async () => {
    const content = largeTableContent(14_000);
    expect(getResourceDocumentByteLength(content)).toBeGreaterThan(
      MAX_SERIALIZED_RESOURCE_DOCUMENT_BYTES - 2_048,
    );
    const response = await POST(
      new Request("http://localhost/api/uploads/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadBody(content)),
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.createContentUploadIntent).toHaveBeenCalledWith(
      expect.objectContaining({ content }),
    );
  });

  it("rejects JSON over 512 KiB with domain validation rather than truncating it", async () => {
    const content = largeTableContent(15_000, false);
    expect(getResourceDocumentByteLength(content)).toBeGreaterThan(
      MAX_SERIALIZED_RESOURCE_DOCUMENT_BYTES,
    );
    const response = await POST(
      new Request("http://localhost/api/uploads/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadBody(content)),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.details.fieldErrors.content).toEqual([
      "El documento no puede superar 512 KiB.",
    ]);
    expect(mocks.createContentUploadIntent).not.toHaveBeenCalled();
  });
});
