import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CollaboratorDashboardHome } from "@/modules/dashboard/components/collaborator/CollaboratorDashboardHome";
import type { CollaboratorDashboardData } from "@/server/dashboard/collaborator-dashboard-queries";

const generatedAt = new Date("2026-09-15T18:00:00.000Z");

const data: CollaboratorDashboardData = {
  generatedAt,
  attention: [
    {
      id: "resource-1",
      kind: "resource",
      title: "Fracciones equivalentes",
      context: "Nivel 5 / Matemáticas / Fracciones",
      status: "CHANGES_REQUESTED",
      href: "/dashboard/collaborator/content/resources/resource-1",
      updatedAt: new Date("2026-09-15T17:00:00.000Z"),
      lastEditorName: "María",
      reviewNote: "Agrega un ejemplo visual.",
    },
  ],
  continueWorking: [],
  inReview: [
    {
      id: "module-1",
      kind: "module",
      title: "Números enteros",
      context: "Nivel 5 / Matemáticas",
      status: "IN_REVIEW",
      href: "/dashboard/collaborator/content/modules/module-1",
      updatedAt: new Date("2026-09-15T16:00:00.000Z"),
      lastEditorName: "María",
      reviewNote: null,
    },
  ],
  teamActivity: [
    {
      key: "activity-1",
      actorName: "Carlos",
      action: "editó",
      title: "Álgebra inicial",
      href: "/dashboard/collaborator/content/modules/module-2",
      occurredAt: new Date("2026-09-15T17:30:00.000Z"),
    },
  ],
};

describe("CollaboratorDashboardHome", () => {
  it("renders an action-oriented editorial dashboard without metric cards", () => {
    const html = renderToStaticMarkup(
      <CollaboratorDashboardHome userName="María" data={data} />,
    );

    expect(html).toContain("Hola, María");
    expect(html).toContain("Requiere atención");
    expect(html).toContain("Continúa trabajando");
    expect(html).toContain("En revisión");
    expect(html).toContain("Actividad del equipo");
    expect(html).toContain("Agrega un ejemplo visual.");
    expect(html).not.toContain("Módulos creados");
    expect(html).not.toContain("Recursos totales");
  });

  it("exposes the three main collaborator destinations without admin links", () => {
    const html = renderToStaticMarkup(
      <CollaboratorDashboardHome userName="María" data={data} />,
    );

    expect(html).toContain('href="/dashboard/collaborator/content/catalog"');
    expect(html).toContain('href="/dashboard/collaborator/content/modules/new"');
    expect(html).toContain('href="/dashboard/collaborator/content/resources/new"');
    expect(html).not.toContain("/dashboard/admin");
  });
});
