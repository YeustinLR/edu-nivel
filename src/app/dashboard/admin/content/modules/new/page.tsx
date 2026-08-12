import { Library } from "lucide-react";
import { redirect } from "next/navigation";

import { ContentFormSurface } from "@/modules/content/components/admin/ContentFormSurface";
import { adminCatalogBreadcrumbs, ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { CreateModuleForm } from "@/modules/content/components/admin/creation/CreateModuleForm";
import { getSubjectCreationContext } from "@/server/content/create-catalog-content";

export default async function CreateAdminModulePage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string | string[] }>;
}) {
  const params = await searchParams;
  const subjectId = typeof params.subjectId === "string" ? params.subjectId : undefined;
  if (!subjectId) redirect("/dashboard/admin/content/catalog");

  const subject = await getSubjectCreationContext(subjectId);
  if (!subject) redirect("/dashboard/admin/content/catalog");
  const subjectHref = `/dashboard/admin/content/subjects/${encodeURIComponent(subject.id)}`;
  const canCreate = subject.isActive && subject.level.isActive;

  return (
    <div className="space-y-6">
      <ContentPageHeader
        eyebrow="Crear contenido"
        title="Nuevo módulo"
        description={`Nivel ${subject.level.levelNumber} / ${subject.name}`}
        breadcrumbs={[
          ...adminCatalogBreadcrumbs,
          { label: `Nivel ${subject.level.levelNumber}`, href: `/dashboard/admin/content/levels/${encodeURIComponent(subject.level.id)}` },
          { label: subject.name, href: subjectHref },
          { label: "Nuevo módulo" },
        ]}
      />
      <ContentFormSurface
        aside={
          <div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <Library aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold text-foreground">Publicación flexible</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Guarda el módulo como borrador o publícalo directamente. Los módulos no requieren revisión editorial.
            </p>
          </div>
        }
      >
        {canCreate ? (
          <CreateModuleForm subjectId={subject.id} closeHref={subjectHref} />
        ) : (
          <p role="alert" className="rounded-lg bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
            Reactiva la materia y su nivel antes de crear módulos.
          </p>
        )}
      </ContentFormSurface>
    </div>
  );
}
