import "server-only";

import {
  ContentAudience,
  PublicationStatus,
  Role,
} from "@/generated/prisma/enums";

export type LearnerContentRole = typeof Role.STUDENT | typeof Role.TEACHER;

const audiencesByRole = {
  [Role.STUDENT]: [ContentAudience.STUDENT, ContentAudience.BOTH],
  [Role.TEACHER]: [ContentAudience.TEACHER, ContentAudience.BOTH],
} as const;

export function getLearnerContentAudiences(role: LearnerContentRole) {
  return [...audiencesByRole[role]];
}

export function getVisibleLearnerModuleWhere(role: LearnerContentRole) {
  return {
    isActive: true,
    publicationStatus: PublicationStatus.PUBLISHED,
    audience: { in: getLearnerContentAudiences(role) },
  } as const;
}

export function getVisibleLearnerResourceWhere() {
  return {
    isActive: true,
    publicationStatus: PublicationStatus.PUBLISHED,
  } as const;
}

export function getVisibleLearnerResourceTreeWhere({
  role,
  levelId,
  resourceId,
  subjectId,
}: {
  role: LearnerContentRole;
  levelId: string;
  resourceId?: string;
  subjectId?: string;
}) {
  return {
    ...(resourceId ? { id: resourceId } : {}),
    ...getVisibleLearnerResourceWhere(),
    module: {
      ...getVisibleLearnerModuleWhere(role),
      subject: {
        ...(subjectId ? { id: subjectId } : {}),
        levelId,
        isActive: true,
        level: { id: levelId, isActive: true },
      },
    },
  } as const;
}

export function audienceAllowsLearnerRole(
  audience: ContentAudience,
  role: Role,
) {
  if (role !== Role.STUDENT && role !== Role.TEACHER) return false;
  return getLearnerContentAudiences(role).some((value) => value === audience);
}
