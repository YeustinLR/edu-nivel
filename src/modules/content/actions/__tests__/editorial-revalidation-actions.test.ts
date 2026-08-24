import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicationStatus, Role } from "@/generated/prisma/enums";
import { initialEditorialActionState } from "@/modules/content/types/editorial-action-state";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  applyEditorialTransition: vi.fn(),
  revalidateContentPages: vi.fn(),
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

import { transitionEditorialContentAction } from "@/modules/content/actions/editorial-actions";

function editorialForm(transition: string) {
  const data = new FormData();
  data.set("targetType", "resource");
  data.set("targetId", "resource-1");
  data.set("parentId", "module-1");
  data.set("transition", transition);
  if (transition === "PUBLISH") data.set("reviewConfirmed", "true");
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

    const result = await transitionEditorialContentAction(
      initialEditorialActionState,
      editorialForm("PUBLISH"),
    );

    expect(result.status).toBe("success");
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
});
