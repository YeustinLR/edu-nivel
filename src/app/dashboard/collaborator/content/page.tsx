import { FilePlus2, Library, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import { parseModuleAudienceSelection } from "@/modules/content/domain/content-audience";
import { ContentPageHeader, primaryActionClass, secondaryActionClass } from "@/modules/content/components/admin/ContentPageHeader";
import { CollaboratorModuleList } from "@/modules/content/components/collaborator/CollaboratorModuleList";
import { CollaboratorTeamCatalog } from "@/modules/content/components/collaborator/CollaboratorTeamCatalog";
import { requireRole } from "@/server/auth/guards";
import {
  getCollaboratorContentWorkspace,
  normalizeCollaboratorTeamPage,
} from "@/server/content/collaborator-content-queries";

export default async function CollaboratorContentPage({
  searchParams,
}: {
  searchParams: Promise<{
    teamAudience?: string | string[];
    teamPage?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const user = await requireRole(Role.COLLABORATOR);
  const teamAudience = parseModuleAudienceSelection(params.teamAudience);
  const requestedTeamPage = normalizeCollaboratorTeamPage(
    typeof params.teamPage === "string" ? params.teamPage : undefined,
  );
  const workspace = await getCollaboratorContentWorkspace(user.id, {
    teamAudience,
    teamPage: requestedTeamPage,
  });
  if (requestedTeamPage > workspace.teamPagination.totalPages) {
    redirect(
      `/dashboard/collaborator/content?teamAudience=${teamAudience}#team-catalog`,
    );
  }
  const publishedModules = workspace.modules.filter((module) => module.publicationStatus === "PUBLISHED").length;
  const teamHref = (audience: "STUDENT" | "TEACHER", page = 1) => {
    const query = new URLSearchParams({ teamAudience: audience });
    if (page > 1) query.set("teamPage", String(page));
    return `/dashboard/collaborator/content?${query.toString()}#team-catalog`;
  };

  return (
    <div className="space-y-8">
      <ContentPageHeader
        eyebrow="Colaboración editorial"
        title="Mis contenidos"
        description="Publica tus módulos directamente y envía únicamente sus recursos a revisión cuando estén listos."
        actions={
          <>
            <Link href="/dashboard/collaborator/content/resources/new" className={secondaryActionClass}><FilePlus2 aria-hidden="true" className="h-4 w-4" />Añadir recurso</Link>
            <Link href="/dashboard/collaborator/content/modules/new" className={primaryActionClass}><Plus aria-hidden="true" className="h-4 w-4" />Crear módulo</Link>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Resumen de mis contenidos">
        <div className="rounded-xl border border-border bg-card p-5"><Library aria-hidden="true" className="h-5 w-5 text-secondary" /><p className="mt-3 text-sm text-muted">Mis módulos</p><p className="mt-1 text-2xl font-semibold text-foreground">{workspace.modules.length}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted">Publicados</p><p className="mt-1 text-2xl font-semibold text-foreground">{publishedModules}</p></div>
        <div className="rounded-xl border border-border bg-card p-5"><p className="text-sm text-muted">Recursos creados</p><p className="mt-1 text-2xl font-semibold text-foreground">{workspace.resourceCount}</p></div>
      </section>

      <CollaboratorModuleList modules={workspace.modules} />
      <CollaboratorTeamCatalog
        key={`${workspace.teamPagination.audience}-${workspace.teamPagination.page}`}
        modules={workspace.teamModules}
        pagination={workspace.teamPagination}
        hrefByAudience={{
          STUDENT: teamHref("STUDENT"),
          TEACHER: teamHref("TEACHER"),
        }}
        previousHref={
          workspace.teamPagination.page > 1
            ? teamHref(teamAudience, workspace.teamPagination.page - 1)
            : undefined
        }
        nextHref={
          workspace.teamPagination.page < workspace.teamPagination.totalPages
            ? teamHref(teamAudience, workspace.teamPagination.page + 1)
            : undefined
        }
      />
    </div>
  );
}
