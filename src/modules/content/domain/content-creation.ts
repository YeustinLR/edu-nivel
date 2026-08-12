import { PublicationStatus, type Role } from "@/generated/prisma/enums";

export const contentCreationDispositions = [
  "DRAFT",
  "PUBLISH",
  "SUBMIT_FOR_REVIEW",
] as const;

export type ContentCreationDisposition =
  (typeof contentCreationDispositions)[number];

export function getModuleCreationStatus(
  disposition: ContentCreationDisposition,
) {
  return disposition === "PUBLISH"
    ? PublicationStatus.PUBLISHED
    : PublicationStatus.DRAFT;
}

export function getResourceCreationStatus(
  role: Role,
  disposition: ContentCreationDisposition,
) {
  if (role === "ADMIN") {
    return disposition === "PUBLISH"
      ? PublicationStatus.PUBLISHED
      : disposition === "DRAFT"
        ? PublicationStatus.DRAFT
        : null;
  }

  if (role === "COLLABORATOR") {
    return disposition === "SUBMIT_FOR_REVIEW"
      ? PublicationStatus.IN_REVIEW
      : disposition === "DRAFT"
        ? PublicationStatus.DRAFT
        : null;
  }

  return null;
}

