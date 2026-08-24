import { randomUUID } from "node:crypto";

import { notFound } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import { ContentFormSurface } from "@/modules/content/components/admin/ContentFormSurface";
import {
  adminCatalogBreadcrumbs,
  ContentPageHeader,
} from "@/modules/content/components/admin/ContentPageHeader";
import { CreateResourceForm } from "@/modules/content/components/admin/creation/CreateResourceForm";
import { ResourceCreationHelp } from "@/modules/content/components/admin/creation/ResourceCreationHelp";
import { getAdminSubjectContentWorkspace } from "@/server/content/admin-module-list-queries";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

export default async function CreateAdminSubjectResourcePage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const [{ subjectId }, actor] = await Promise.all([
    params,
    requireRole(Role.ADMIN),
  ]);

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      level: { select: { id: true, levelNumber: true, isActive: true } },
    },
  });
  if (!subject) notFound();

  const modules = await getAdminSubjectContentWorkspace({
    subjectId,
    actor,
    hierarchyIsActive: subject.isActive && subject.level.isActive,
  });

  const eligibleModules = modules
    .filter((moduleRecord) => moduleRecord.canAddResource)
    .map((moduleRecord) => ({
      id: moduleRecord.id,
      title: moduleRecord.title,
      subjectName: subject.name,
    }));

  const subjectHref = `/dashboard/admin/content/subjects/${encodeURIComponent(subject.id)}`;

  if (eligibleModules.length === 0) {
    return (
      <div className="space-y-6">
        <ContentPageHeader
          eyebrow="Crear contenido"
          title="Nuevo recurso"
          description={`Añade contenido a ${subject.name}.`}
          breadcrumbs={[
            ...adminCatalogBreadcrumbs,
            {
              label: `Nivel ${subject.level.levelNumber}`,
              href: `/dashboard/admin/content/levels/${encodeURIComponent(subject.level.id)}`,
            },
            { label: subject.name, href: subjectHref },
            { label: "Nuevo recurso" },
          ]}
        />
        <ContentFormSurface wide>
          <div className="mb-4 flex justify-end">
            <ResourceCreationHelp
              title="Ayuda rápida"
              note="Necesitas un módulo disponible para poder crear el recurso."
              items={[
                "Primero habilita o selecciona un módulo de esta materia.",
                "Después completa el título y el contenido educativo.",
                "Si no hay módulos activos, vuelve a la materia para revisar su estado.",
              ]}
            />
          </div>
          <p role="alert" className="rounded-lg bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
            No hay módulos disponibles para añadir recursos en esta materia.
          </p>
          <div className="mt-4">
            <a
              href={subjectHref}
              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              Volver a la materia
            </a>
          </div>
        </ContentFormSurface>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ContentPageHeader
        eyebrow="Crear contenido"
        title="Nuevo recurso"
        description={`Añade contenido a ${subject.name}.`}
        breadcrumbs={[
          ...adminCatalogBreadcrumbs,
          {
            label: `Nivel ${subject.level.levelNumber}`,
            href: `/dashboard/admin/content/levels/${encodeURIComponent(subject.level.id)}`,
          },
          { label: subject.name, href: subjectHref },
          { label: "Nuevo recurso" },
        ]}
      />
      <ContentFormSurface wide>
        <div className="relative -mt-3 sm:-mt-4">
          <div className="absolute right-0 top-0 z-10">
            <ResourceCreationHelp
              title="Ayuda rápida"
              note="Elige el módulo correcto antes de completar el recurso."
              items={[
                "Selecciona el módulo que corresponda a este recurso.",
                "Completa el título, el contenido y, si quieres, una descripción.",
                "Adjunta opcionalmente un archivo, imagen, vínculo o video.",
              ]}
            />
          </div>
          <CreateResourceForm
            modules={eligibleModules}
            requestId={randomUUID()}
            closeHref={subjectHref}
            subjectId={subject.id}
          />
        </div>
      </ContentFormSurface>
    </div>
  );
}
