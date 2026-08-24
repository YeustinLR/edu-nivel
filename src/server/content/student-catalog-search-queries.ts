import "server-only";

import { cache } from "react";

import { ResourceType, Role } from "@/generated/prisma/enums";
import { educationStageForLevel } from "@/modules/content/domain/student-explore";
import { formatLearnerLevel } from "@/modules/dashboard/domain/learner-presentation";
import type { LearnerSearchItem } from "@/modules/dashboard/types/learner-dashboard";
import { requireRole } from "@/server/auth/guards";
import { getPublishedStudentCatalog } from "@/server/content/published-academic-catalog-queries";

const resourceSearchKeywords = {
  [ResourceType.NOTE]: [
    "contenido",
    "nota",
    "lección",
    "leccion",
    "material didáctico",
    "material didactico",
  ],
  [ResourceType.QUIZ]: ["cuestionario", "quiz"],
  [ResourceType.YOUTUBE]: ["youtube", "video"],
  [ResourceType.PDF]: ["pdf", "documento"],
  [ResourceType.FILE]: ["archivo"],
  [ResourceType.LINK]: ["enlace", "link"],
  [ResourceType.GAME]: ["juego"],
  [ResourceType.IMAGE]: ["imagen"],
  [ResourceType.AUDIO]: ["audio"],
} satisfies Record<ResourceType, string[]>;

function exploreHref(levelId: string, levelNumber: number, subjectId?: string) {
  const params = new URLSearchParams({
    stage: educationStageForLevel(levelNumber),
    level: levelId,
  });
  if (subjectId) params.set("subject", subjectId);
  return `/dashboard/student/explore?${params.toString()}`;
}

/** Metadata publicada y estrictamente limitada para la búsqueda del catálogo Student. */
export const getStudentCatalogSearchItems = cache(async (): Promise<LearnerSearchItem[]> => {
  await requireRole(Role.STUDENT);
  const levels = await getPublishedStudentCatalog();

  return levels.flatMap((level) => {
    const levelName = formatLearnerLevel(level.levelNumber);
    const levelHref = exploreHref(level.id, level.levelNumber);
    const items: LearnerSearchItem[] = [{
      id: `level-${level.id}`,
      kind: "level",
      label: levelName,
      context: educationStageForLevel(level.levelNumber) === "primary" ? "Primaria" : "Secundaria",
      keywords: [String(level.levelNumber), `nivel ${level.levelNumber}`, `${level.levelNumber}°`],
      href: levelHref,
    }];

    for (const subject of level.subjects) {
      const href = exploreHref(level.id, level.levelNumber, subject.id);
      items.push({
        id: `subject-${subject.id}`,
        kind: "subject",
        label: subject.name,
        context: `${levelName} · Materia`,
        keywords: [String(level.levelNumber), `nivel ${level.levelNumber}`],
        href,
      });
      for (const moduleRecord of subject.modules) {
        items.push({
          id: `module-${moduleRecord.id}`,
          kind: "module",
          label: moduleRecord.title,
          context: `${subject.name} · ${levelName}`,
          keywords: [String(level.levelNumber), `nivel ${level.levelNumber}`, "módulo"],
          href: `${href}#explore-modules`,
        });
        for (const resource of moduleRecord.resources) {
          items.push({
            id: `resource-${resource.id}`,
            kind: "resource",
            label: resource.title,
            context: `${subject.name} · ${moduleRecord.title}`,
            keywords: [resource.type, ...resourceSearchKeywords[resource.type], "recurso"],
            href: `${href}#explore-modules`,
          });
        }
      }
    }
    return items;
  });
});
