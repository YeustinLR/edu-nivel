import {
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  GraduationCap,
  MonitorSmartphone,
  ReceiptText,
  UserRound,
  XCircle,
} from "lucide-react";

import {
  PaymentStatus,
  PlanCode,
  SubscriptionProduct,
  SubscriptionStatus,
} from "@/generated/prisma/enums";
import { amountMinorToCRC } from "@/modules/subscriptions/config/plan-catalog";
import { AdminUserSuspensionControl } from "@/modules/users/components/admin/AdminUserSuspensionControl";
import { AdminUserDeletionControl } from "@/modules/users/components/admin/AdminUserDeletionControl";
import { userRoleLabels } from "@/modules/users/domain/user-role";
import type { AdminUserDetail } from "@/server/users/admin-user-detail-queries";

const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const crcFormatter = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

const subscriptionProductLabels: Record<SubscriptionProduct, string> = {
  [SubscriptionProduct.STUDENT_PREMIUM]: "Premium estudiante",
  [SubscriptionProduct.TEACHER_PREMIUM]: "Premium docente",
};

const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.ACTIVE]: "Activa",
  [SubscriptionStatus.CANCELED]: "Cancelada",
  [SubscriptionStatus.EXPIRED]: "Vencida",
  [SubscriptionStatus.REFUNDED]: "Reembolsada",
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  [PaymentStatus.INITIALIZING]: "Inicializando",
  [PaymentStatus.PROCESSING]: "En proceso",
  [PaymentStatus.SUCCEEDED]: "Confirmado",
  [PaymentStatus.FAILED]: "Fallido",
  [PaymentStatus.CANCELED]: "Cancelado",
  [PaymentStatus.REFUNDED]: "Reembolsado",
  [PaymentStatus.REQUIRES_REVIEW]: "Requiere revisión",
};

const planLabels: Record<PlanCode, string> = {
  [PlanCode.STUDENT_MONTHLY]: "Estudiante mensual",
  [PlanCode.STUDENT_YEARLY]: "Estudiante anual",
  [PlanCode.TEACHER_MONTHLY]: "Docente mensual",
  [PlanCode.TEACHER_YEARLY]: "Docente anual",
};

function statusClass(status: SubscriptionStatus | PaymentStatus) {
  if (
    status === SubscriptionStatus.ACTIVE ||
    status === PaymentStatus.SUCCEEDED
  ) {
    return "bg-success/10 text-success";
  }
  if (
    status === PaymentStatus.PROCESSING ||
    status === PaymentStatus.INITIALIZING ||
    status === PaymentStatus.REQUIRES_REVIEW
  ) {
    return "bg-amber-500/10 text-amber-800 dark:text-amber-200";
  }
  return "bg-surface-elevated text-muted";
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof BookOpen;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
        <Icon aria-hidden="true" className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xl font-semibold leading-none text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

export function AdminUserDetailView({ user }: { user: AdminUserDetail }) {
  const now = new Date();

  return (
    <div className="space-y-5">
      <AdminUserSuspensionControl
        userId={user.id}
        canManage={user.canManageSuspension}
        suspendedAt={user.suspendedAt}
        suspensionReason={user.suspensionReason}
        suspensionExpiresAt={user.suspensionExpiresAt}
      />
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
              <UserRound aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-foreground">
                {user.name}
              </h2>
              <p className="truncate text-sm text-muted">{user.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">
                  {userRoleLabels[user.role]}
                </span>
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                    <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
                    {user.adminCreatedAt ? "Verificado por administrador" : "Correo verificado"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                    <XCircle aria-hidden="true" className="h-3.5 w-3.5" />
                    Correo sin verificar
                  </span>
                )}
                {user.setupPending ? (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                    Configuración pendiente
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <dl className="divide-y divide-border rounded-xl border border-border bg-card px-4 sm:px-5">
          <div className="flex justify-between gap-4 py-3 text-sm">
            <dt className="text-muted">Nivel seleccionado</dt>
            <dd className="text-right font-medium text-foreground">
              {user.selectedLevel
                ? `Nivel ${user.selectedLevel.levelNumber}`
                : "Sin seleccionar"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3 text-sm">
            <dt className="text-muted">Registrado</dt>
            <dd className="font-medium text-foreground">
              {dateFormatter.format(user.createdAt)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3 text-sm">
            <dt className="text-muted">Última actualización</dt>
            <dd className="font-medium text-foreground">
              {dateFormatter.format(user.updatedAt)}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="user-activity-heading">
        <h2 id="user-activity-heading" className="sr-only">Actividad del usuario</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Módulos creados" value={user.counts.modules} icon={BookOpen} />
          <Metric label="Recursos creados" value={user.counts.resources} icon={FileText} />
          <Metric label="Suscripciones" value={user.counts.subscriptions} icon={GraduationCap} />
          <Metric label="Pagos" value={user.counts.payments} icon={CircleDollarSign} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-border bg-card xl:col-span-2">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h2 className="font-semibold text-foreground">Sesiones</h2>
            <p className="mt-0.5 text-sm text-muted">
              {user.counts.sessions} en total; se muestran las cinco más recientes.
            </p>
          </div>
          {user.recentSessions.length > 0 ? (
            <ul className="divide-y divide-border">
              {user.recentSessions.map((session) => {
                const isActive = session.expiresAt > now;

                return (
                  <li
                    key={session.id}
                    className="flex items-start gap-3 px-4 py-3 sm:px-5"
                  >
                    <MonitorSmartphone
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-muted"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Sesión iniciada el {dateFormatter.format(session.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Última actividad: {dateFormatter.format(session.updatedAt)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        isActive
                          ? "bg-success/10 text-success"
                          : "bg-surface-elevated text-muted"
                      }`}
                    >
                      {isActive ? "Activa" : "Expirada"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted">
              No tiene sesiones registradas.
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h2 className="font-semibold text-foreground">Suscripciones</h2>
            <p className="mt-0.5 text-sm text-muted">Accesos asociados por nivel.</p>
          </div>
          {user.subscriptions.length > 0 ? (
            <ul className="divide-y divide-border">
              {user.subscriptions.map((subscription) => (
                <li key={subscription.id} className="flex items-start justify-between gap-4 px-4 py-3 sm:px-5">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {subscriptionProductLabels[subscription.product]}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Nivel {subscription.levelNumber} · Hasta {dateFormatter.format(subscription.currentPeriodEnd)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(subscription.status)}`}>
                    {subscriptionStatusLabels[subscription.status]}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted">No tiene suscripciones.</p>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h2 className="font-semibold text-foreground">Pagos recientes</h2>
            <p className="mt-0.5 text-sm text-muted">Últimos cinco registros, sin datos sensibles.</p>
          </div>
          {user.recentPayments.length > 0 ? (
            <ul className="divide-y divide-border">
              {user.recentPayments.map((payment) => (
                <li key={payment.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                  <ReceiptText aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{planLabels[payment.planCode]}</p>
                    <p className="mt-1 text-xs text-muted">
                      Nivel {payment.levelNumber} · {dateFormatter.format(payment.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-foreground">
                      {crcFormatter.format(amountMinorToCRC(payment.expectedAmountMinor))}
                    </p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(payment.status)}`}>
                      {paymentStatusLabels[payment.status]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-muted">No tiene pagos registrados.</p>
          )}
        </section>
      </div>
      <AdminUserDeletionControl
        userId={user.id}
        email={user.email}
        canDelete={user.canDelete}
      />
    </div>
  );
}
