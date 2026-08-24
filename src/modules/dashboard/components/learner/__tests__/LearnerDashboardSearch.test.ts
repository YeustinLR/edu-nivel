import { describe, expect, it } from "vitest";

import { filterLearnerSearchItems } from "@/modules/dashboard/components/learner/LearnerDashboardSearch";

const items = [
  { id: "l0", kind: "level" as const, label: "Primer año", context: "Primaria", keywords: ["1", "nivel 1", "1°"], href: "/explore?level=1" },
  { id: "l1", kind: "level" as const, label: "Séptimo año", context: "Secundaria", keywords: ["7", "nivel 7", "7°"], href: "/explore" },
  { id: "s1", kind: "subject" as const, label: "Matemáticas", context: "Materia · Nivel 7", href: "/matematicas" },
  { id: "m1", kind: "module" as const, label: "Ecosistemas", context: "Ciencias", href: "/ciencias" },
  { id: "r1", kind: "resource" as const, label: "Fracciones equivalentes", context: "Matemáticas · Fracciones", keywords: ["PDF", "documento"], href: "/fracciones" },
];

describe("filterLearnerSearchItems", () => {
  it("matches labels without requiring accents or exact casing", () => {
    expect(filterLearnerSearchItems(items, "MATEMATICAS").map((item) => item.id)).toEqual(["s1", "r1"]);
  });

  it("also searches the real subject/module context", () => {
    expect(filterLearnerSearchItems(items, "ciencias").map((item) => item.id)).toEqual(["m1"]);
  });

  it("finds levels in the Student catalog", () => {
    expect(filterLearnerSearchItems(items, "primer año").map((item) => item.id)).toEqual(["l0"]);
    expect(filterLearnerSearchItems(items, "septimo").map((item) => item.id)).toEqual(["l1"]);
    expect(filterLearnerSearchItems(items, "nivel 7").map((item) => item.id)).toEqual(["l1", "s1"]);
  });

  it("matches multiple words even when they are not contiguous", () => {
    expect(filterLearnerSearchItems(items, "fracciones matematicas").map((item) => item.id)).toEqual(["r1"]);
  });

  it("searches safe resource-type keywords", () => {
    expect(filterLearnerSearchItems(items, "pdf").map((item) => item.id)).toEqual(["r1"]);
  });

  it("does not invent results for an empty query", () => {
    expect(filterLearnerSearchItems(items, "   ")).toEqual([]);
  });
});
