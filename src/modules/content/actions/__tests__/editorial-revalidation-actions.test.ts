import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicationStatus, Role } from "@/generated/prisma/enums";
import { initialEditorialActionState } from "@/modules/content/types/editorial-action-state";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  applyEditorialTransition: vi.fn(),
  revalidateContentPages: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/server/auth/guards", () => ({
  requireRole: mocks.requireRole,
}));
vi.mock("@/server/content/apply-editorial-transition", () => ({
  applyEditorialTransition: mocks.applyEditorialTransition,
  EditorialTransitionError: class EditorialTransitionError extends Error {},
}));
vi.mock("@/server/content/revalidate-content", () => ({
  revalidateContentPages: mocks.revalidateContentPages,
}));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import { transitionEditorialContentAction } from "@/modules/content/actions/editorial-actions";

function editorialForm(transition: string, expectedRevisionUpdatedAt?: string) {
  const data = new FormData();
  data.set("targetType", "resource");
  data.set("targetId", "resource-1");
  data.set("parentId", "module-1");
  data.set("transition", transition);
  if (transition === "PUBLISH") data.set("reviewConfirmed", "true");
  if (expectedRevisionUpdatedAt) {
    data.set("expectedRevisionUpdatedAt", expectedRevisionUpdatedAt);
  }
  return data;
}

describe("editorial action revalidation scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
  });

  it("keeps review-only transitions in authoring surfaces", async () => {
    mocks.applyEditorialTransition.mockResolvedValue({
      outcome: "APPLIED",
      publicationStatus: PublicationStatus.IN_REVIEW,
    });

    const result = await transitionEditorialContentAction(
      initialEditorialActionState,
      editorialForm("SUBMIT_FOR_REVIEW"),
    );

    expect(result.status).toBe("success");
    expect(mocks.revalidateContentPages).toHaveBeenCalledWith("authoring");
  });

  it("refreshes learner surfaces after publishing", async () => {
    mocks.applyEditorialTransition.mockResolvedValue({
      outcome: "APPLIED",
      publicationStatus: PublicationStatus.PUBLISHED,
    });

    const expectedRevisionUpdatedAt = "2026-09-24T12:00:00.000Z";
    const result = await transitionEditorialContentAction(
      initialEditorialActionState,
      editorialForm("PUBLISH", expectedRevisionUpdatedAt),
    );

    expect(result.status).toBe("success");
    expect(mocks.applyEditorialTransition).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRevisionUpdatedAt }),
    );
    expect(mocks.revalidateContentPages).toHaveBeenCalledWith("published");
  });

  it("refreshes learner surfaces after unpublishing", async () => {
    mocks.applyEditorialTransition.mockResolvedValue({
      outcome: "APPLIED",
      publicationStatus: PublicationStatus.UNPUBLISHED,
    });

    const result = await transitionEditorialContentAction(
      initialEditorialActionState,
      editorialForm("UNPUBLISH"),
    );

    expect(result.status).toBe("success");
    expect(mocks.revalidateContentPages).toHaveBeenCalledWith("published");
  });

  it("redirects a resolved review from the server after requesting changes", async () => {
    mocks.applyEditorialTransition.mockResolvedValue({
      outcome: "APPLIED",
      publicationStatus: PublicationStatus.CHANGES_REQUESTED,
    });
    const data = editorialForm("REQUEST_CHANGES");
    data.set("reviewNote", "Completa la explicación del ejercicio.");
    data.set("successHref", "/dashboard/admin/content/reviews");

    await transitionEditorialContentAction(initialEditorialActionState, data);

    expect(mocks.revalidateContentPages).toHaveBeenCalledWith("authoring");
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/dashboard/admin/content/reviews",
    );
  });
});
