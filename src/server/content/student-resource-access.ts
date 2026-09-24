import "server-only";

import { Role } from "@/generated/prisma/enums";
import {
  canOpenLearnerResource,
  getLearnerResourceAccessMode,
  type LearnerResourceAccessMode,
} from "@/modules/content/domain/learner-resource-access";
import { getPremiumAccessDecision, requireRole } from "@/server/auth/guards";
import { getVisibleLearnerResourceTreeWhere } from "@/server/content/learner-content-access";
import { prisma } from "@/server/db/prisma";

export type AuthorizedLearnerResourceResult =
  | {
      allowed: true;
      userId: string;
      levelId: string;
      resourceId: string;
      accessMode: Exclude<LearnerResourceAccessMode, "LOCKED">;
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

  const resource = await prisma.resource.findFirst({
    where: getVisibleLearnerResourceTreeWhere({
      role,
      levelId: user.selectedLevelId,
      resourceId,
    }),
    select: {
      id: true,
      isFreePreview: true,
      module: {
        select: {
          subject: {
            select: {
              level: {
                select: { isActive: true, requiresSubscription: true },
              },
            },
          },
        },
      },
    },
  });
  if (!resource) return { allowed: false, code: "RESOURCE_UNAVAILABLE" };

  const levelRequiresSubscription =
    resource.module.subject.level.requiresSubscription;
  const levelAccess = levelRequiresSubscription
    ? await getPremiumAccessDecision(user.selectedLevelId)
    : null;
  if (!resource.module.subject.level.isActive && !levelAccess?.decision.allowed) {
    return { allowed: false, code: "CONTENT_ACCESS_REQUIRED" };
  }
  const accessMode = getLearnerResourceAccessMode({
    levelRequiresSubscription,
    isFreePreview: resource.isFreePreview,
    hasLevelAccess: levelAccess?.decision.allowed ?? false,
  });
  if (!canOpenLearnerResource(accessMode)) {
    return { allowed: false, code: "CONTENT_ACCESS_REQUIRED" };
  }

  return {
    allowed: true,
    userId: user.id,
    levelId: user.selectedLevelId,
    resourceId: resource.id,
    accessMode,
  };
}
