import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ResourceType } from "@/generated/prisma/enums";

vi.mock("@/modules/content/components/shared/PdfCanvasViewer", () => ({
  PdfCanvasViewer: ({ title }: { title: string }) => (
    <div data-testid="pdf-viewer">PDF: {title}</div>
  ),
}));
vi.mock("@/modules/content/components/student-content/StudentQuizPlayer", () => ({
  StudentQuizPlayer: () => <div>Cuestionario interactivo</div>,
}));

import {
  LearnerResourcePresentation,
  type LearnerResourcePresentationData,
} from "@/modules/content/components/student-content/LearnerResourcePresentation";

const baseResource: LearnerResourcePresentationData = {
  id: "resource-1",
  type: ResourceType.NOTE,
  title: "Introducción a fracciones",
  instructions: "Lee con atención.",
  content: "Contenido educativo",
  estimatedMinutes: 12,
  isRequired: true,
  protectedFileAccessEnabled: true,
  youtube: null,
  link: null,
  pdf: null,
  image: null,
  file: null,
  audio: null,
  quiz: null,
  game: null,
};

function renderResource(resource: LearnerResourcePresentationData) {
  return renderToStaticMarkup(
    <LearnerResourcePresentation
      resource={resource}
      moduleTitle="Módulo 1"
    />,
  );
}

describe("LearnerResourcePresentation", () => {
  it("renders the learner heading, instructions, duration and written content", () => {
    const html = renderResource(baseResource);

    expect(html).toContain("Introducción a fracciones");
    expect(html).toContain("Módulo 1");
    expect(html).toContain("Requerido");
    expect(html).toContain("Indicaciones");
    expect(html).toContain("Lee con atención.");
    expect(html).toContain("12 min");
    expect(html).toContain("Contenido educativo");
  });

  it("does not introduce learner mutations or progress unless slots are supplied", () => {
    const previewHtml = renderResource(baseResource);

    expect(previewHtml).not.toContain("Guardar");
    expect(previewHtml).not.toContain("Completar");
    expect(previewHtml).not.toContain("Recurso 1 de");
    expect(previewHtml).not.toContain("Anterior");

    const studentHtml = renderToStaticMarkup(
      <LearnerResourcePresentation
        resource={baseResource}
        moduleTitle="Módulo 1"
        headerActions={<button type="button">Guardar</button>}
        resourcePositionLabel="Recurso 1 de 3"
        footer={<span>Anterior</span>}
      />,
    );

    expect(studentHtml).toContain("Guardar");
    expect(studentHtml).toContain("Recurso 1 de 3");
    expect(studentHtml).toContain("Anterior");
  });

  it.each([
    {
      type: ResourceType.YOUTUBE,
      specialized: {
        youtube: {
          videoId: "dQw4w9WgXcQ",
          duration: 120,
          startAt: 5,
          endAt: null,
        },
      },
      expected: "youtube-nocookie.com/embed/dQw4w9WgXcQ",
    },
    {
      type: ResourceType.PDF,
      specialized: {
        pdf: {
          originalName: "guia.pdf",
          mimeType: "application/pdf",
          sizeBytes: "2048",
          pageCount: 2,
        },
      },
      expected: "PDF: Introducción a fracciones",
    },
    {
      type: ResourceType.IMAGE,
      specialized: {
        image: {
          originalName: "figura.png",
          mimeType: "image/png",
          sizeBytes: "1024",
          width: 800,
          height: 600,
          altText: "Figura geométrica",
          caption: "Ejemplo visual",
        },
      },
      expected: "Figura geométrica",
    },
    {
      type: ResourceType.LINK,
      specialized: {
        link: { url: "https://example.com/recurso", openInNewTab: true },
      },
      expected: "example.com",
    },
    {
      type: ResourceType.FILE,
      specialized: {
        file: {
          originalName: "actividad.docx",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          sizeBytes: "4096",
        },
      },
      expected: "Abrir archivo",
    },
    {
      type: ResourceType.AUDIO,
      specialized: {
        audio: {
          originalName: "explicacion.mp3",
          mimeType: "audio/mpeg",
          sizeBytes: "8192",
          duration: 90,
          transcript: "Transcripción disponible",
        },
      },
      expected: "Transcripción disponible",
    },
    {
      type: ResourceType.QUIZ,
      specialized: {
        quiz: { passingScore: 70, maxAttempts: 3, shuffleQuestions: false },
      },
      expected: "autoevaluación",
    },
    {
      type: ResourceType.GAME,
      specialized: { game: { gameType: "MEMORY" } },
      expected: "visor registrado",
    },
  ])("renders $type resources with the learner presentation", ({ type, specialized, expected }) => {
    const html = renderResource({
      ...baseResource,
      type,
      content: null,
      instructions: null,
      ...specialized,
    });

    expect(html).toContain(expected);
  });

  it("shows the learner empty state for a note without written content", () => {
    const html = renderResource({
      ...baseResource,
      content: null,
      instructions: null,
    });

    expect(html).toContain("no tiene contenido compatible disponible");
  });
});
