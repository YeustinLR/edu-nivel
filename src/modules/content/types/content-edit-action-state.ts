export type ContentEditField =
  | "id"
  | "expectedUpdatedAt"
  | "levelNumber"
  | "description"
  | "requiresSubscription"
  | "name"
  | "title"
  | "audience"
  | "resourceType"
  | "content"
  | "estimatedMinutes"
  | "objective"
  | "videoId"
  | "startAt"
  | "url"
  | "openInNewTab"
  | "altText"
  | "type"
  | "isActive";

export type ContentEditFieldErrors = Partial<
  Record<ContentEditField, string[]>
>;

export type ContentEditValues = Partial<Record<ContentEditField, string | boolean>>;

export type ContentEditActionState = FormActionState<
  ContentEditFieldErrors,
  ContentEditValues,
  Record<never, never>
>;

export const initialContentEditActionState: ContentEditActionState =
  initialFormActionState;
import type { FormActionState } from "@/modules/content/types/form-action-state";
import { initialFormActionState } from "@/modules/content/types/form-action-state";
