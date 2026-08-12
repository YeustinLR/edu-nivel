import { FolderOpen, Layers, PlusCircle } from "lucide-react";

import { PublicationStatus } from "@/generated/prisma/client";
import { requireUser } from "@/server/auth/guards";
import { StatsCard } from "@/modules/dashboard/components/shared/StatsCard";
import { prisma } from "@/server/db/prisma";

export default async function CollaboratorDashboardPage() {
  const user = await requireUser();
  const [modules, publishedModules, resources] = await Promise.all([
    prisma.module.count({ where: { createdById: user.id } }),
    prisma.module.count({
      where: {
        createdById: user.id,
        publicationStatus: PublicationStatus.PUBLISHED,
      },
    }),
    prisma.resource.count({ where: { createdById: user.id } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Panel de Contenido
        </h1>
        <p className="text-sm text-muted">Bienvenido, {user.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard label="Módulos creados" value={modules} icon={Layers} />
        <StatsCard
          label="Módulos publicados"
          value={publishedModules}
          icon={FolderOpen}
        />
        <StatsCard label="Recursos totales" value={resources} icon={PlusCircle} />
      </div>
    </div>
  );
}
