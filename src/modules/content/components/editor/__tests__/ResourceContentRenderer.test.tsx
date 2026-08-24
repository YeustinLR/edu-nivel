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
});
