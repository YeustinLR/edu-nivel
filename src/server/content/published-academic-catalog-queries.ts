import "server-only";

import { unstable_cache } from "next/cache";

import { Role } from "@/generated/prisma/enums";
import {
  ACTIVE_ACADEMIC_LEVELS_TAG,
  ACADEMIC_CATALOG_CACHE_SECONDS,
  STUDENT_ACADEMIC_CATALOG_TAG,
  TEACHER_ACADEMIC_CATALOG_TAG,
} from "@/server/content/academic-catalog-cache";
import {
  getVisibleLearnerModuleWhere,
  getVisibleLearnerResourceWhere,
} from "@/server/content/learner-content-access";
import { prisma } from "@/server/db/prisma";

async function queryActiveAcademicLevels() {
  return prisma.level.findMany({
    where: { isActive: true },
    orderBy: [{ levelNumber: "asc" }, { id: "asc" }],
    select: {
      id: true,
      levelNumber: true,
      description: true,
      requiresSubscription: true,
    },
  });
}

async function queryPublishedStudentCatalog() {
  const moduleWhere = getVisibleLearnerModuleWhere(Role.STUDENT);
  const resourceWhere = getVisibleLearnerResourceWhere();

  return prisma.level.findMany({
    where: { isActive: true },
    orderBy: [{ levelNumber: "asc" }, { id: "asc" }],
    select: {
      id: true,
      levelNumber: true,
      description: true,
      requiresSubscription: true,
      subjects: {
        where: { isActive: true },
        orderBy: [{ order: "asc" }, { name: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          modules: {
            where: moduleWhere,
            orderBy: [{ order: "asc" }, { id: "asc" }],
            select: {
              id: true,
              title: true,
              resources: {
                where: resourceWhere,
                orderBy: [{ order: "asc" }, { id: "asc" }],
                select: { id: true, title: true, type: true },
              },
            },
          },
        },
      },
    },
  });
}

async function queryPublishedTeacherCatalog(levelId: string) {
  const moduleWhere = getVisibleLearnerModuleWhere(Role.TEACHER);
  const resourceWhere = getVisibleLearnerResourceWhere();

  return prisma.subject.findMany({
    where: {
      levelId,
      isActive: true,
      modules: { some: moduleWhere },
    },
    orderBy: [{ order: "asc" }, { name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      modules: {
        where: moduleWhere,
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          resources: {
            where: resourceWhere,
            orderBy: [{ order: "asc" }, { id: "asc" }],
            select: { id: true, title: true },
          },
        },
      },
    },
  });
}

/** Metadata mínima compartida; no contiene selección ni acceso del usuario. */
export const getActiveAcademicLevels = unstable_cache(
  queryActiveAcademicLevels,
  ["active-academic-levels-v1"],
  {
    revalidate: ACADEMIC_CATALOG_CACHE_SECONDS,
    tags: [ACTIVE_ACADEMIC_LEVELS_TAG],
  },
);

/** Catálogo público compartido; no contiene sesión, acceso ni estado personal. */
export const getPublishedStudentCatalog = unstable_cache(
  queryPublishedStudentCatalog,
  ["published-student-academic-catalog-v1"],
  {
    revalidate: ACADEMIC_CATALOG_CACHE_SECONDS,
    tags: [STUDENT_ACADEMIC_CATALOG_TAG],
  },
);

/** La función cacheada incluye levelId en su cache key automáticamente. */
export const getPublishedTeacherCatalog = unstable_cache(
  queryPublishedTeacherCatalog,
  ["published-teacher-academic-catalog-v1"],
  {
    revalidate: ACADEMIC_CATALOG_CACHE_SECONDS,
    tags: [TEACHER_ACADEMIC_CATALOG_TAG],
  },
);
