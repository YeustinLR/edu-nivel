import { ContentFormSurface } from "@/modules/content/components/admin/ContentFormSurface";
import { ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { CollaboratorModuleCreator } from "@/modules/content/components/collaborator/CollaboratorModuleCreator";
import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/server/auth/guards";
import { getCollaboratorContentWorkspace } from "@/server/content/collaborator-content-queries";

export default async function CollaboratorCreateModulePage() {
  const user = await requireRole(Role.COLLABORATOR);
  const workspace = await getCollaboratorContentWorkspace(user.id);

  return (
    <div className="space-y-8">
      <ContentPageHeader
        eyebrow="Crear contenido"
        title="Nuevo módulo"
        description="Guarda el módulo como borrador o publícalo directamente dentro de una materia activa."
        breadcrumbs={[{ label: "Mis contenidos", href: "/dashboard/collaborator/content" }, { label: "Nuevo módulo" }]}
      />
      <ContentFormSurface>
        <CollaboratorModuleCreator subjects={workspace.subjects} />
      </ContentFormSurface>
    </div>
  );
}
