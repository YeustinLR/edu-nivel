import { describe, expect, it } from "vitest";

import {
  canArchiveEditorialContent,
  canEditEditorialContent,
  canEditModuleContent,
  canCreateResource,
  canManageCatalogStructure,
  canReactivateEditorialContent,
  canViewContentBody,
  getResourceCreationUnavailableReason,
  isEditablePublicationStatus,
  isModulePermanentlyDeletable,
  type ContentPermissionActor,
} from "@/modules/content/domain/content-permissions";

const admin = { id: "admin-1", role: "ADMIN" } satisfies ContentPermissionActor;
const collaborator = {
  id: "collaborator-1",
  role: "COLLABORATOR",
} satisfies ContentPermissionActor;

describe("content permissions", () => {
  it.each(["DRAFT", "CHANGES_REQUESTED", "UNPUBLISHED"] as const)(
    "marks %s as editable",
    (status) => expect(isEditablePublicationStatus(status)).toBe(true),
  );

  it.each(["DRAFT", "CHANGES_REQUESTED", "UNPUBLISHED"] as const)(
    "allows permanently deleting a module in %s",
    (status) => expect(isModulePermanentlyDeletable(status)).toBe(true),
  );

  it.each(["IN_REVIEW", "PUBLISHED"] as const)(
    "prevents permanently deleting a module in %s",
    (status) => expect(isModulePermanentlyDeletable(status)).toBe(false),
  );

  it("allows adding resources to a published active module", () => {
    expect(
      getResourceCreationUnavailableReason({
        publicationStatus: "PUBLISHED",
        moduleIsActive: true,
        subjectIsActive: true,
        levelIsActive: true,
      }),
    ).toBeNull();
  });

  it.each(["IN_REVIEW", "PUBLISHED"] as const)(
    "does not mark %s as editable",
    (status) => expect(isEditablePublicationStatus(status)).toBe(false),
  );

  it.each(["DRAFT", "CHANGES_REQUESTED", "UNPUBLISHED"] as const)(
    "allows adding resources to an active module in %s",
    (publicationStatus) => {
      expect(
        getResourceCreationUnavailableReason({
          publicationStatus,
          moduleIsActive: true,
          subjectIsActive: true,
          levelIsActive: true,
        }),
      ).toBeNull();
    },
  );

  it("explains the first inactive hierarchy element that blocks resource creation", () => {
    const activeTarget = {
      publicationStatus: "DRAFT" as const,
      moduleIsActive: true,
      subjectIsActive: true,
      levelIsActive: true,
    };

    expect(
      getResourceCreationUnavailableReason({
        ...activeTarget,
        levelIsActive: false,
      }),
    ).toBe("Reactiva el nivel antes de añadir recursos.");
    expect(
      getResourceCreationUnavailableReason({
        ...activeTarget,
        subjectIsActive: false,
      }),
    ).toBe("Reactiva la materia antes de añadir recursos.");
    expect(
      getResourceCreationUnavailableReason({
        ...activeTarget,
        moduleIsActive: false,
      }),
    ).toBe("Reactiva el módulo antes de añadir recursos.");
  });

  it.each([[
    "IN_REVIEW",
    "Devuelve el módulo a borrador antes de añadir recursos.",
  ]] as const)(
    "explains why resources cannot be added in %s",
    (publicationStatus, expectedReason) => {
      expect(
        getResourceCreationUnavailableReason({
          publicationStatus,
          moduleIsActive: true,
          subjectIsActive: true,
          levelIsActive: true,
        }),
      ).toBe(expectedReason);
    },
  );

  it("reserves level and subject management for administrators", () => {
    expect(canManageCatalogStructure(admin)).toBe(true);
    expect(canManageCatalogStructure(collaborator)).toBe(false);
  });

  it("lets administrators edit editable content regardless of authorship", () => {
    expect(
      canEditEditorialContent(admin, {
        createdById: "another-user",
        publicationStatus: "DRAFT",
      }),
    ).toBe(true);
  });

  it("lets collaborators edit and archive only their editable content", () => {
    const ownDraft = {
      createdById: collaborator.id,
      publicationStatus: "DRAFT" as const,
    };

    expect(canEditEditorialContent(collaborator, ownDraft)).toBe(true);
    expect(canArchiveEditorialContent(collaborator, ownDraft)).toBe(true);
    expect(
      canEditEditorialContent(collaborator, {
        ...ownDraft,
        createdById: "another-user",
      }),
    ).toBe(false);
    expect(
      canArchiveEditorialContent(collaborator, {
        ...ownDraft,
        publicationStatus: "PUBLISHED",
      }),
    ).toBe(false);
  });

  it("prevents both roles from editing content under review or published", () => {
    for (const publicationStatus of ["IN_REVIEW", "PUBLISHED"] as const) {
      const target = { createdById: collaborator.id, publicationStatus };
      expect(canEditEditorialContent(admin, target)).toBe(false);
      expect(canEditEditorialContent(collaborator, target)).toBe(false);
    }
  });

  it("lets administrators and owners edit published modules and add resources", () => {
    const publishedModule = {
      createdById: collaborator.id,
      publicationStatus: "PUBLISHED" as const,
    };

    expect(canEditModuleContent(admin, publishedModule)).toBe(true);
    expect(canEditModuleContent(collaborator, publishedModule)).toBe(true);
    expect(canCreateResource(admin, publishedModule)).toBe(true);
    expect(canCreateResource(collaborator, publishedModule)).toBe(true);
    expect(
      canCreateResource(
        { id: "collaborator-2", role: "COLLABORATOR" },
        publishedModule,
      ),
    ).toBe(false);
  });

  it("allows admin recovery but limits collaborator reactivation to editable owned content", () => {
    expect(
      canReactivateEditorialContent(admin, {
        createdById: "another-user",
        publicationStatus: "PUBLISHED",
      }),
    ).toBe(true);
    expect(
      canReactivateEditorialContent(collaborator, {
        createdById: collaborator.id,
        publicationStatus: "UNPUBLISHED",
      }),
    ).toBe(true);
    expect(
      canReactivateEditorialContent(collaborator, {
        createdById: collaborator.id,
        publicationStatus: "PUBLISHED",
      }),
    ).toBe(false);
  });

  it("shows collaborators their content and active published team content", () => {
    const visibleTarget = {
      createdById: "another-user",
      moduleCreatedById: "module-author",
      publicationStatus: "PUBLISHED" as const,
      modulePublicationStatus: "PUBLISHED" as const,
      isActive: true,
      moduleIsActive: true,
      subjectIsActive: true,
      levelIsActive: true,
    };

    expect(canViewContentBody(collaborator, visibleTarget)).toBe(true);
    expect(
      canViewContentBody(collaborator, {
        ...visibleTarget,
        publicationStatus: "DRAFT",
      }),
    ).toBe(false);
    expect(
      canViewContentBody(collaborator, {
        ...visibleTarget,
        isActive: false,
      }),
    ).toBe(false);
    expect(
      canViewContentBody(collaborator, {
        ...visibleTarget,
        createdById: collaborator.id,
        publicationStatus: "DRAFT",
        isActive: false,
      }),
    ).toBe(true);
  });

  it("lets collaborators read resources attached to their own module", () => {
    expect(
      canViewContentBody(collaborator, {
        createdById: "admin-1",
        moduleCreatedById: collaborator.id,
        publicationStatus: "DRAFT",
        modulePublicationStatus: "DRAFT",
        isActive: false,
        moduleIsActive: true,
        subjectIsActive: true,
        levelIsActive: true,
      }),
    ).toBe(true);
  });
});
