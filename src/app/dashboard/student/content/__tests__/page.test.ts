import { isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getStudentContentCanonicalHrefMock,
  getStudentContentWorkspaceMock,
  redirectMock,
} = vi.hoisted(() => ({
  getStudentContentCanonicalHrefMock: vi.fn(),
  getStudentContentWorkspaceMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));
vi.mock("@/server/content/student-content-workspace-queries", () => ({
  getStudentContentCanonicalHref: getStudentContentCanonicalHrefMock,
  getStudentContentWorkspace: getStudentContentWorkspaceMock,
}));
vi.mock("@/modules/content/components/student-content/StudentContentWorkspace", () => ({
  StudentContentWorkspace: () => null,
}));

import StudentContentPage from "@/app/dashboard/student/content/page";

const canonicalHref =
  "/dashboard/student/content?subject=subject-math&resource=resource-note";

describe("StudentContentPage canonicalization", () => {
  beforeEach(() => {
    redirectMock.mockReset().mockImplementation((href: string) => {
      throw new Error(`NEXT_REDIRECT:${href}`);
    });
    getStudentContentCanonicalHrefMock
      .mockReset()
      .mockResolvedValue(canonicalHref);
    getStudentContentWorkspaceMock.mockReset().mockResolvedValue({
      status: "READY",
      requestedSubjectUnavailable: false,
      requestedResourceUnavailable: false,
    });
  });

  it("redirects an entry without parameters before loading the heavy workspace", async () => {
    await expect(
      StudentContentPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow(`NEXT_REDIRECT:${canonicalHref}`);

    expect(getStudentContentCanonicalHrefMock).toHaveBeenCalledWith({
      requestedSubjectId: undefined,
      requestedResourceId: undefined,
    });
    expect(getStudentContentWorkspaceMock).not.toHaveBeenCalled();
  });

  it("canonicalizes a subject-only URL before loading the workspace", async () => {
    await expect(
      StudentContentPage({
        searchParams: Promise.resolve({ subject: "subject-math" }),
      }),
    ).rejects.toThrow(`NEXT_REDIRECT:${canonicalHref}`);

    expect(getStudentContentWorkspaceMock).not.toHaveBeenCalled();
  });

  it("canonicalizes a resource-only URL according to the server resolver", async () => {
    await expect(
      StudentContentPage({
        searchParams: Promise.resolve({ resource: "resource-note" }),
      }),
    ).rejects.toThrow(`NEXT_REDIRECT:${canonicalHref}`);

    expect(getStudentContentCanonicalHrefMock).toHaveBeenCalledWith({
      requestedSubjectId: undefined,
      requestedResourceId: "resource-note",
    });
    expect(getStudentContentWorkspaceMock).not.toHaveBeenCalled();
  });

  it("loads a complete canonical URL directly and exactly once", async () => {
    const result = await StudentContentPage({
      searchParams: Promise.resolve({
        subject: "subject-math",
        resource: "resource-note",
      }),
    });

    expect(getStudentContentCanonicalHrefMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(getStudentContentWorkspaceMock).toHaveBeenCalledOnce();
    expect(getStudentContentWorkspaceMock).toHaveBeenCalledWith({
      requestedSubjectId: "subject-math",
      requestedResourceId: "resource-note",
    });
    expect(isValidElement(result)).toBe(true);
  });

  it("can reload a shared canonical URL without another canonical redirect", async () => {
    const parameters = {
      subject: "subject-math",
      resource: "resource-note",
    };

    await StudentContentPage({ searchParams: Promise.resolve(parameters) });
    await StudentContentPage({ searchParams: Promise.resolve(parameters) });

    expect(getStudentContentCanonicalHrefMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(getStudentContentWorkspaceMock).toHaveBeenCalledTimes(2);
  });

  it("keeps complete invalid parameters inside the authorized workspace fallback", async () => {
    getStudentContentWorkspaceMock.mockResolvedValue({
      status: "READY",
      selectedSubjectId: "subject-math",
      selectedResourceId: "resource-note",
      requestedSubjectUnavailable: true,
      requestedResourceUnavailable: true,
    });

    const result = await StudentContentPage({
      searchParams: Promise.resolve({
        subject: "subject-invalid",
        resource: "resource-invalid",
      }),
    });

    expect(getStudentContentCanonicalHrefMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(getStudentContentWorkspaceMock).toHaveBeenCalledOnce();
    expect(isValidElement(result)).toBe(true);
  });

  it("does not redirect-loop when a subject has no visible resource", async () => {
    const subjectOnlyHref =
      "/dashboard/student/content?subject=subject-empty";
    getStudentContentCanonicalHrefMock.mockResolvedValue(subjectOnlyHref);

    const result = await StudentContentPage({
      searchParams: Promise.resolve({ subject: "subject-empty" }),
    });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(getStudentContentWorkspaceMock).toHaveBeenCalledOnce();
    expect(isValidElement(result)).toBe(true);
  });
});
