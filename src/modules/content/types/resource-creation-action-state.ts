export type ResourceCreationField =
  | "requestId"
  | "moduleId"
  | "expectedSubjectId"
  | "resourceType"
  | "title"
  | "instructions"
  | "content"
  | "estimatedMinutes"
  | "videoId"
  | "startAt"
  | "url"
  | "openInNewTab"
  | "disposition";

export type ResourceCreationFieldErrors = Partial<
  Record<ResourceCreationField, string[]>
>;

export type ResourceCreationValues = Partial<
  Record<ResourceCreationField, string | boolean>
>;

export type ResourceCreationActionState = FormActionState<
  ResourceCreationFieldErrors,
  ResourceCreationValues,
  { resourceId: string }
>;

export const initialResourceCreationActionState: ResourceCreationActionState =
  initialFormActionState;
import type { FormActionState } from "@/modules/content/types/form-action-state";
import { initialFormActionState } from "@/modules/content/types/form-action-state";
