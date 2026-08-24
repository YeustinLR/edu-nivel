import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { StudentContentWorkspace } from "@/modules/content/components/student-content/StudentContentWorkspace";
import {
  getStudentContentCanonicalHref,
  getStudentContentWorkspace,
} from "@/server/content/student-content-workspace-queries";

export const metadata: Metadata = { title: "Materias" };

export default async function StudentContentPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; resource?: string }>;
}) {
  const parameters = await searchParams;
  if (!parameters.subject || !parameters.resource) {
    const canonicalHref = await getStudentContentCanonicalHref({
      requestedSubjectId: parameters.subject,
      requestedResourceId: parameters.resource,
    });
    const currentParameters = new URLSearchParams();
    if (parameters.subject) currentParameters.set("subject", parameters.subject);
    if (parameters.resource) currentParameters.set("resource", parameters.resource);
    const currentQuery = currentParameters.toString();
    const currentHref = `/dashboard/student/content${currentQuery ? `?${currentQuery}` : ""}`;

    if (canonicalHref && canonicalHref !== currentHref) {
      redirect(canonicalHref);
    }
  }

  const data = await getStudentContentWorkspace({
    requestedSubjectId: parameters.subject,
    requestedResourceId: parameters.resource,
  });

  return <StudentContentWorkspace data={data} />;
}
