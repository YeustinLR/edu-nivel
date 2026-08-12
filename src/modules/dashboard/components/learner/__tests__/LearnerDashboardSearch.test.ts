import { describe, expect, it } from "vitest";

import { filterLearnerSearchItems } from "@/modules/dashboard/components/learner/LearnerDashboardSearch";

const items = [
  { id: "s1", kind: "subject" as const, label: "Matemáticas", context: "Materia · Nivel 7", href: "/matematicas" },
  { id: "m1", kind: "module" as const, label: "Ecosistemas", context: "Ciencias", href: "/ciencias" },
  { id: "r1", kind: "resource" as const, label: "Fracciones equivalentes", context: "Matemáticas · Fracciones", href: "/fracciones" },
];

describe("filterLearnerSearchItems", () => {
  it("matches labels without requiring accents or exact casing", () => {
    expect(filterLearnerSearchItems(items, "MATEMATICAS").map((item) => item.id)).toEqual(["s1", "r1"]);
  });

  it("also searches the real subject/module context", () => {
    expect(filterLearnerSearchItems(items, "ciencias").map((item) => item.id)).toEqual(["m1"]);
  });

  it("does not invent results for an empty query", () => {
    expect(filterLearnerSearchItems(items, "   ")).toEqual([]);
  });
});
