import "server-only";

import { PaymentStatus, Role, SubscriptionProduct } from "@/generated/prisma/enums";
import {
  educationStageForLevel,
  getStudentExploreAccess,
  isEducationStage,
  summarizeResourceTypes,
} from "@/modules/content/domain/student-explore";
import { formatLearnerLevel } from "@/modules/dashboard/domain/learner-presentation";
import type {
  EducationStage,
  StudentExploreData,
  StudentExploreLevelDetail,
  StudentExploreLevelSummary,
} from "@/modules/content/types/student-explore";
import { requireRole } from "@/server/auth/guards";
import { getPublishedStudentCatalog } from "@/server/content/published-academic-catalog-queries";
import { prisma } from "@/server/db/prisma";

const openPaymentStatuses = [
  PaymentStatus.INITIALIZING,
  PaymentStatus.PROCESSING,
  PaymentStatus.REQUIRES_REVIEW,
];

export async function getStudentExploreData({
  requestedStage,
  requestedLevelId,
  requestedSubjectId,
}: {
  requestedStage?: string;
  requestedLevelId?: string;
  requestedSubjectId?: string;
}): Promise<StudentExploreData> {
  const user = await requireRole(Role.STUDENT);
  const [levelRows, subscriptions, pendingPayments] = await Promise.all([
    getPublishedStudentCatalog(),
    prisma.subscription.findMany({
      where: {
        userId: user.id,
        product: SubscriptionProduct.STUDENT_PREMIUM,
      },
      select: {
        id: true,
        levelId: true,
        product: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        payments: {
          where: {
            status: PaymentStatus.SUCCEEDED,
            appliedAt: { not: null },
          },
          take: 1,
          select: { id: true },
        },
      },
    }),
    prisma.payment.findMany({
      where: {
        userId: user.id,
        product: SubscriptionProduct.STUDENT_PREMIUM,
        status: { in: openPaymentStatuses },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, levelId: true },
    }),
  ]);

  const subscriptionByLevel = new Map(
    subscriptions.map((subscription) => [subscription.levelId, subscription]),
  );
  const pendingPaymentByLevel = new Map(
    pendingPayments.map((payment) => [payment.levelId, payment.id]),
  );

  const levelDetails: StudentExploreLevelDetail[] = levelRows.map((level) => {
    const modules = level.subjects.flatMap((subject) => subject.modules);
    const resourceTypes = modules.flatMap((moduleRecord) =>
      moduleRecord.resources.map((resource) => resource.type),
    );
    const typeSummary = summarizeResourceTypes(resourceTypes);
    const subscription = subscriptionByLevel.get(level.id) ?? null;

    const summary: StudentExploreLevelSummary = {
      id: level.id,
      levelNumber: level.levelNumber,
      name: formatLearnerLevel(level.levelNumber),
      description: level.description,
      stage: educationStageForLevel(level.levelNumber),
      requiresSubscription: level.requiresSubscription,
      subjectCount: level.subjects.length,
      moduleCount: modules.length,
      resourceCount: resourceTypes.length,
      ...typeSummary,
      access: getStudentExploreAccess({
        requiresSubscription: level.requiresSubscription,
        emailVerified: user.emailVerified,
        subscription: subscription
          ? {
              ...subscription,
              hasConfirmedPayment: subscription.payments.length > 0,
            }
          : null,
        pendingPaymentId: pendingPaymentByLevel.get(level.id) ?? null,
      }),
    };
    return {
      ...summary,
      subjects: level.subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        moduleCount: subject.modules.length,
        resourceCount: subject.modules.reduce(
          (total, moduleRecord) => total + moduleRecord.resources.length,
          0,
        ),
        modules: subject.modules.map((moduleRecord) => ({
          id: moduleRecord.id,
          title: moduleRecord.title,
          resourceCount: moduleRecord.resources.length,
          resources: moduleRecord.resources,
        })),
      })),
    };
  });
  const levels: StudentExploreLevelSummary[] = levelDetails.map((detail) => {
    const { subjects, ...level } = detail;
    void subjects;
    return level;
  });

  const requestedLevel = requestedLevelId
    ? levels.find((level) => level.id === requestedLevelId) ?? null
    : null;
  const requestedLevelUnavailable = Boolean(requestedLevelId && !requestedLevel);
  const requestedStageValue = isEducationStage(requestedStage)
    ? requestedStage
    : null;
  const selectedNavigationLevel = user.selectedLevelId
    ? levels.find((level) => level.id === user.selectedLevelId) ?? null
    : null;
  const stage: EducationStage =
    requestedLevel?.stage ??
    requestedStageValue ??
    selectedNavigationLevel?.stage ??
    (levels.some((level) => level.stage === "primary")
      ? "primary"
      : "secondary");
  const selectedSummary =
    requestedLevel ??
    (requestedStageValue
      ? levels.find((level) => level.stage === requestedStageValue) ?? null
      : selectedNavigationLevel) ??
    levels.find((level) => level.stage === stage) ??
    null;

  if (!selectedSummary) {
    return {
      levels,
      levelDetails,
      selectedLevel: null,
      selectedSubjectId: null,
      stage,
      requestedLevelUnavailable,
      requestedSubjectUnavailable: Boolean(requestedSubjectId),
    };
  }

  const selectedDetail =
    levelDetails.find((level) => level.id === selectedSummary.id) ?? null;
  if (!selectedDetail) {
    return {
      levels,
      levelDetails,
      selectedLevel: null,
      selectedSubjectId: null,
      stage,
      requestedLevelUnavailable: true,
      requestedSubjectUnavailable: Boolean(requestedSubjectId),
    };
  }

  const selectedSubject = requestedSubjectId
    ? selectedDetail.subjects.find((subject) => subject.id === requestedSubjectId) ?? null
    : null;
  const selectedSubjectId =
    selectedSubject?.id ?? selectedDetail.subjects[0]?.id ?? null;

  return {
    levels,
    levelDetails,
    selectedLevel: selectedDetail,
    selectedSubjectId,
    stage: selectedSummary.stage,
    requestedLevelUnavailable,
    requestedSubjectUnavailable: Boolean(
      requestedSubjectId && !selectedSubject,
    ),
  };
}
