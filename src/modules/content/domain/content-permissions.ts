import type {
  PublicationStatus,
  Role,
} from "@/generated/prisma/enums";

export const editablePublicationStatuses = [
  "DRAFT",
  "CHANGES_REQUESTED",
  "UNPUBLISHED",
] as const satisfies readonly PublicationStatus[];

export const moduleEditablePublicationStatuses = [
  ...editablePublicationStatuses,
  "PUBLISHED",
] as const satisfies readonly PublicationStatus[];

export const resourceCreationPublicationStatuses = [
  ...editablePublicationStatuses,
  "PUBLISHED",
] as const satisfies readonly PublicationStatus[];

export const deletableModulePublicationStatuses = [
  "DRAFT",
  "CHANGES_REQUESTED",
  "UNPUBLISHED",
] as const satisfies readonly PublicationStatus[];

export type ContentPermissionActor = {
  id: string;
  role: Role;
};

export type OwnedEditorialContent = {
  createdById: string;
  publicationStatus: PublicationStatus;
};

export type ContentVisibilityTarget = OwnedEditorialContent & {
  moduleCreatedById: string;
  isActive: boolean;
  moduleIsActive: boolean;
  subjectIsActive: boolean;
  levelIsActive: boolean;
  modulePublicationStatus: PublicationStatus;
};

export type ResourceCreationAvailabilityTarget = {
  publicationStatus: PublicationStatus;
  moduleIsActive: boolean;
  subjectIsActive: boolean;
  levelIsActive: boolean;
};

export function isEditablePublicationStatus(
  status: PublicationStatus,
): boolean {
  return editablePublicationStatuses.some(
    (editableStatus) => editableStatus === status,
  );
}

export function isModuleEditablePublicationStatus(
  status: PublicationStatus,
): boolean {
  return moduleEditablePublicationStatuses.some(
    (editableStatus) => editableStatus === status,
  );
}

export function isResourceCreationPublicationStatus(
  status: PublicationStatus,
): boolean {
  return resourceCreationPublicationStatuses.some(
    (creationStatus) => creationStatus === status,
  );
}

export function isModulePermanentlyDeletable(
  status: PublicationStatus,
): boolean {
  return deletableModulePublicationStatuses.some(
    (deletableStatus) => deletableStatus === status,
  );
}

export function getResourceCreationUnavailableReason(
  target: ResourceCreationAvailabilityTarget,
) {
  if (!target.levelIsActive) {
    return "Reactiva el nivel antes de añadir recursos.";
  }

  if (!target.subjectIsActive) {
    return "Reactiva la materia antes de añadir recursos.";
  }

  if (!target.moduleIsActive) {
    return "Reactiva el módulo antes de añadir recursos.";
  }

  if (target.publicationStatus === "IN_REVIEW") {
    return "Devuelve el módulo a borrador antes de añadir recursos.";
  }

  return null;
}

export function canManageCatalogStructure(actor: ContentPermissionActor) {
  return actor.role === "ADMIN";
}

export function canEditEditorialContent(
  actor: ContentPermissionActor,
  target: OwnedEditorialContent,
) {
  if (!isEditablePublicationStatus(target.publicationStatus)) return false;

  return (
    actor.role === "ADMIN" ||
    (actor.role === "COLLABORATOR" && target.createdById === actor.id)
  );
}

export function canEditModuleContent(
  actor: ContentPermissionActor,
  target: OwnedEditorialContent,
) {
  if (!isModuleEditablePublicationStatus(target.publicationStatus)) {
    return false;
  }

  return (
    actor.role === "ADMIN" ||
    (actor.role === "COLLABORATOR" && target.createdById === actor.id)
  );
}

export function canCreateResource(
  actor: ContentPermissionActor,
  target: OwnedEditorialContent,
) {
  if (!isResourceCreationPublicationStatus(target.publicationStatus)) {
    return false;
  }

  return (
    actor.role === "ADMIN" ||
    (actor.role === "COLLABORATOR" && target.createdById === actor.id)
  );
}

export function canArchiveEditorialContent(
  actor: ContentPermissionActor,
  target: OwnedEditorialContent,
) {
  return canEditEditorialContent(actor, target);
}

export function canReactivateEditorialContent(
  actor: ContentPermissionActor,
  target: OwnedEditorialContent,
) {
  if (actor.role === "ADMIN") return true;

  return (
    actor.role === "COLLABORATOR" &&
    target.createdById === actor.id &&
    isEditablePublicationStatus(target.publicationStatus)
  );
}

export function canViewContentBody(
  actor: ContentPermissionActor,
  target: ContentVisibilityTarget,
) {
  if (actor.role === "ADMIN") return true;

  if (actor.role !== "COLLABORATOR") return false;
  if (
    target.createdById === actor.id ||
    target.moduleCreatedById === actor.id
  ) {
    return true;
  }

  return (
    target.isActive &&
    target.moduleIsActive &&
    target.subjectIsActive &&
    target.levelIsActive &&
    target.publicationStatus === "PUBLISHED" &&
    target.modulePublicationStatus === "PUBLISHED"
  );
}
