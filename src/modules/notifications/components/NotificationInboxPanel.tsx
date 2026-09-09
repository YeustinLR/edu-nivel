"use client";

import {
  ArrowRight,
  BellOff,
  BellRing,
  CalendarClock,
  CircleAlert,
  LoaderCircle,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";
import { useFormStatus } from "react-dom";

import { openNotificationAction } from "@/modules/notifications/actions/notification-actions";
import {
  notificationDate,
  notificationTypeLabels,
} from "@/modules/notifications/domain/notifications";
import type { NotificationPreviewItem } from "@/modules/notifications/domain/notification-preview";

export type NotificationPreviewLoadState =
  | "idle"
  | "loading"
  | "ready"
  | "error";

const notificationIcons = {
  GENERAL_ALERT: BellRing,
  IMPORTANT_NOTICE: CircleAlert,
  SUBSCRIPTION_RENEWAL: CalendarClock,
} as const;

const visualByTone = {
  default: {
    surface: "bg-card text-foreground",
    border: "border-border",
    muted: "text-muted",
    soft: "bg-surface-elevated",
    hover: "hover:bg-surface-elevated",
    unread: "bg-[color-mix(in_srgb,var(--secondary)_7%,var(--card))]",
    accent: "bg-[color-mix(in_srgb,var(--secondary)_12%,transparent)] text-secondary",
    focus: "focus-visible:outline-secondary",
  },
  learner: {
    surface: "bg-[var(--student-panel)] text-[var(--student-text)]",
    border: "border-[var(--student-border)]",
    muted: "text-[var(--student-muted)]",
    soft: "bg-[var(--student-soft)]",
    hover: "hover:bg-[var(--student-soft)]",
    unread: "bg-[color-mix(in_srgb,var(--student-blue)_7%,var(--student-panel))]",
    accent: "bg-[var(--student-blue-soft)] text-[var(--student-blue)]",
    focus: "focus-visible:outline-[var(--student-blue)]",
  },
} as const;

function NotificationSubmitButton({
  item,
  tone,
}: {
  item: NotificationPreviewItem;
  tone: keyof typeof visualByTone;
}) {
  const { pending } = useFormStatus();
  const visual = visualByTone[tone];
  const Icon = notificationIcons[item.type];
  const unread = item.readAt === null;

  return (
    <button
      type="submit"
      disabled={pending}
      className={`group relative grid w-full grid-cols-[2.5rem_minmax(0,1fr)] gap-3 px-4 py-3.5 text-left transition-colors motion-reduce:transition-none disabled:cursor-wait disabled:opacity-65 sm:px-5 ${visual.hover} ${unread ? visual.unread : ""} focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${visual.focus}`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-9 items-center justify-center rounded-xl ${visual.accent}`}
      >
        {pending ? (
          <LoaderCircle className="size-[17px] animate-spin" />
        ) : (
          <Icon className="size-[17px]" strokeWidth={2} />
        )}
      </span>

      <span className="min-w-0">
        <span className="flex items-start gap-2">
          <span className={`min-w-0 flex-1 truncate text-sm ${unread ? "font-bold" : "font-semibold"}`}>
            {item.title}
          </span>
          {unread ? (
            <span
              aria-hidden="true"
              className={`mt-1.5 size-2 shrink-0 rounded-full ${tone === "learner" ? "bg-[var(--student-blue)]" : "bg-secondary"}`}
            />
          ) : null}
        </span>
        <span className={`mt-1 line-clamp-2 text-xs leading-5 ${visual.muted}`}>
          {item.excerpt}
        </span>
        <span className={`mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] ${visual.muted}`}>
          <span>{notificationTypeLabels[item.type]}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={item.receivedAt}>{notificationDate(item.receivedAt)}</time>
          {item.levelNumber ? (
            <>
              <span aria-hidden="true">·</span>
              <span>Nivel {item.levelNumber}</span>
            </>
          ) : null}
        </span>
        <span className="sr-only">
          {unread ? "Sin leer. " : ""}Abrir notificación.
        </span>
      </span>
    </button>
  );
}

function LoadingRows({ tone }: { tone: keyof typeof visualByTone }) {
  const visual = visualByTone[tone];
  return (
    <div role="status" aria-label="Cargando notificaciones" className="divide-y divide-current/8">
      {[0, 1, 2].map((item) => (
        <div key={item} className="grid animate-pulse grid-cols-[2.5rem_1fr] gap-3 px-4 py-4 sm:px-5">
          <span className={`size-9 rounded-xl ${visual.soft}`} />
          <span className="space-y-2 pt-0.5">
            <span className={`block h-3 w-3/5 rounded-full ${visual.soft}`} />
            <span className={`block h-2.5 w-full rounded-full ${visual.soft}`} />
            <span className={`block h-2.5 w-2/5 rounded-full ${visual.soft}`} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function NotificationInboxPanel({
  tone = "default",
  items,
  unreadCount,
  loadState,
  actionError,
  markAllPending,
  onClose,
  onRetry,
  onMarkAllRead,
  mobile = false,
}: {
  tone?: keyof typeof visualByTone;
  items: NotificationPreviewItem[];
  unreadCount: number | null;
  loadState: NotificationPreviewLoadState;
  actionError: string | null;
  markAllPending: boolean;
  onClose: () => void;
  onRetry: () => void;
  onMarkAllRead: () => void;
  mobile?: boolean;
}) {
  const visual = visualByTone[tone];
  const showLoading = loadState === "idle" || loadState === "loading";

  return (
    <section
      aria-labelledby={mobile ? "notification-inbox-mobile-title" : "notification-inbox-desktop-title"}
      className={`flex min-h-0 flex-1 flex-col overflow-hidden ${visual.surface}`}
    >
      <header className={`flex shrink-0 items-center gap-3 border-b px-4 py-3.5 sm:px-5 ${visual.border}`}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2
              id={mobile ? "notification-inbox-mobile-title" : "notification-inbox-desktop-title"}
              className="text-base font-bold tracking-[-0.015em]"
            >
              Notificaciones
            </h2>
            {unreadCount !== null && unreadCount > 0 ? (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${visual.accent}`}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </div>
          <p aria-live="polite" className={`mt-0.5 text-xs ${visual.muted}`}>
            {unreadCount === null
              ? "Tu bandeja personal"
              : unreadCount === 0
                ? "Estás al día"
                : `${unreadCount} ${unreadCount === 1 ? "pendiente" : "pendientes"}`}
          </p>
        </div>

        <button
          type="button"
          aria-label="Marcar todas las notificaciones como leídas"
          disabled={markAllPending || unreadCount === null || unreadCount === 0}
          onClick={onMarkAllRead}
          className={`min-h-10 rounded-lg px-2.5 text-xs font-semibold transition-colors disabled:opacity-45 ${visual.hover} ${visual.focus} focus-visible:outline-2 focus-visible:outline-offset-2`}
        >
          {markAllPending ? "Actualizando…" : "Marcar leídas"}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar notificaciones"
          className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${visual.muted} ${visual.hover} ${visual.focus} focus-visible:outline-2`}
        >
          <X aria-hidden="true" className="size-[18px]" />
        </button>
      </header>

      {actionError ? (
        <p role="alert" className="mx-4 mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300 sm:mx-5">
          {actionError}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {showLoading ? <LoadingRows tone={tone} /> : null}

        {loadState === "error" ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 py-8 text-center">
            <span aria-hidden="true" className={`flex size-11 items-center justify-center rounded-2xl ${visual.soft} ${visual.muted}`}>
              <RotateCcw className="size-5" />
            </span>
            <p className="mt-3 text-sm font-bold">No pudimos cargar tu bandeja</p>
            <p className={`mt-1 max-w-64 text-xs leading-5 ${visual.muted}`}>Tu sesión sigue activa. Puedes intentarlo nuevamente.</p>
            <button
              type="button"
              onClick={onRetry}
              className={`mt-4 min-h-10 rounded-xl border px-4 text-xs font-bold ${visual.border} ${visual.hover} ${visual.focus} focus-visible:outline-2 focus-visible:outline-offset-2`}
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {loadState === "ready" && items.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 py-8 text-center">
            <span aria-hidden="true" className={`flex size-12 items-center justify-center rounded-2xl ${visual.soft} ${visual.muted}`}>
              <BellOff className="size-5" />
            </span>
            <p className="mt-3 text-sm font-bold">Tu bandeja está vacía</p>
            <p className={`mt-1 max-w-64 text-xs leading-5 ${visual.muted}`}>Los avisos importantes de EduNivel aparecerán aquí.</p>
          </div>
        ) : null}

        {loadState === "ready" && items.length > 0 ? (
          <ul className={`divide-y ${tone === "learner" ? "divide-[var(--student-border)]" : "divide-border"}`}>
            {items.map((item) => (
              <li key={item.id}>
                <form action={openNotificationAction}>
                  <input type="hidden" name="recipientId" value={item.id} />
                  <NotificationSubmitButton item={item} tone={tone} />
                </form>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <footer className={`shrink-0 border-t p-2.5 ${visual.border}`}>
        <Link
          href="/dashboard/notifications"
          onClick={onClose}
          className={`group flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors ${visual.hover} ${visual.focus} focus-visible:outline-2 focus-visible:outline-offset-2`}
        >
          Ver todas las notificaciones
          <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </footer>
    </section>
  );
}
