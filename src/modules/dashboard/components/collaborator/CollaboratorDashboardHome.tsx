import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FilePlus2,
  History,
  Layers3,
  PencilLine,
  Plus,
  Send,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import {
  ContentPageHeader,
} from "@/modules/content/components/admin/ContentPageHeader";
import type {
  CollaboratorDashboardData,
  CollaboratorDashboardWorkItem,
} from "@/server/dashboard/collaborator-dashboard-queries";

const relativeTime = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

export function formatCollaboratorActivityDate(date: Date, now: Date) {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1_000);
  const absoluteSeconds = Math.abs(seconds);
  if (absoluteSeconds < 60) return "ahora";
  if (absoluteSeconds < 3_600) {
    return relativeTime.format(Math.round(seconds / 60), "minute");
  }
  if (absoluteSeconds < 86_400) {
    return relativeTime.format(Math.round(seconds / 3_600), "hour");
  }
  if (absoluteSeconds < 604_800) {
    return relativeTime.format(Math.round(seconds / 86_400), "day");
  }
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    timeZone: "America/Costa_Rica",
  }).format(date);
}

const statusPresentation = {
  DRAFT: {
    label: "Borrador",
    className: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  },
  IN_REVIEW: {
    label: "En revisión",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  CHANGES_REQUESTED: {
    label: "Cambios solicitados",
    className: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  PUBLISHED: {
    label: "Publicado",
    className: "bg-success/10 text-success",
  },
  UNPUBLISHED: {
    label: "Despublicado",
    className: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  },
} as const;

function StatusPill({ status }: { status: CollaboratorDashboardWorkItem["status"] }) {
  const presentation = statusPresentation[status];
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${presentation.className}`}
    >
      {presentation.label}
    </span>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center px-5 py-9 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-elevated text-muted">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-5 text-muted">{description}</p>
    </div>
  );
}

function PanelHeader({
  eyebrow,
  title,
  count,
  headingId,
  tone = "secondary",
}: {
  eyebrow: string;
  title: string;
  count?: number;
  headingId: string;
  tone?: "secondary" | "attention";
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
      <div>
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
            tone === "attention"
              ? "text-amber-700 dark:text-amber-300"
              : "text-secondary"
          }`}
        >
          {eyebrow}
        </p>
        <h2 id={headingId} className="mt-1 text-lg font-semibold text-foreground">
          {title}
        </h2>
      </div>
      {count ? (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            tone === "attention"
              ? "bg-amber-500/10 text-amber-800 dark:text-amber-200"
              : "bg-secondary/10 text-secondary"
          }`}
        >
          {count}
        </span>
      ) : null}
    </div>
  );
}

function WorkItemRow({
  item,
  now,
  action,
  showNote = false,
}: {
  item: CollaboratorDashboardWorkItem;
  now: Date;
  action: string;
  showNote?: boolean;
}) {
  const Icon = item.kind === "module" ? Layers3 : BookOpen;
  return (
    <li>
      <Link
        href={item.href}
        className="group grid min-h-20 gap-3 px-4 py-4 transition-colors hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-5"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">{item.title}</span>
            <StatusPill status={item.status} />
          </span>
          <span className="mt-1 block truncate text-xs text-muted">
            {item.context}
          </span>
          {showNote && item.reviewNote ? (
            <span className="mt-2 line-clamp-2 block text-sm leading-5 text-foreground-secondary">
              “{item.reviewNote}”
            </span>
          ) : (
            <span className="mt-1 block text-xs text-muted">
              Editado por {item.lastEditorName} · {formatCollaboratorActivityDate(item.updatedAt, now)}
            </span>
          )}
        </span>
        <span className="flex min-h-11 items-center gap-1.5 text-sm font-semibold text-secondary sm:justify-self-end">
          {action}
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </Link>
    </li>
  );
}

function QuickActions() {
  const actions = [
    {
      label: "Explorar catálogo",
      description: "Abre todos los niveles y materias",
      href: "/dashboard/collaborator/content/catalog",
      icon: BookOpen,
      primary: true,
    },
    {
      label: "Crear módulo",
      description: "Añade una unidad a una materia",
      href: "/dashboard/collaborator/content/modules/new",
      icon: Plus,
      primary: false,
    },
    {
      label: "Añadir recurso",
      description: "Selecciona cualquier módulo activo",
      href: "/dashboard/collaborator/content/resources/new",
      icon: FilePlus2,
      primary: false,
    },
  ];

  return (
    <section aria-labelledby="collaborator-quick-actions-heading">
      <h2 id="collaborator-quick-actions-heading" className="sr-only">
        Acciones rápidas
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={`group flex min-h-20 items-center gap-3 rounded-2xl border px-4 py-3.5 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
                action.primary
                  ? "border-secondary bg-secondary text-white hover:bg-secondary/90"
                  : "border-border bg-card text-foreground hover:border-secondary/30 hover:bg-secondary/[0.04]"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  action.primary
                    ? "bg-white/15 text-white"
                    : "bg-secondary/10 text-secondary"
                }`}
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{action.label}</span>
                <span
                  className={`mt-0.5 block text-xs leading-4 ${
                    action.primary ? "text-white/80" : "text-muted"
                  }`}
                >
                  {action.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function AttentionPanel({
  items,
  now,
}: {
  items: CollaboratorDashboardData["attention"];
  now: Date;
}) {
  return (
    <section
      aria-labelledby="collaborator-attention-heading"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <PanelHeader
        eyebrow="Prioridad editorial"
        title="Requiere atención"
        count={items.length}
        headingId="collaborator-attention-heading"
        tone="attention"
      />
      {items.length ? (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <WorkItemRow
              key={`${item.kind}-${item.id}`}
              item={item}
              now={now}
              action="Corregir"
              showNote
            />
          ))}
        </ul>
      ) : (
        <EmptyPanel
          icon={CheckCircle2}
          title="Todo está al día"
          description="No hay solicitudes de cambios pendientes para el equipo."
        />
      )}
    </section>
  );
}

function ContinueWorkingPanel({
  items,
  now,
}: {
  items: CollaboratorDashboardData["continueWorking"];
  now: Date;
}) {
  return (
    <section
      aria-labelledby="collaborator-continue-heading"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <PanelHeader
        eyebrow="Tu trabajo reciente"
        title="Continúa trabajando"
        headingId="collaborator-continue-heading"
      />
      {items.length ? (
        <>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <WorkItemRow
                key={`${item.kind}-${item.id}`}
                item={item}
                now={now}
                action="Continuar"
              />
            ))}
          </ul>
          <div className="border-t border-border px-4 py-3 sm:px-5">
            <Link
              href="/dashboard/collaborator/content"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              Ver Mis contenidos
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </>
      ) : (
        <EmptyPanel
          icon={PencilLine}
          title="No tienes borradores recientes"
          description="Crea contenido nuevo o abre el catálogo para colaborar con el equipo."
        />
      )}
    </section>
  );
}

function ReviewPanel({
  items,
  now,
}: {
  items: CollaboratorDashboardData["inReview"];
  now: Date;
}) {
  return (
    <section
      aria-labelledby="collaborator-review-heading"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <PanelHeader
        eyebrow="Seguimiento"
        title="En revisión"
        count={items.length}
        headingId="collaborator-review-heading"
      />
      {items.length ? (
        <>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <Link
                  href={item.href}
                  className="group flex min-h-20 items-start gap-3 px-4 py-4 transition-colors hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary sm:px-5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300">
                    <Clock3 aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-semibold text-foreground">
                      {item.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted">
                      {item.context}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      Enviado {formatCollaboratorActivityDate(item.updatedAt, now)}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="mt-2 h-4 w-4 shrink-0 text-secondary transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-4 py-3 sm:px-5">
            <Link
              href="/dashboard/collaborator/content"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              Ver todos
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </>
      ) : (
        <EmptyPanel
          icon={Send}
          title="Nada esperando revisión"
          description="Los contenidos que envíes aparecerán aquí hasta recibir una decisión."
        />
      )}
    </section>
  );
}

function TeamActivityPanel({
  items,
  now,
}: {
  items: CollaboratorDashboardData["teamActivity"];
  now: Date;
}) {
  return (
    <section
      aria-labelledby="collaborator-activity-heading"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <PanelHeader
        eyebrow="Colaboración"
        title="Actividad del equipo"
        headingId="collaborator-activity-heading"
      />
      {items.length ? (
        <>
          <ol className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="group flex min-h-16 gap-3 px-4 py-3.5 transition-colors hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary sm:px-5"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-muted">
                    <History aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 text-sm leading-5">
                    <span className="font-semibold text-foreground">{item.actorName}</span>{" "}
                    <span className="text-muted">{item.action}</span>{" "}
                    <span className="font-medium text-foreground">“{item.title}”</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {formatCollaboratorActivityDate(item.occurredAt, now)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <div className="border-t border-border px-4 py-3 sm:px-5">
            <Link
              href="/dashboard/collaborator/content/catalog"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              Abrir catálogo
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </>
      ) : (
        <EmptyPanel
          icon={Users}
          title="Sin actividad reciente"
          description="Los cambios editoriales del equipo aparecerán en este espacio."
        />
      )}
    </section>
  );
}

export function CollaboratorDashboardHome({
  userName,
  data,
}: {
  userName: string;
  data: CollaboratorDashboardData;
}) {
  return (
    <div className="space-y-7 sm:space-y-8">
      <ContentPageHeader
        eyebrow="Colaboración editorial"
        title={`Hola, ${userName}`}
        description="Continúa el trabajo editorial del equipo y atiende primero el contenido que necesita correcciones."
      />

      <QuickActions />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.85fr)]">
        <div className="space-y-5">
          <AttentionPanel items={data.attention} now={data.generatedAt} />
          <ContinueWorkingPanel
            items={data.continueWorking}
            now={data.generatedAt}
          />
        </div>
        <div className="space-y-5">
          <ReviewPanel items={data.inReview} now={data.generatedAt} />
          <TeamActivityPanel items={data.teamActivity} now={data.generatedAt} />
        </div>
      </div>

      <aside className="flex items-start gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-3.5 text-sm text-muted">
        <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
        <p className="leading-5">
          El catálogo es compartido: puedes continuar borradores del equipo, pero la aprobación y publicación final corresponden al administrador.
        </p>
      </aside>
    </div>
  );
}
