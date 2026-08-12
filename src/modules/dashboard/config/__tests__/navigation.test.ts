import { describe, expect, it } from "vitest";

import { navigationByRole } from "@/modules/dashboard/config/navigation";

function linksFor(role: keyof typeof navigationByRole) {
  return navigationByRole[role].flatMap((group) => group.items).map((item) => ({
    label: item.label,
    href: item.href,
  }));
}

describe("learner dashboard navigation", () => {
  it("provides the complete teacher library navigation", () => {
    expect(linksFor("TEACHER")).toEqual([
      { label: "Inicio", href: "/dashboard/teacher" },
      { label: "Materias", href: "/dashboard/teacher/content" },
      { label: "Explorar", href: "/dashboard/teacher/explore" },
      { label: "Recientes", href: "/dashboard/teacher/recent" },
      { label: "Mi suscripción", href: "/dashboard/subscription" },
      { label: "Configuración", href: "/dashboard/teacher/settings" },
    ]);
  });

  it("does not change the existing student navigation", () => {
    expect(linksFor("STUDENT").map((item) => item.label)).toEqual([
      "Inicio",
      "Materias",
      "Explorar",
      "Guardados",
      "Recientes",
      "Mi suscripción",
      "Configuración",
    ]);
  });
});
