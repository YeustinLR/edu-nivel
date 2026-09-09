import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ResourceContentRenderer } from "@/modules/content/components/editor/ResourceContentRenderer";
import {
  normalizeResourceDocument,
  serializeResourceDocument,
} from "@/modules/content/domain/resource-document";

describe("ResourceContentRenderer", () => {
  it("renders nested lists, tables and educational callouts as semantic JSX", () => {
    const content = serializeResourceDocument(
      normalizeResourceDocument([
        {
          id: "list-1",
          type: "bulletListItem",
          props: {},
          content: "Principal",
          children: [{ id: "nested", type: "numberedListItem", props: {}, content: "Anidado", children: [] }],
        },
        {
          id: "table",
          type: "table",
          props: {},
          content: { type: "tableContent", headerRows: 1, rows: [{ cells: ["Tema", "Valor"] }, { cells: ["Álgebra", "10"] }] },
          children: [],
        },
        { id: "callout", type: "eduCallout", props: { variant: "warning" }, content: "Revisa el signo", children: [] },
      ]),
    );
    const html = renderToStaticMarkup(<ResourceContentRenderer content={content} />);
    expect(html).toContain("<ul");
    expect(html).toContain("<ol");
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("Advertencia");
    expect(html).toContain("Revisa el signo");
    expect(html).not.toContain("dangerouslySetInnerHTML");
  });

  it("renders legacy content as plain text and hides invalid JSON", () => {
    expect(renderToStaticMarkup(<ResourceContentRenderer content={'<script>alert("x")</script>'} />)).toContain("&lt;script&gt;");
    const invalid = renderToStaticMarkup(<ResourceContentRenderer content={'{"format":'} />);
    expect(invalid).toContain("no se puede mostrar");
    expect(invalid).not.toContain("{&quot;format&quot;");
  });

  it("renders embedded images with semantic accessibility metadata", () => {
    const imageId = "550e8400-e29b-41d4-a716-446655440000";
    const content = serializeResourceDocument(
      normalizeResourceDocument([
        {
          id: "image",
          type: "image",
          props: {
            imageId,
            altText: "Triángulo rectángulo",
            decorative: false,
            caption: "Aplicación del teorema",
          },
          children: [],
        },
      ]),
    );
    const html = renderToStaticMarkup(<ResourceContentRenderer content={content} />);
    expect(html).toContain("<figure");
    expect(html).toContain(`src=\"/api/content-images/${imageId}/file\"`);
    expect(html).toContain('alt="Triángulo rectángulo"');
    expect(html).toContain("<figcaption>Aplicación del teorema</figcaption>");
  });

  it("renders accessible block and inline formulas with KaTeX", () => {
    const content = serializeResourceDocument(
      normalizeResourceDocument([
        {
          id: "math-block",
          type: "mathBlock",
          props: {},
          content: "\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}",
          children: [],
        },
        {
          id: "math-inline",
          type: "paragraph",
          props: {},
          content: [
            { type: "text", text: "Energía: ", styles: {} },
            { type: "math", content: "E = mc^2" },
          ],
          children: [],
        },
      ]),
    );

    const html = renderToStaticMarkup(<ResourceContentRenderer content={content} />);
    expect(html.match(/<math/g)).toHaveLength(2);
    expect(html).toContain("katex-display");
    expect(html).toContain("Energía:");
    expect(html).toContain("aria-hidden=\"true\"");
  });

  it("shows invalid LaTeX as escaped source instead of executable markup", () => {
    const content = serializeResourceDocument(
      normalizeResourceDocument([
        {
          id: "invalid-math",
          type: "mathBlock",
          props: {},
          content: "\\href{javascript:alert(1)}{<script>alert(1)</script>",
          children: [],
        },
      ]),
    );

    const html = renderToStaticMarkup(<ResourceContentRenderer content={content} />);
    expect(html).toContain("Fórmula LaTeX no válida");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript:');
  });
});
