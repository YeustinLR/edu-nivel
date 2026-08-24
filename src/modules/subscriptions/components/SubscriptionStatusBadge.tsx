import type { LearnerSubscriptionEffectiveStatus } from "@/modules/subscriptions/types/learner-subscription";

const presentation: Record<
  LearnerSubscriptionEffectiveStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Activa",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 before:bg-emerald-500 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  EXPIRED: {
    label: "Vencida",
    className:
      "border-amber-200 bg-amber-50 text-amber-800 before:bg-amber-500 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300",
  },
  CANCELED: {
    label: "Cancelada",
    className:
      "border-slate-200 bg-slate-50 text-slate-700 before:bg-slate-400 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-300",
  },
  REFUNDED: {
    label: "Reembolsada",
    className:
      "border-rose-200 bg-rose-50 text-rose-700 before:bg-rose-500 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300",
  },
  INACTIVE: {
    label: "Inactiva",
    className:
      "border-rose-200 bg-rose-50 text-rose-700 before:bg-rose-500 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300",
  },
};

export function SubscriptionStatusBadge({
  status,
}: {
  status: LearnerSubscriptionEffectiveStatus;
}) {
  const item = presentation[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold before:h-1.5 before:w-1.5 before:rounded-full ${item.className}`}
    >
      {item.label}
    </span>
  );
}
