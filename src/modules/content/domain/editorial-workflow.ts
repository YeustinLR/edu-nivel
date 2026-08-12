import { PublicationStatus } from "@/generated/prisma/enums";

export const editorialTransitions = [
  "SUBMIT_FOR_REVIEW",
  "WITHDRAW_REVIEW",
  "PUBLISH_DIRECT",
  "PUBLISH",
  "REQUEST_CHANGES",
  "UNPUBLISH",
] as const;

export type EditorialTransition = (typeof editorialTransitions)[number];
export type EditorialContentType = "module" | "resource";

type EditorialTransitionRule = {
  from: readonly PublicationStatus[];
  to: PublicationStatus;
};

const editableStates = [
  PublicationStatus.DRAFT,
  PublicationStatus.CHANGES_REQUESTED,
  PublicationStatus.UNPUBLISHED,
] as const;

function isEditableState(status: PublicationStatus) {
  return (editableStates as readonly PublicationStatus[]).includes(status);
}

export const editorialTransitionRules: Record<
  EditorialContentType,
  Record<EditorialTransition, EditorialTransitionRule>
> = {
  module: {
    SUBMIT_FOR_REVIEW: { from: [], to: PublicationStatus.IN_REVIEW },
    WITHDRAW_REVIEW: { from: [], to: PublicationStatus.DRAFT },
    PUBLISH_DIRECT: { from: editableStates, to: PublicationStatus.PUBLISHED },
    PUBLISH: { from: [], to: PublicationStatus.PUBLISHED },
    REQUEST_CHANGES: { from: [], to: PublicationStatus.CHANGES_REQUESTED },
    UNPUBLISH: {
      from: [PublicationStatus.PUBLISHED],
      to: PublicationStatus.UNPUBLISHED,
    },
  },
  resource: {
    SUBMIT_FOR_REVIEW: {
      from: editableStates,
      to: PublicationStatus.IN_REVIEW,
    },
    WITHDRAW_REVIEW: {
      from: [PublicationStatus.IN_REVIEW],
      to: PublicationStatus.DRAFT,
    },
    PUBLISH_DIRECT: { from: editableStates, to: PublicationStatus.PUBLISHED },
    PUBLISH: {
      from: [PublicationStatus.IN_REVIEW],
      to: PublicationStatus.PUBLISHED,
    },
    REQUEST_CHANGES: {
      from: [PublicationStatus.IN_REVIEW],
      to: PublicationStatus.CHANGES_REQUESTED,
    },
    UNPUBLISH: {
      from: [PublicationStatus.PUBLISHED],
      to: PublicationStatus.UNPUBLISHED,
    },
  },
};

export function isEditorialTransitionAllowed(
  targetType: EditorialContentType,
  status: PublicationStatus,
  transition: EditorialTransition,
) {
  return editorialTransitionRules[targetType][transition].from.includes(status);
}

export function getEditorialTransitionTarget(
  targetType: EditorialContentType,
  transition: EditorialTransition,
) {
  return editorialTransitionRules[targetType][transition].to;
}

export function getAdminEditorialTransitions(
  targetType: EditorialContentType,
  status: PublicationStatus,
): EditorialTransition[] {
  if (targetType === "module") {
    if (isEditableState(status)) return ["PUBLISH_DIRECT"];
    return status === PublicationStatus.PUBLISHED ? ["UNPUBLISH"] : [];
  }

  if (isEditableState(status)) return ["PUBLISH_DIRECT"];
  if (status === PublicationStatus.IN_REVIEW) {
    return ["PUBLISH", "REQUEST_CHANGES", "WITHDRAW_REVIEW"];
  }
  return status === PublicationStatus.PUBLISHED ? ["UNPUBLISH"] : [];
}

export function getCollaboratorEditorialTransitions(
  targetType: EditorialContentType,
  status: PublicationStatus,
): EditorialTransition[] {
  if (targetType === "module") {
    return isEditableState(status) ? ["PUBLISH_DIRECT"] : [];
  }

  if (isEditableState(status)) return ["SUBMIT_FOR_REVIEW"];
  return status === PublicationStatus.IN_REVIEW ? ["WITHDRAW_REVIEW"] : [];
}

export function getAdminReviewTransitions(
  status: PublicationStatus,
): EditorialTransition[] {
  return status === PublicationStatus.IN_REVIEW
    ? ["PUBLISH", "REQUEST_CHANGES"]
    : [];
}
