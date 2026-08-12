export type ContentCreationFieldErrors = Partial<
  Record<
    | "levelNumber"
    | "description"
    | "requiresSubscription"
    | "levelId"
    | "name"
    | "subjectId"
    | "title"
    | "audience"
    | "disposition",
    string[]
  >
>;

export type ContentCreationValues = {
  levelNumber?: string;
  description?: string;
  requiresSubscription?: boolean;
  levelId?: string;
  name?: string;
  subjectId?: string;
  title?: string;
  audience?: string;
  disposition?: string;
};

export type ContentCreationActionState = FormActionState<
  ContentCreationFieldErrors,
  ContentCreationValues,
  { destinationHref: string; destinationLabel: string }
>;

export const initialContentCreationActionState: ContentCreationActionState =
  initialFormActionState;
import type { FormActionState } from "@/modules/content/types/form-action-state";
import { initialFormActionState } from "@/modules/content/types/form-action-state";
