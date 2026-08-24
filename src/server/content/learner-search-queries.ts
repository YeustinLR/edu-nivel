import "server-only";

import { Role } from "@/generated/prisma/enums";
import type {
  LearnerRole,
  LearnerSearchItem,
} from "@/modules/dashboard/types/learner-dashboard";
import { getPremiumAccessDecision, requireRole } from "@/server/auth/guards";
import { getPublishedTeacherCatalog } from "@/server/content/published-academic-catalog-queries";
import { getStudentCatalogSearchItems } from "@/server/content/student-catalog-search-queries";

export async function getLearnerSearchItems(
  role: LearnerRole,
): Promise<LearnerSearchItem[]> {
  if (role === Role.STUDENT) {
    return getStudentCatalogSearchItems();
  }

  const user = await requireRole(Role.TEACHER);
  if (!user.selectedLevelId || !user.selectedLevel) return [];

  const access = await getPremiumAccessDecision(user.selectedLevelId);
  if (!access.decision.allowed) return [];

  const subjects = await getPublishedTeacherCatalog(user.selectedLevelId);

  const items: LearnerSearchItem[] = [];
  for (const subject of subjects) {
    const href = `/dashboard/teacher/content#subject-${encodeURIComponent(subject.id)}`;
    items.push({
      id: `subject-${subject.id}`,
      kind: "subject",
      label: subject.name,
      context: `Materia · Nivel ${user.selectedLevel.levelNumber}`,
      href,
    });

    for (const moduleRecord of subject.modules) {
      items.push({
        id: `module-${moduleRecord.id}`,
        kind: "module",
        label: moduleRecord.title,
        context: subject.name,
        href,
      });

      for (const resource of moduleRecord.resources) {
        items.push({
          id: `resource-${resource.id}`,
          kind: "resource",
          label: resource.title,
          context: `${subject.name} · ${moduleRecord.title}`,
          href,
        });
      }
    }
  }

  return items;
}
