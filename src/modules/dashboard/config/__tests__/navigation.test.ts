import { describe, expect, it } from "vitest";

import {
  navigationByRole,
  partitionMobileNavigation,
} from "@/modules/dashboard/config/navigation";

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

  it("keeps the student destinations without duplicating the header inbox", () => {
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

  it("uses the same three primary destinations for both learner roles", () => {
    for (const role of ["STUDENT", "TEACHER"] as const) {
      const items = navigationByRole[role].flatMap((group) => group.items);
      const { primary } = partitionMobileNavigation(items);

      expect(primary.map((item) => item.label)).toEqual([
        "Inicio",
        "Materias",
        "Explorar",
      ]);
    }
  });

  it("keeps role-specific secondary destinations in the mobile more sheet", () => {
    const student = partitionMobileNavigation(
      navigationByRole.STUDENT.flatMap((group) => group.items),
    );
    const teacher = partitionMobileNavigation(
      navigationByRole.TEACHER.flatMap((group) => group.items),
    );

    expect(student.more.map((item) => item.label)).toEqual([
      "Guardados",
      "Recientes",
      "Mi suscripción",
      "Configuración",
    ]);
    expect(teacher.more.map((item) => item.label)).toEqual([
      "Recientes",
      "Mi suscripción",
      "Configuración",
    ]);
  });

  it("uses the header inbox as the only personal notification entry point", () => {
    for (const role of ["STUDENT", "TEACHER", "COLLABORATOR", "ADMIN"] as const) {
      expect(linksFor(role)).not.toContainEqual(
        expect.objectContaining({ href: "/dashboard/notifications" }),
      );
    }
    expect(linksFor("ADMIN")).toContainEqual({
      label: "Gestionar notificaciones",
      href: "/dashboard/admin/notifications",
    });
  });
});
