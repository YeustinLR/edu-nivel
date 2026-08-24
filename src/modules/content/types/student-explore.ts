import type { ResourceType } from "@/generated/prisma/enums";

export type EducationStage = "primary" | "secondary";

export type StudentExploreAccessStatus =
  | "INCLUDED"
  | "ACTIVE"
  | "CANCELED_ACTIVE"
  | "PENDING"
  | "EXPIRED"
  | "LOCKED";

export type StudentExploreAccess = {
  status: StudentExploreAccessStatus;
  currentPeriodEnd: string | null;
  subscriptionId: string | null;
  pendingPaymentId: string | null;
};

export type StudentExploreLevelSummary = {
  id: string;
  levelNumber: number;
  name: string;
  description: string | null;
  stage: EducationStage;
  requiresSubscription: boolean;
  subjectCount: number;
  moduleCount: number;
  resourceCount: number;
  resourceTypes: ResourceType[];
  additionalResourceTypeCount: number;
  access: StudentExploreAccess;
};

export type StudentExploreResource = {
  id: string;
  title: string;
  type: ResourceType;
};

export type StudentExploreModule = {
  id: string;
  title: string;
  resourceCount: number;
  resources: StudentExploreResource[];
};

export type StudentExploreSubject = {
  id: string;
  name: string;
  moduleCount: number;
  resourceCount: number;
  modules: StudentExploreModule[];
};

export type StudentExploreLevelDetail = StudentExploreLevelSummary & {
  subjects: StudentExploreSubject[];
};

export type StudentExploreData = {
  levels: StudentExploreLevelSummary[];
  levelDetails: StudentExploreLevelDetail[];
  selectedLevel: StudentExploreLevelDetail | null;
  selectedSubjectId: string | null;
  stage: EducationStage;
  requestedLevelUnavailable: boolean;
  requestedSubjectUnavailable: boolean;
};
