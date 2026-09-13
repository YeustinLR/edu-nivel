import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/content/components/LearnerContent", () => ({
  LearnerContent: ({ role, title }: { role: string; title: string }) => (
    <div data-role={role}>{title}</div>
  ),
}));

import TeacherContentPage from "@/app/dashboard/teacher/content/page";

describe("TeacherContentPage", () => {
  it("renderiza el catálogo real filtrado para docentes", () => {
    const html = renderToStaticMarkup(<TeacherContentPage />);

    expect(html).toContain('data-role="TEACHER"');
    expect(html).toContain("Materias");
  });
});
