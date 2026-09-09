import { describe, expect, it } from "vitest";

import {
  MAX_RESOURCE_CONTENT_CHARACTERS,
  MAX_RESOURCE_DOCUMENT_BLOCKS,
  MAX_RESOURCE_DOCUMENT_DEPTH,
  MAX_RESOURCE_DOCUMENT_FORMULAS,
  MAX_RESOURCE_DOCUMENT_IMAGES,
  MAX_RESOURCE_FORMULA_CHARACTERS,
  MAX_SERIALIZED_RESOURCE_DOCUMENT_BYTES,
  countResourceDocumentText,
  eduCalloutVariants,
  getResourceDocumentByteLength,
  getResourceDocumentImageIds,
  legacyTextToResourceDocument,
  normalizeResourceContentForStorage,
  normalizeResourceDocument,
  parseResourceContent,
  ResourceDocumentValidationError,
  serializeResourceDocument,
  type EduNivelBlock,
  type ResourceDocumentV1,
} from "@/modules/content/domain/resource-document";

function paragraph(id: string, text = "", overrides: Partial<EduNivelBlock> = {}): EduNivelBlock {
  return {
    id,
    type: "paragraph",
    props: { backgroundColor: "default", textColor: "default", textAlignment: "left" },
    content: text ? [{ type: "text", text, styles: {} }] : [],
    children: [],
    ...overrides,
  };
}

function documentWith(blocks: EduNivelBlock[]): ResourceDocumentV1 {
  return { format: "edunivel-blocks", version: 1, blocks };
}

function expectCode(callback: () => unknown, code: ResourceDocumentValidationError["code"]) {
  try {
    callback();
    throw new Error("Se esperaba un error de documento.");
  } catch (error) {
    expect(error).toBeInstanceOf(ResourceDocumentValidationError);
    expect((error as ResourceDocumentValidationError).code).toBe(code);
  }
}

