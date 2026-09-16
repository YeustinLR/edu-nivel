import { notFound } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import { SubjectContentWorkspace } from "@/modules/content/components/admin/workspace/SubjectContentWorkspace";
import { requireRole } from "@/server/auth/guards";
import { getAdminSubjectContentWorkspace } from "@/server/content/admin-module-list-queries";
import { prisma } from "@/server/db/prisma";

export default async function CollaboratorSubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{ module?: string | string[]; resource?: string | string[]; notice?: string | string[] }>;
}) {
  const [{ subjectId }, queryParams, actor] = await Promise.all([params, searchParams, requireRole(Role.COLLABORATOR)]);
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true, name: true, description: true, isActive: true, level: { select: { id: true, levelNumber: true, isActive: true } } },
  });
  if (!subject) notFound();
  const modules = await getAdminSubjectContentWorkspace({ subjectId, actor, hierarchyIsActive: subject.isActive && subject.level.isActive });
  const requestedModuleId = typeof queryParams.module === "string" ? queryParams.module : undefined;
  const requestedResourceId = typeof queryParams.resource === "string" ? queryParams.resource : undefined;
  const created = requestedResourceId
    ? modules.flatMap((moduleRecord) => moduleRecord.resources.map((resource) => ({ moduleRecord, resource }))).find(({ resource }) => resource.id === requestedResourceId)
    : undefined;
  const initialModuleId = created?.moduleRecord.id ?? (modules.some((moduleRecord) => moduleRecord.id === requestedModuleId) ? requestedModuleId : undefined);
  const initialToast = created
    ? queryParams.notice === "resource-submitted" ? `“${created.resource.title}” fue enviado a revisión.` : queryParams.notice === "resource-draft" ? `Borrador de “${created.resource.title}” guardado.` : undefined
    : undefined;
  return <SubjectContentWorkspace subject={subject} modules={modules} now={new Date().toISOString()} initialModuleId={initialModuleId} initialResourceId={initialToast ? created?.resource.id : undefined} initialToast={initialToast} mode="collaborator" />;
}
