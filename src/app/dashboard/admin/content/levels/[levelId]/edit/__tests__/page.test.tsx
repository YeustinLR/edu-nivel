import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLevelEditorData: vi.fn(),
  getLevelDeletionEligibility: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/server/content/content-detail-queries", () => ({
  getLevelEditorData: mocks.getLevelEditorData,
}));
vi.mock("@/server/content/delete-catalog-level", () => ({
  getLevelDeletionEligibility: mocks.getLevelDeletionEligibility,
}));
vi.mock("@/modules/content/components/editor/EditLevelForm", () => ({
  EditLevelForm: () => <div>Formulario del nivel</div>,
}));
vi.mock(
  "@/modules/content/components/editor/ContentAvailabilityControl",
  () => ({
    ContentAvailabilityControl: () => <div>Disponibilidad del nivel</div>,
  }),
);
vi.mock(
  "@/modules/content/components/admin/detail/AdminLevelDeletionControl",
  () => ({
    AdminLevelDeletionControl: () => <div>Eliminar nivel</div>,
  }),
);

import EditAdminLevelPage from "@/app/dashboard/admin/content/levels/[levelId]/edit/page";

describe("EditAdminLevelPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLevelEditorData.mockResolvedValue({
      id: "level-1",
      levelNumber: 7,
      description: "Sétimo año",
      requiresSubscription: true,
      isActive: true,
      updatedAt: new Date("2026-09-16T12:00:00.000Z"),
    });
    mocks.getLevelDeletionEligibility.mockResolvedValue({
      activeSubscriptionCount: 0,
      unresolvedPaymentCount: 0,
      canDelete: true,
    });
  });

  it("groups editing, availability, and deletion on the edit page", async () => {
    const page = await EditAdminLevelPage({
      params: Promise.resolve({ levelId: "level-1" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Editar Nivel 7");
    expect(html).toContain("Formulario del nivel");
    expect(html).toContain("Disponibilidad del nivel");
    expect(html).toContain("Zona de peligro");
    expect(html).toContain("Eliminar nivel");
  });
});
