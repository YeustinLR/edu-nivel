import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import type { ContentPermissionActor } from "@/modules/content/domain/content-permissions";
import { ContentFormSurface } from "@/modules/content/components/admin/ContentFormSurface";
import { ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { CreateResourceForm } from "@/modules/content/components/admin/creation/CreateResourceForm";
import { ResourceCreationHelp } from "@/modules/content/components/admin/creation/ResourceCreationHelp";
import { getResourceCreationUnavailableReason } from "@/modules/content/domain/content-permissions";
import { getAdminSubjectContentWorkspace } from "@/server/content/admin-module-list-queries";
import { getResourceCreationContext } from "@/server/content/create-catalog-resource";
import { prisma } from "@/server/db/prisma";

function breadcrumbs(root: string, context: { level: { id: string; levelNumber: number }; subject: { id: string; name: string }; module?: { id: string; title: string } }) {
  return [{ label: "Contenido", href: root }, { label: "Catálogo", href: `${root}/catalog` }, { label: `Nivel ${context.level.levelNumber}`, href: `${root}/levels/${encodeURIComponent(context.level.id)}` }, { label: context.subject.name, href: `${root}/subjects/${encodeURIComponent(context.subject.id)}` }, ...(context.module ? [{ label: context.module.title, href: `${root}/modules/${encodeURIComponent(context.module.id)}` }] : []), { label: "Nuevo recurso" }];
}

export async function ModuleResourceCreationView({ moduleId, actor, contentRootHref, mode }: { moduleId: string; actor: ContentPermissionActor; contentRootHref: string; mode: "admin" | "collaborator" }) {
  const context = await getResourceCreationContext(moduleId);
  if (!context) redirect(`${contentRootHref}/catalog`);
  const subjectHref = `${contentRootHref}/subjects/${encodeURIComponent(context.subject.id)}`;
  const unavailableReason = getResourceCreationUnavailableReason({ publicationStatus: (context.revisions?.[0]?.status ?? context.publicationStatus) as typeof context.publicationStatus, moduleIsActive: context.isActive, subjectIsActive: context.subject.isActive, levelIsActive: context.subject.level.isActive });
  const canUseModule = actor.role === "ADMIN" || actor.role === "COLLABORATOR";
  return <div className="space-y-6">
    <ContentPageHeader eyebrow="Crear contenido" title="Nuevo recurso" description={`Añade contenido a ${context.title}.`} breadcrumbs={breadcrumbs(contentRootHref, { level: context.subject.level, subject: context.subject, module: context })} />
    <ContentFormSurface wide><div className="relative -mt-3 sm:-mt-4"><div className="absolute right-0 top-0 z-10"><ResourceCreationHelp title="Ayuda rápida" note={mode === "collaborator" ? "Guarda un borrador o envíalo a revisión; la publicación corresponde al administrador." : "Crea contenido educativo o una autoevaluación."} items={["Escribe un título claro.", "Añade contenido o configura el cuestionario.", "Adjunta un video, archivo, imagen o vínculo si lo necesitas."]} /></div>{unavailableReason || !canUseModule ? <p role="alert" className="rounded-lg bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">{unavailableReason ?? "No puedes agregar recursos a este módulo."}</p> : <CreateResourceForm moduleId={context.id} requestId={randomUUID()} closeHref={subjectHref} mode={mode} draftBaseHref={`${contentRootHref}/resources`} />}</div></ContentFormSurface>
  </div>;
}

export async function SubjectResourceCreationView({ subjectId, actor, contentRootHref, mode }: { subjectId: string; actor: ContentPermissionActor; contentRootHref: string; mode: "admin" | "collaborator" }) {
  const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true, name: true, description: true, isActive: true, level: { select: { id: true, levelNumber: true, isActive: true } } } });
  if (!subject) notFound();
  const modules = await getAdminSubjectContentWorkspace({ subjectId, actor, hierarchyIsActive: subject.isActive && subject.level.isActive });
  const eligible = modules.filter((moduleRecord) => moduleRecord.canAddResource).map((moduleRecord) => ({ id: moduleRecord.id, title: moduleRecord.title, subjectName: subject.name }));
  const subjectHref = `${contentRootHref}/subjects/${encodeURIComponent(subject.id)}`;
  return <div className="space-y-6">
    <ContentPageHeader eyebrow="Crear contenido" title="Nuevo recurso" description={`Añade contenido a ${subject.name}.`} breadcrumbs={breadcrumbs(contentRootHref, { level: subject.level, subject })} />
    <ContentFormSurface wide>{eligible.length === 0 ? <div><p role="alert" className="rounded-lg bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">No hay módulos disponibles para añadir recursos en esta materia.</p><Link href={subjectHref} className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium">Volver a la materia</Link></div> : <CreateResourceForm modules={eligible} requestId={randomUUID()} closeHref={subjectHref} subjectId={subject.id} mode={mode} draftBaseHref={`${contentRootHref}/resources`} />}</ContentFormSurface>
  </div>;
}
