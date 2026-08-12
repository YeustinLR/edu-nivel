import { randomUUID } from "node:crypto";

import { ContentFormSurface } from "@/modules/content/components/admin/ContentFormSurface";
import { ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { UploadResourceForm } from "@/modules/content/components/UploadResourceForm";
import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/server/auth/guards";
import { getCollaboratorContentWorkspace } from "@/server/content/collaborator-content-queries";

export default async function CollaboratorCreateResourcePage() {
  const user = await requireRole(Role.COLLABORATOR);
  const workspace = await getCollaboratorContentWorkspace(user.id);

  return (
    <div className="space-y-8">
      <ContentPageHeader
        eyebrow="Crear contenido"
        title="Nuevo recurso"
        description="Guarda un recurso como borrador o envíalo a revisión dentro de uno de tus módulos disponibles."
        breadcrumbs={[{ label: "Mis contenidos", href: "/dashboard/collaborator/content" }, { label: "Nuevo recurso" }]}
      />
      <ContentFormSurface>
        <UploadResourceForm
          modules={workspace.moduleOptions}
          requestId={randomUUID()}
          successBaseHref="/dashboard/collaborator/content/resources"
        />
      </ContentFormSurface>
    </div>
  );
}
