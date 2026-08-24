import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const {
  getCurrentSessionMock,
  getLearnerSearchItemsMock,
  requireUserMock,
} = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  getLearnerSearchItemsMock: vi.fn(),
  requireUserMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({
  getCurrentSession: getCurrentSessionMock,
  requireUser: requireUserMock,
}));
vi.mock("@/server/content/learner-search-queries", () => ({
  getLearnerSearchItems: getLearnerSearchItemsMock,
}));

import { GET } from "@/app/api/dashboard/learner-search/route";

describe("GET /api/dashboard/learner-search", () => {
  beforeEach(() => {
    getCurrentSessionMock.mockReset().mockResolvedValue({
      user: { id: "student-1" },
    });
    requireUserMock.mockReset().mockResolvedValue({
      id: "student-1",
      role: Role.STUDENT,
    });
    getLearnerSearchItemsMock.mockReset().mockResolvedValue([
      {
        id: "subject-math",
        kind: "subject",
        label: "Matemáticas",
        context: "Séptimo año · Materia",
        href: "/dashboard/student/explore?level=level-7",
      },
    ]);
  });

  it("loads learner search metadata on demand without caching the response", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      items: [
        expect.objectContaining({
          id: "subject-math",
          label: "Matemáticas",
        }),
      ],
    });
    expect(getLearnerSearchItemsMock).toHaveBeenCalledWith(Role.STUDENT);
  });

  it("uses the authenticated teacher role instead of a client-provided role", async () => {
    requireUserMock.mockResolvedValue({ id: "teacher-1", role: Role.TEACHER });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(getLearnerSearchItemsMock).toHaveBeenCalledWith(Role.TEACHER);
  });

  it("rejects unauthenticated requests before loading catalog data", async () => {
    getCurrentSessionMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "UNAUTHORIZED" });
    expect(requireUserMock).not.toHaveBeenCalled();
    expect(getLearnerSearchItemsMock).not.toHaveBeenCalled();
  });

  it("does not expose learner search data to other roles", async () => {
    requireUserMock.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });

    const response = await GET();

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "FORBIDDEN" });
    expect(getLearnerSearchItemsMock).not.toHaveBeenCalled();
  });
});
