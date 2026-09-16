import { ContentFormSurface } from "@/modules/content/components/admin/ContentFormSurface";
import { ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { CreateModuleForm } from "@/modules/content/components/admin/creation/CreateModuleForm";
import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/server/auth/guards";
import { getCollaboratorContentWorkspace } from "@/server/content/collaborator-content-queries";
import Link from "next/link";

export default async function CollaboratorCreateModulePage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string | string[] }>;
}) {
  const params = await searchParams;
  const user = await requireRole(Role.COLLABORATOR);
  const workspace = await getCollaboratorContentWorkspace(user.id);
  const subjectId = typeof params.subjectId === "string" ? params.subjectId : undefined;
  const subject = workspace.subjects.find((item) => item.id === subjectId);

  return (
    <div className="space-y-8">
      <ContentPageHeader
        eyebrow="Crear contenido"
        title="Nuevo módulo"
        description="Guarda el módulo como borrador o envíalo a revisión dentro de una materia activa."
        breadcrumbs={[{ label: "Mis contenidos", href: "/dashboard/collaborator/content" }, { label: "Nuevo módulo" }]}
      />
      {subject ? (
        <ContentFormSurface>
          <CreateModuleForm
            subjectId={subject.id}
            mode="collaborator"
            closeHref={`/dashboard/collaborator/content/subjects/${encodeURIComponent(subject.id)}`}
          />
        </ContentFormSurface>
      ) : (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-foreground">Selecciona una materia</h2>
          <p className="mt-1 text-sm text-muted">El nuevo módulo quedará asociado a la materia elegida.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {workspace.subjects.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/dashboard/collaborator/content/modules/new?subjectId=${encodeURIComponent(item.id)}`}
                  className="block rounded-xl border border-border p-4 text-sm font-medium text-foreground hover:border-secondary/40 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                >
                  Nivel {item.level.levelNumber} — {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