describe("resource document", () => {
  it("handles null, legacy text, valid JSON, invalid JSON and unknown versions", () => {
    expect(parseResourceContent(null).kind).toBe("empty");
    const legacy = parseResourceContent("Primera línea\nSegunda línea");
    expect(legacy.kind).toBe("legacy");
    expect(legacy.blocks).toHaveLength(2);

    const serialized = serializeResourceDocument(documentWith([paragraph("kept-id", "Hola")]));
    const parsed = parseResourceContent(serialized);
    expect(parsed.kind).toBe("document");
    expect(parsed.blocks[0].id).toBe("kept-id");
    expect(serializeResourceDocument(parsed.document!)).toBe(serialized);

    expect(parseResourceContent('{"format":').kind).toBe("invalid");
    expect(parseResourceContent('{"format":"edunivel-blocks","version":2,"blocks":[]}').kind).toBe("invalid");
    expectCode(
      () => normalizeResourceContentForStorage('{"format":"edunivel-blocks","version":2,"blocks":[]}'),
      "UNKNOWN_VERSION",
    );
  });

  it("canonicalizes legacy text deterministically and stores semantic emptiness as null", () => {
    const first = normalizeResourceContentForStorage("  Texto anterior  ");
    const second = normalizeResourceContentForStorage("Texto anterior");
    expect(first).toBe(second);
    expect(parseResourceContent(first).blocks[0].content).toEqual([
      { type: "text", text: "Texto anterior", styles: {} },
    ]);
    expect(normalizeResourceContentForStorage("   ")).toBeNull();
    expect(normalizeResourceContentForStorage(serializeResourceDocument(documentWith([paragraph("empty")])))).toBeNull();
  });

  it("removes unknown props and styles and only keeps HTTP(S) links", () => {
    const normalized = normalizeResourceDocument([
      {
        id: "p1",
        type: "heading",
        props: { level: 6, textAlignment: "center", fontFamily: "Comic Sans", textColor: "pink" },
        content: [
          { type: "text", text: "Título", styles: { bold: true, fontSize: 72, textColor: "purple" } },
          { type: "link", href: "javascript:alert(1)", content: [{ type: "text", text: "inseguro", styles: {} }] },
          { type: "link", href: "https://example.com/a", content: [{ type: "text", text: "seguro", styles: { underline: true } }] },
        ],
        children: [],
      },
    ]);
    expect(normalized.blocks[0].props).toEqual({
      backgroundColor: "default",
      textColor: "default",
      textAlignment: "center",
      level: 3,
    });
    expect(normalized.blocks[0].content).toEqual([
      { type: "text", text: "Título", styles: { bold: true, textColor: "purple" } },
      { type: "text", text: "inseguro", styles: {} },
      { type: "link", href: "https://example.com/a", content: [{ type: "text", text: "seguro", styles: { underline: true } }] },
    ]);
  });

  it("counts only visible Unicode text, including tables and callouts", () => {
    const document = normalizeResourceDocument([
      paragraph("emoji", "😀"),
      { id: "callout", type: "eduCallout", props: { variant: "keyIdea", ignored: "metadata" }, content: "Idea", children: [] },
      {
        id: "table",
        type: "table",
        props: {},
        content: { type: "tableContent", rows: [{ cells: ["A", "B"] }] },
        children: [],
      },
    ]);
    expect(countResourceDocumentText(document)).toBe(7);
  });

  it("accepts exactly 50 000 Unicode characters and rejects the next one", () => {
    const exact = documentWith([paragraph("exact", "😀".repeat(MAX_RESOURCE_CONTENT_CHARACTERS))]);
    expect(() => serializeResourceDocument(exact)).not.toThrow();
    const over = documentWith([paragraph("over", "😀".repeat(MAX_RESOURCE_CONTENT_CHARACTERS + 1))]);
    expectCode(() => serializeResourceDocument(over), "TEXT_LIMIT");
  });

  it("enforces 1 000 blocks and eight nesting levels", () => {
    const exactBlocks = Array.from({ length: MAX_RESOURCE_DOCUMENT_BLOCKS }, (_, index) => paragraph(`p-${index}`));
    expect(() => serializeResourceDocument(documentWith(exactBlocks))).not.toThrow();
    expectCode(
      () => serializeResourceDocument(documentWith([...exactBlocks, paragraph("extra")])),
      "BLOCK_LIMIT",
    );

    let depthEight = paragraph("depth-8", "fin");
    for (let depth = MAX_RESOURCE_DOCUMENT_DEPTH - 1; depth >= 1; depth -= 1) {
      depthEight = paragraph(`depth-${depth}`, "", { children: [depthEight] });
    }
    expect(() => serializeResourceDocument(documentWith([depthEight]))).not.toThrow();
    const depthNine = paragraph("depth-0", "", { children: [depthEight] });
    expectCode(() => serializeResourceDocument(documentWith([depthNine])), "DEPTH_LIMIT");
  });

  it("enforces the UTF-8 serialized byte limit independently from string.length", () => {
    const rows = Array.from({ length: 100 }, () => ({
      cells: Array.from({ length: 50 }, () => ""),
    }));
    const oversized = normalizeResourceDocument([
      { id: "large-table", type: "table", props: {}, content: { type: "tableContent", rows }, children: [] },
    ]);
    const raw = JSON.stringify(oversized);
    expect(getResourceDocumentByteLength(raw)).toBeGreaterThan(MAX_SERIALIZED_RESOURCE_DOCUMENT_BYTES);
    expectCode(() => serializeResourceDocument(oversized), "BYTE_LIMIT");
    expect(getResourceDocumentByteLength("😀")).toBe(4);
  });

  it("supports and controls all four educational callout variants", () => {
    const document = normalizeResourceDocument(
      eduCalloutVariants.map((variant) => ({ id: variant, type: "eduCallout", props: { variant, color: "custom" }, content: variant, children: [] })),
    );
    expect(document.blocks.map((block) => block.props)).toEqual(
      eduCalloutVariants.map((variant) => ({ variant })),
    );
    const fallback = normalizeResourceDocument([
      { id: "fallback", type: "eduCallout", props: { variant: "danger" }, content: "Nota", children: [] },
    ]);
    expect(fallback.blocks[0].props).toEqual({ variant: "note" });
  });

  it("normalizes accessible embedded images and collects their identifiers", () => {
    const imageId = "550e8400-e29b-41d4-a716-446655440000";
    const document = normalizeResourceDocument([
      {
        id: "image-block",
        type: "image",
        props: {
          imageId,
          altText: "  Diagrama del sistema solar  ",
          decorative: false,
          caption: "  Órbitas principales  ",
          textAlignment: "center",
          previewWidth: 720,
          externalUrl: "https://example.com/not-allowed.png",
        },
        children: [],
      },
    ]);
    expect(document.blocks[0].props).toEqual({
      imageId,
      altText: "Diagrama del sistema solar",
      decorative: false,
      caption: "Órbitas principales",
      textAlignment: "center",
      previewWidth: 720,
    });
    expect(getResourceDocumentImageIds(document)).toEqual([imageId]);
    expect(countResourceDocumentText(document)).toBe(45);
  });

  it("requires alt text or an explicit decorative choice and limits images", () => {
    const makeImage = (index: number) => ({
      id: `image-${index}`,
      type: "image" as const,
      props: {
        imageId: `550e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}`,
        altText: "",
        decorative: true,
      },
      children: [],
    });
    expectCode(
      () =>
        normalizeResourceDocument([
          {
            ...makeImage(1),
            props: { ...makeImage(1).props, decorative: false },
          },
        ]),
      "IMAGE_ACCESSIBILITY",
    );
    expect(() =>
      normalizeResourceDocument(
        Array.from({ length: MAX_RESOURCE_DOCUMENT_IMAGES }, (_, index) =>
          makeImage(index),
        ),
      ),
    ).not.toThrow();
    expectCode(
      () =>
        normalizeResourceDocument(
          Array.from(
            { length: MAX_RESOURCE_DOCUMENT_IMAGES + 1 },
            (_, index) => makeImage(index),
          ),
        ),
      "IMAGE_LIMIT",
    );
  });

  it("normalizes block and inline LaTeX formulas and counts their source", () => {
    const document = normalizeResourceDocument([
      {
        id: "formula-block",
        type: "mathBlock",
        props: { unsafe: "removed" },
        content: "  \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}  ",
        children: [],
      },
      {
        id: "formula-inline",
        type: "paragraph",
        props: {},
        content: [
          { type: "text", text: "Einstein: ", styles: {} },
          { type: "math", content: "  E = mc^2  ", ignored: true },
        ],
        children: [],
      },
    ]);

    expect(document.blocks[0]).toMatchObject({
      type: "mathBlock",
      props: {},
      content: "\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}",
    });
    expect(document.blocks[1].content).toEqual([
      { type: "text", text: "Einstein: ", styles: {} },
      { type: "math", content: "E = mc^2" },
    ]);
    expect(countResourceDocumentText(document)).toBe(
      Array.from("\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}Einstein: E = mc^2").length,
    );
    expect(normalizeResourceContentForStorage(serializeResourceDocument(document))).not.toBeNull();
  });

  it("limits formula length and quantity without rejecting an empty draft formula", () => {
    expect(() =>
      normalizeResourceDocument([
        { id: "empty-math", type: "mathBlock", props: {}, content: "", children: [] },
      ]),
    ).not.toThrow();
    expect(
      normalizeResourceContentForStorage(
        serializeResourceDocument(
          normalizeResourceDocument([
            { id: "empty-math", type: "mathBlock", props: {}, content: "", children: [] },
          ]),
        ),
      ),
    ).toBeNull();
    expectCode(
      () =>
        normalizeResourceDocument([
          {
            id: "long-math",
            type: "mathBlock",
            props: {},
            content: "x".repeat(MAX_RESOURCE_FORMULA_CHARACTERS + 1),
            children: [],
          },
        ]),
      "INVALID_FORMULA",
    );
    expectCode(
      () =>
        normalizeResourceDocument([
          {
            id: "many-math",
            type: "paragraph",
            props: {},
            content: Array.from(
              { length: MAX_RESOURCE_DOCUMENT_FORMULAS + 1 },
              () => ({ type: "math", content: "x" }),
            ),
            children: [],
          },
        ]),
      "FORMULA_LIMIT",
    );
  });

  it("preserves stable IDs through canonical round trips", () => {
    const legacy = legacyTextToResourceDocument("Uno\nDos");
    const first = serializeResourceDocument(legacy);
    const second = serializeResourceDocument(parseResourceContent(first).document!);
    expect(second).toBe(first);
    expect(parseResourceContent(second).blocks.map((block) => block.id)).toEqual(
      legacy.blocks.map((block) => block.id),
    );
  });
});
