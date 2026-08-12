import { ArrowRight, BookOpen, Clock3, TrendingUp, UserPlus, Users } from "lucide-react";
import Link from "next/link";

import { Role, SubscriptionStatus } from "@/generated/prisma/client";
import { ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { getAdminContentSummary } from "@/server/content/admin-content-queries";
import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

function DashboardMetric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 xl:p-2.5">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm text-muted">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p></div><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary"><Icon aria-hidden="true" className="h-5 w-5" /></span></div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const user = await requireUser();
  const [users, collaborators, activeModules, subscriptions, contentSummary] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { role: Role.COLLABORATOR, deletedAt: null } }),
    prisma.module.count({ where: { isActive: true } }),
    prisma.subscription.count({
      where: { status: SubscriptionStatus.ACTIVE, user: { deletedAt: null } },
    }),
    getAdminContentSummary(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <ContentPageHeader
        eyebrow="Administración"
        title={`Hola, ${user.name}`}
        description="Supervisa el estado real de la plataforma y continúa con las tareas que requieren atención."
      />

      <div className="mx-auto w-full max-w-4xl space-y-6">
        <section aria-labelledby="admin-overview-heading">
          <h2 id="admin-overview-heading" className="sr-only">Resumen de la plataforma</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardMetric label="Usuarios" value={users} icon={Users} />
            <DashboardMetric label="Colaboradores" value={collaborators} icon={UserPlus} />
            <DashboardMetric label="Módulos activos" value={activeModules} icon={BookOpen} />
            <DashboardMetric label="Suscripciones activas" value={subscriptions} icon={TrendingUp} />
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2" aria-labelledby="admin-priorities-heading">
          <h2 id="admin-priorities-heading" className="sr-only">Prioridades administrativas</h2>
          <Link href="/dashboard/admin/content/reviews" className="group rounded-xl border border-border bg-card p-4 hover:border-amber-500/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary lg:p-3.5">
            <div className="flex items-start justify-between gap-4"><span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300"><Clock3 aria-hidden="true" className="h-5 w-5" /></span><ArrowRight aria-hidden="true" className="h-5 w-5 text-muted transition-transform group-hover:translate-x-1 motion-reduce:transform-none" /></div>
            <p className="mt-3 text-3xl font-semibold text-foreground">{contentSummary.pendingReview.total}</p>
            <h2 className="mt-1 font-semibold text-foreground">Pendientes de revisión</h2>
            <p className="mt-1.5 text-sm leading-5 text-muted">{contentSummary.pendingReview.modules} módulos y {contentSummary.pendingReview.resources} recursos esperan una decisión editorial.</p>
          </Link>
          <Link href="/dashboard/admin/content/catalog" className="group rounded-xl border border-border bg-card p-4 hover:border-secondary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary lg:p-3.5">
            <div className="flex items-start justify-between gap-4"><span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary"><BookOpen aria-hidden="true" className="h-5 w-5" /></span><ArrowRight aria-hidden="true" className="h-5 w-5 text-muted transition-transform group-hover:translate-x-1 motion-reduce:transform-none" /></div>
            <p className="mt-3 text-3xl font-semibold text-foreground">{contentSummary.levelsConfigured}</p>
            <h2 className="mt-1 font-semibold text-foreground">Niveles configurados</h2>
            <p className="mt-1.5 text-sm leading-5 text-muted">Abre el catálogo para organizar materias, módulos y recursos.</p>
          </Link>
        </section>
      </div>
    </div>
  );
}
