import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`);
  }),
  requireRole: vi.fn(),
  getPremiumAccessDecision: vi.fn(),
  userUpdate: vi.fn(),
  levelFindUnique: vi.fn(),
  revalidateContentPages: vi.fn(),
  revalidateLearnerSelectionPages: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/guards", () => ({
  requireRole: mocks.requireRole,
  getPremiumAccessDecision: mocks.getPremiumAccessDecision,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: { update: mocks.userUpdate },
    level: { findUnique: mocks.levelFindUnique },
  },
}));
vi.mock("@/server/content/revalidate-content", () => ({
  revalidateContentPages: mocks.revalidateContentPages,
  revalidateLearnerSelectionPages: mocks.revalidateLearnerSelectionPages,
}));
vi.mock("@/server/content/create-catalog-content", () => ({
  createCatalogModule: vi.fn(),
}));
vi.mock("@/server/content/apply-editorial-transition", () => ({
  applyEditorialTransition: vi.fn(),
}));

import {
  enterStudentLevelAction,
  selectLevelAction,
} from "@/modules/content/actions/content-actions";

function formData() {
  const data = new FormData();
  data.set("levelId", "level-7");
  return data;
}

describe("enterStudentLevelAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "student-1", role: Role.STUDENT });
    mocks.userUpdate.mockResolvedValue({ id: "student-1" });
    mocks.levelFindUnique.mockResolvedValue({ isActive: true });
  });

  it("persists selectedLevelId only after server-side access succeeds", async () => {
    mocks.getPremiumAccessDecision.mockResolvedValue({
      user: { id: "student-1" },
      decision: { allowed: true },
    });

    await expect(enterStudentLevelAction(formData())).rejects.toThrow(
      "REDIRECT:/dashboard/student/content",
    );

    expect(mocks.requireRole).toHaveBeenCalledWith(Role.STUDENT);
    expect(mocks.getPremiumAccessDecision).toHaveBeenCalledWith("level-7");
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: { selectedLevelId: "level-7" },
    });
    expect(mocks.revalidateLearnerSelectionPages).toHaveBeenCalledOnce();
    expect(mocks.revalidateLearnerSelectionPages).toHaveBeenCalledWith(
      Role.STUDENT,
    );
    expect(mocks.revalidateContentPages).not.toHaveBeenCalled();
  });

  it("allows entering an active level to explore free resources", async () => {
    mocks.getPremiumAccessDecision.mockResolvedValue({
      user: { id: "student-1" },
      decision: { allowed: false, code: "SUBSCRIPTION_REQUIRED" },
    });

    await expect(enterStudentLevelAction(formData())).rejects.toThrow(
      "REDIRECT:/dashboard/student/content",
    );
    expect(mocks.userUpdate).toHaveBeenCalledOnce();
    expect(mocks.revalidateLearnerSelectionPages).toHaveBeenCalledOnce();
  });
});

describe("selectLevelAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "student-1", role: Role.STUDENT });
    mocks.userUpdate.mockResolvedValue({ id: "student-1" });
    mocks.levelFindUnique.mockResolvedValue({ isActive: true });
  });

  it("persists only an accessible level and reloads the learner dashboard", async () => {
    mocks.getPremiumAccessDecision.mockResolvedValue({
      decision: { allowed: true },
    });
    const data = formData();
    data.set("returnTo", "/dashboard/student");

    await expect(selectLevelAction(data)).rejects.toThrow(
      "REDIRECT:/dashboard/student",
    );

    expect(mocks.getPremiumAccessDecision).toHaveBeenCalledWith("level-7");
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: { selectedLevelId: "level-7" },
    });
  });

  it("allows selecting an active level without current access", async () => {
    mocks.getPremiumAccessDecision.mockResolvedValue({
      decision: { allowed: false, code: "SUBSCRIPTION_EXPIRED" },
    });

    await expect(selectLevelAction(formData())).rejects.toThrow(
      "REDIRECT:/dashboard/student",
    );
    expect(mocks.userUpdate).toHaveBeenCalledOnce();
  });

  it("rejects an archived level without current access", async () => {
    mocks.levelFindUnique.mockResolvedValue({ isActive: false });
    mocks.getPremiumAccessDecision.mockResolvedValue({
      decision: { allowed: false, code: "SUBSCRIPTION_EXPIRED" },
    });

    await expect(selectLevelAction(formData())).rejects.toThrow(
      "Este nivel no está disponible para tu cuenta.",
    );
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });
});
