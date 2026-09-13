import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileCheck2,
  MailPlus,
  Minus,
  TrendingUp,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { ProviderMode } from "@/generated/prisma/client";
import {
  getMetricDelta,
  type MetricComparison,
} from "@/modules/dashboard/domain/admin-dashboard";
import {
  AdminPageHeader,
  primaryActionClass,
} from "@/modules/dashboard/components/admin/AdminPageHeader";
import type { AdminDashboardSummary } from "@/server/dashboard/admin-dashboard-queries";

const crcFormatter = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat("es-CR");
const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  timeZone: "America/Costa_Rica",
});
const generatedAtFormatter = new Intl.DateTimeFormat("es-CR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Costa_Rica",
});

type AttentionItem = {
  key: string;
  title: string;
  description: string;
  count: number;
  href: string;
  action: string;
  icon: LucideIcon;
  tone: "critical" | "warning" | "neutral";
};

function daysWaiting(date: Date, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
}

export function getAdminAttentionItems(
  summary: AdminDashboardSummary,
): AttentionItem[] {
  const reviewAge = summary.attention.pendingReviews.oldestSubmittedAt
    ? daysWaiting(
        summary.attention.pendingReviews.oldestSubmittedAt,
        summary.generatedAt,
      )
    : null;

  const items: AttentionItem[] = [
    {
      key: "payment-review",
      title: "Cobros que requieren revisión",
      description: "ONVO no pudo resolver estos pagos automáticamente.",
      count: summary.attention.paymentsRequiringReview,
      href: "/dashboard/admin/payments",
      action: "Resolver cobros",
      icon: CreditCard,
      tone: "critical",
    },
    {
      key: "reviews",
      title: "Contenido pendiente de revisión",
      description: `${summary.attention.pendingReviews.modules} módulos y ${summary.attention.pendingReviews.resources} recursos${
        reviewAge === null
          ? " esperan una decisión editorial."
          : reviewAge === 0
            ? " · la entrega más antigua es de hoy."
            : ` · la más antigua espera hace ${reviewAge} ${reviewAge === 1 ? "día" : "días"}.`
      }`,
      count: summary.attention.pendingReviews.total,
      href: "/dashboard/admin/content/reviews",
      action: "Abrir revisiones",
      icon: FileCheck2,
      tone: "warning",
    },
    {
      key: "renewals",
      title: "Renovaciones sin recordatorio",
      description: "Accesos vencidos o que vencen en los próximos siete días.",
      count: summary.attention.renewalsNeedingReminder,
      href: "/dashboard/admin/notifications/renewals",
      action: "Enviar recordatorios",
      icon: Clock3,
      tone: "warning",
    },
    {
      key: "invitations",
      title: "Invitaciones expiradas",
      description: "Los enlaces deben reenviarse o cancelarse desde Usuarios.",
      count: summary.attention.expiredInvitations,
      href: "/dashboard/admin/users",
      action: "Administrar invitaciones",
      icon: MailPlus,
      tone: "neutral",
    },
  ];

  return items.filter((item) => item.count > 0);
}

