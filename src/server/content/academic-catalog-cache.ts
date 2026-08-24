import "server-only";

export const ACADEMIC_CATALOG_CACHE_SECONDS = 300;

export const ACTIVE_ACADEMIC_LEVELS_TAG =
  "academic-catalog:levels";
export const STUDENT_ACADEMIC_CATALOG_TAG =
  "academic-catalog:student";
export const TEACHER_ACADEMIC_CATALOG_TAG =
  "academic-catalog:teacher";

export const PUBLISHED_ACADEMIC_CATALOG_TAGS = [
  ACTIVE_ACADEMIC_LEVELS_TAG,
  STUDENT_ACADEMIC_CATALOG_TAG,
  TEACHER_ACADEMIC_CATALOG_TAG,
] as const;
