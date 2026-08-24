import "server-only";

import { Role } from "@/generated/prisma/enums";
import { getPremiumAccessDecision, requireRole } from "@/server/auth/guards";
import { getVisibleLearnerResourceTreeWhere } from "@/server/content/learner-content-access";
import { prisma } from "@/server/db/prisma";

export type AuthorizedStudentResourceResult =
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
): Promise<AuthorizedStudentResourceResult> {
  const user = await requireRole(Role.STUDENT);
  if (!user.selectedLevelId) {
    return { allowed: false, code: "CONTENT_ACCESS_REQUIRED" };
  }

  const access = await getPremiumAccessDecision(user.selectedLevelId);
  if (!access.decision.allowed) {
    return { allowed: false, code: "CONTENT_ACCESS_REQUIRED" };
  }

  const resource = await prisma.resource.findFirst({
    where: getVisibleLearnerResourceTreeWhere({
      role: Role.STUDENT,
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
