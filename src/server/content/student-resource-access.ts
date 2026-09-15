import "server-only";

import { Role } from "@/generated/prisma/enums";
import { getPremiumAccessDecision, requireRole } from "@/server/auth/guards";
import { getVisibleLearnerResourceTreeWhere } from "@/server/content/learner-content-access";
import { prisma } from "@/server/db/prisma";

export type AuthorizedLearnerResourceResult =
  | {
      allowed: true;
      userId: string;
      levelId: string;
      resourceId: string;
    }
  | {
      allowed: false;
      code: "CONTENT_ACCESS_REQUIRED" | "RESOURCE_UNAVAILABLE";
    };

export async function getAuthorizedStudentResource(
  resourceId: string,
): Promise<AuthorizedLearnerResourceResult> {
  return getAuthorizedLearnerResource(resourceId, Role.STUDENT);
}

export async function getAuthorizedTeacherResource(
  resourceId: string,
): Promise<AuthorizedLearnerResourceResult> {
  return getAuthorizedLearnerResource(resourceId, Role.TEACHER);
}

async function getAuthorizedLearnerResource(
  resourceId: string,
  role: typeof Role.STUDENT | typeof Role.TEACHER,
): Promise<AuthorizedLearnerResourceResult> {
  const user = await requireRole(role);
  if (!user.selectedLevelId) {
    return { allowed: false, code: "CONTENT_ACCESS_REQUIRED" };
  }

  const access = await getPremiumAccessDecision(user.selectedLevelId);
  if (!access.decision.allowed) {
    return { allowed: false, code: "CONTENT_ACCESS_REQUIRED" };
  }

  const resource = await prisma.resource.findFirst({
    where: getVisibleLearnerResourceTreeWhere({
      role,
      levelId: user.selectedLevelId,
      resourceId,
    }),
    select: { id: true },
  });
  if (!resource) return { allowed: false, code: "RESOURCE_UNAVAILABLE" };

  return {
    allowed: true,
    userId: user.id,
    levelId: user.selectedLevelId,
    resourceId: resource.id,
  };
}
