import type { ResourceType } from "@/generated/prisma/enums";

export type StudentContentLevel = {
  id: string;
  levelNumber: number;
  description: string | null;
  requiresSubscription: boolean;
};

export type StudentContentResourceSummary = {
  id: string;
  title: string;
  type: ResourceType;
  estimatedMinutes: number | null;
  durationSeconds: number | null;
  started: boolean;
  completed: boolean;
  href: string;
};

export type StudentContentModule = {
  id: string;
  title: string;
  description: string | null;
  resources: StudentContentResourceSummary[];
};

export type StudentContentSubject = {
  id: string;
  name: string;
  description: string | null;
  href: string;
  modules: StudentContentModule[];
};

type StoredFileMetadata = {
  originalName: string;
  mimeType: string;
  sizeBytes: string | null;
};

export type StudentContentResourceDetail = {
  id: string;
  type: ResourceType;
  title: string;
  instructions: string | null;
  content: string | null;
  estimatedMinutes: number | null;
  isRequired: boolean;
  isSaved: boolean;
  isCompleted: boolean;
  protectedFileAccessEnabled: boolean;
  youtube: {
    videoId: string;
    duration: number | null;
    startAt: number | null;
    endAt: number | null;
  } | null;
  link: { url: string; openInNewTab: boolean } | null;
  pdf: (StoredFileMetadata & { pageCount: number | null }) | null;
  image:
    | (StoredFileMetadata & {
        width: number | null;
        height: number | null;
        altText: string | null;
        caption: string | null;
      })
    | null;
  file: StoredFileMetadata | null;
  audio:
    | (StoredFileMetadata & {
        duration: number | null;
        transcript: string | null;
      })
    | null;
  quiz: {
    passingScore: number;
    maxAttempts: number | null;
    shuffleQuestions: boolean;
  } | null;
  game: { gameType: string } | null;
};

export type StudentContentNavigationTarget = {
  id: string;
  title: string;
  href: string;
} | null;

export type StudentContentWorkspaceData =
  | {
      status: "NO_LEVEL";
    }
  | {
      status: "LOCKED";
      level: StudentContentLevel;
      denialCode: string;
    }
  | {
      status: "READY";
      level: StudentContentLevel;
      subjects: StudentContentSubject[];
      selectedSubjectId: string | null;
      selectedModuleId: string | null;
      selectedResourceId: string | null;
      selectedResource: StudentContentResourceDetail | null;
      previous: StudentContentNavigationTarget;
      next: StudentContentNavigationTarget;
      resourcePosition: number;
      resourceCount: number;
      moduleResourcePosition: number;
      moduleResourceCount: number;
      requestedSubjectUnavailable: boolean;
      requestedResourceUnavailable: boolean;
    };
