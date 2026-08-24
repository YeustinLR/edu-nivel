import type { ResourceType, Role } from "@/generated/prisma/enums";

export type LearnerRole = typeof Role.STUDENT | typeof Role.TEACHER;
export type LearnerAccessStatus = "ACTIVE" | "INCLUDED" | "LOCKED" | "NO_LEVEL";

export type LearnerSearchItem = {
  id: string;
  kind: "level" | "subject" | "module" | "resource";
  label: string;
  context: string;
  keywords?: string[];
  href: string;
};

export type LearnerResourceSummary = {
  id: string;
  title: string;
  type: ResourceType;
  subjectId: string;
  subjectName: string;
  moduleId: string;
  moduleTitle: string;
  estimatedMinutes: number | null;
  durationSeconds: number | null;
  startedAt: string | null;
  lastViewedAt: string | null;
  completed: boolean;
  href: string;
};

export type LearnerSavedResourceSummary = LearnerResourceSummary & {
  savedAt: string;
};

export type LearnerSubjectSummary = {
  id: string;
  name: string;
  description: string | null;
  moduleCount: number;
  resourceCount: number;
  href: string;
};

export type LearnerContinueTarget = LearnerResourceSummary & {
  progressPercent: number | null;
  isProgressRecord: boolean;
};

export type LearnerDashboardData = {
  user: {
    id: string;
    name: string;
    email: string;
    firstName: string;
  };
  levels: Array<{
    id: string;
    levelNumber: number;
    description: string | null;
    requiresSubscription: boolean;
  }>;
  selectedLevel: {
    id: string;
    levelNumber: number;
    description: string | null;
    requiresSubscription: boolean;
  } | null;
  access: {
    status: LearnerAccessStatus;
    currentPeriodEnd: string | null;
  };
  subjects: LearnerSubjectSummary[];
  continueTarget: LearnerContinueTarget | null;
  recentResources: LearnerResourceSummary[];
  savedResources: LearnerSavedResourceSummary[];
  availableResources: LearnerResourceSummary[];
  searchItems: LearnerSearchItem[];
};