function ComparisonText({
  metric,
  periodLabel,
  inverse = false,
}: {
  metric: MetricComparison;
  periodLabel: string;
  inverse?: boolean;
}) {
  const delta = getMetricDelta(metric);
  if (!delta) {
    return <span className="text-muted">Estado actual, sin histórico comparable</span>;
  }

  if (delta.direction === "flat") {
    return (
      <span className="inline-flex items-center gap-1 text-muted">
        <Minus aria-hidden="true" className="h-3.5 w-3.5" />
        Sin cambios frente al {periodLabel}
      </span>
    );
  }

  const positive = inverse
    ? delta.direction === "down"
    : delta.direction === "up";
  const Icon = delta.direction === "up" ? ArrowUpRight : ArrowDownRight;
  const amount = Math.abs(delta.absolute);
  const change =
    delta.percentage === null
      ? `${numberFormatter.format(amount)} ${
          delta.direction === "up" ? "más" : "menos"
        } que el período sin actividad`
      : `${Math.abs(delta.percentage).toFixed(0)}% ${
          delta.direction === "up" ? "más" : "menos"
        }`;

  return (
    <span
      className={`inline-flex items-center gap-1 ${
        positive
          ? "text-success"
          : "text-amber-700 dark:text-amber-300"
      }`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {change} frente al {periodLabel}
    </span>
  );
}

function MetricCard({
  title,
  value,
  metric,
  period,
  comparisonPeriod,
  icon: Icon,
  detail,
}: {
  title: string;
  value: string;
  metric: MetricComparison;
  period: string;
  comparisonPeriod: string;
  icon: LucideIcon;
  detail?: string;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {value}
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs font-medium text-foreground-secondary">{period}</p>
      <p className="mt-1 min-h-8 text-xs leading-4">
        {detail ?? (
          <ComparisonText metric={metric} periodLabel={comparisonPeriod} />
        )}
      </p>
    </article>
  );
}

function AttentionPanel({ summary }: { summary: AdminDashboardSummary }) {
  const items = getAdminAttentionItems(summary);

  return (
    <section
      aria-labelledby="admin-attention-heading"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
            Prioridad operativa
          </p>
          <h2 id="admin-attention-heading" className="mt-1 text-lg font-semibold text-foreground">
            Requiere atención
          </h2>
        </div>
        {items.length ? (
          <span className="mt-2 w-fit rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200 sm:mt-0">
            {items.reduce((total, item) => total + item.count, 0)} pendientes
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center px-5 py-9 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
            <CheckCircle2 aria-hidden="true" className="h-6 w-6" />
          </span>
          <h3 className="mt-3 font-semibold text-foreground">Todo está al día</h3>
          <p className="mt-1 max-w-md text-sm leading-6 text-muted">
            No hay revisiones, cobros, renovaciones ni invitaciones que requieran atención.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const Icon = item.icon;
            const tone =
              item.tone === "critical"
                ? "bg-red-500/10 text-red-700 dark:text-red-300"
                : item.tone === "warning"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "bg-secondary/10 text-secondary";

            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="group grid min-h-16 gap-3 px-4 py-4 transition-colors hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-5"
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{item.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tone}`}>
                        {item.count}
                      </span>
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-muted">{item.description}</span>
                  </span>
                  <span className="flex min-h-11 items-center gap-2 text-sm font-semibold text-secondary sm:justify-self-end">
                    {item.action}
                    <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function QuickActions() {
  const actions = [
    { label: "Revisar contenido", href: "/dashboard/admin/content/reviews", icon: FileCheck2 },
    { label: "Crear aviso", href: "/dashboard/admin/notifications/new", icon: BellRing },
    { label: "Invitar usuario", href: "/dashboard/admin/users/invitations/new", icon: UserPlus },
    { label: "Abrir catálogo", href: "/dashboard/admin/content/catalog", icon: BookOpen },
    { label: "Gestionar cobros", href: "/dashboard/admin/payments", icon: CreditCard },
  ];

  return (
    <section aria-labelledby="quick-actions-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="quick-actions-heading" className="text-lg font-semibold text-foreground">Acciones rápidas</h2>
        <p className="hidden text-xs text-muted sm:block">Continúa con una tarea frecuente</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="group flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-secondary/30 hover:bg-secondary/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <Icon aria-hidden="true" className="h-4 w-4" />
              </span>
              <span>{action.label}</span>
              <ArrowRight aria-hidden="true" className="ml-auto h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ContentHealth({ summary }: { summary: AdminDashboardSummary }) {
  const health = summary.contentHealth;
  const gaps = [
    {
      label: "Con cambios solicitados",
      value: health.changesRequested,
      href: "/dashboard/admin/content/reviews",
    },
    {
      label: "Módulos publicados sin recursos",
      value: health.modulesWithoutPublishedResources,
      href: "/dashboard/admin/content/catalog",
    },
    {
      label: "Materias activas sin módulos",
      value: health.subjectsWithoutPublishedModules,
      href: "/dashboard/admin/content/catalog",
    },
  ];

  return (
    <section
      aria-labelledby="content-health-heading"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:col-span-4 lg:col-start-9 lg:row-start-1"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">Catálogo</p>
          <h2 id="content-health-heading" className="mt-1 text-lg font-semibold text-foreground">Salud del contenido</h2>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
          <BookOpen aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface p-3">
          <dt className="text-xs text-muted">Módulos publicados</dt>
          <dd className="mt-1 text-2xl font-semibold text-foreground">{numberFormatter.format(health.publishedModules)}</dd>
        </div>
        <div className="rounded-xl bg-surface p-3">
          <dt className="text-xs text-muted">Recursos publicados</dt>
          <dd className="mt-1 text-2xl font-semibold text-foreground">{numberFormatter.format(health.publishedResources)}</dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-border pt-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Brechas accionables</p>
        <ul className="mt-2 divide-y divide-border">
          {gaps.map((gap) => (
            <li key={gap.label}>
              <Link href={gap.href} className="group flex min-h-11 items-center justify-between gap-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">
                <span className="text-foreground-secondary group-hover:text-foreground">{gap.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${gap.value ? "bg-amber-500/10 text-amber-800 dark:text-amber-200" : "bg-success/10 text-success"}`}>
                  {gap.value}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CollectionTrend({ summary }: { summary: AdminDashboardSummary }) {
  const largest = Math.max(
    1,
    ...summary.collectionTrend.map((bucket) => Math.abs(bucket.amountMinor)),
  );

  return (
    <section
      aria-labelledby="collection-trend-heading"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:col-span-8 lg:col-start-1 lg:row-start-1"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">Últimos 30 días</p>
          <h2 id="collection-trend-heading" className="mt-1 text-lg font-semibold text-foreground">Cobrado por semana</h2>
          <p className="mt-1 text-sm text-muted">Pagos confirmados y aplicados en el período.</p>
        </div>
        <span className="mt-2 w-fit rounded-full bg-surface-elevated px-3 py-1 text-xs font-medium text-muted sm:mt-0">
          Semanas de Costa Rica
        </span>
      </div>

      <ol aria-label="Cobrado por semana" className="mt-6 space-y-4">
        {summary.collectionTrend.map((bucket) => {
          const width = bucket.amountMinor === 0
            ? 0
            : Math.max(2, Math.round((Math.abs(bucket.amountMinor) / largest) * 100));
          const label = `${dateFormatter.format(bucket.start)}–${dateFormatter.format(new Date(bucket.end.getTime() - 1))}`;
          return (
            <li key={bucket.start.toISOString()} className="grid gap-2 sm:grid-cols-[7.5rem_minmax(0,1fr)_7.5rem] sm:items-center">
              <span className="text-xs font-medium text-muted">{label}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-surface-elevated" aria-hidden="true">
                <span
                  className="block h-full rounded-full bg-secondary"
                  style={{ width: `${width}%` }}
                />
              </span>
              <span className="text-sm font-semibold tabular-nums text-foreground sm:text-right">
                {crcFormatter.format(bucket.amountMinor / 100)}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="sr-only">Cada barra representa el monto cobrado durante esa semana.</p>
    </section>
  );
}

export function AdminDashboardOverview({ summary }: { summary: AdminDashboardSummary }) {
  const testMode = summary.paymentMode === ProviderMode.TEST;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 pb-8">
      <AdminPageHeader
        eyebrow="Administración"
        title="Panel principal"
        description={`Hola, ${summary.viewerName}. Revisa el estado operativo, financiero y educativo de EduNivel.`}
        metadata={
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="rounded-full bg-surface-elevated px-3 py-1.5 font-medium">Últimos 30 días</span>
            <span>Actualizado {generatedAtFormatter.format(summary.generatedAt)}</span>
            {testMode ? (
              <span className="rounded-full bg-amber-500/10 px-3 py-1.5 font-semibold text-amber-800 dark:text-amber-200">Datos de prueba · ONVO TEST</span>
            ) : (
              <span className="rounded-full bg-success/10 px-3 py-1.5 font-semibold text-success">ONVO LIVE</span>
            )}
          </div>
        }
        actions={
          <Link href="/dashboard/admin/notifications/new" className={primaryActionClass}>
            <BellRing aria-hidden="true" className="h-4 w-4" />
            Crear aviso
          </Link>
        }
      />

      <AttentionPanel summary={summary} />

      <section aria-labelledby="platform-metrics-heading">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">Vista general</p>
            <h2 id="platform-metrics-heading" className="mt-1 text-lg font-semibold text-foreground">Indicadores principales</h2>
          </div>
          <p className="hidden text-xs text-muted sm:block">Períodos semiabiertos, sin dobles conteos</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Cobrado"
            value={crcFormatter.format(summary.metrics.collected.current / 100)}
            metric={summary.metrics.collected}
            period="Últimos 30 días"
            comparisonPeriod="período anterior"
            icon={CircleDollarSign}
          />
          <MetricCard
            title="Accesos pagos vigentes"
            value={numberFormatter.format(summary.metrics.paidAccesses.current)}
            metric={summary.metrics.paidAccesses}
            period="Estado actual"
            comparisonPeriod="período anterior"
            icon={TrendingUp}
          />
          <MetricCard
            title="Nuevos usuarios verificados"
            value={numberFormatter.format(summary.metrics.newVerifiedUsers.current)}
            metric={summary.metrics.newVerifiedUsers}
            period="Últimos 30 días"
            comparisonPeriod="período anterior"
            icon={Users}
          />
          <MetricCard
            title="Usuarios activos"
            value={numberFormatter.format(summary.metrics.activeLearners.current)}
            metric={summary.metrics.activeLearners}
            period="Últimos 7 días"
            comparisonPeriod="período anterior"
            icon={FileCheck2}
          />
        </div>
      </section>

      <QuickActions />

      <div className="grid gap-4 lg:grid-cols-12">
        <ContentHealth summary={summary} />
        <CollectionTrend summary={summary} />
      </div>

      <aside className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-xs leading-5 text-muted">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p>Los indicadores financieros muestran únicamente el modo ONVO seleccionado. “Accesos pagos vigentes” no presenta variación histórica porque el modelo actual conserva el estado vigente, no fotografías anteriores.</p>
      </aside>
    </div>
  );
}
