import { Check, Circle, CircleAlert, Clock3 } from "lucide-react";

import { PaymentStatus } from "@/generated/prisma/enums";

type TimelineState = "complete" | "active" | "pending" | "error";

function timelineStates(status: PaymentStatus): TimelineState[] {
  if (status === PaymentStatus.SUCCEEDED) {
    return ["complete", "complete", "complete", "complete"];
  }
  if (
    status === PaymentStatus.FAILED ||
    status === PaymentStatus.CANCELED ||
    status === PaymentStatus.REFUNDED
  ) {
    return ["complete", "pending", "error", "pending"];
  }
  if (status === PaymentStatus.REQUIRES_REVIEW) {
    return ["complete", "complete", "error", "pending"];
  }
  if (status === PaymentStatus.PROCESSING) {
    return ["complete", "active", "pending", "pending"];
  }
  return ["complete", "active", "pending", "pending"];
}

const labels = [
  "Solicitud creada",
  "Preparando o esperando la transferencia",
  "Confirmación del proveedor",
  "Nivel desbloqueado",
] as const;

export function PaymentStatusTimeline({ status }: { status: PaymentStatus }) {
  const states = timelineStates(status);
  return (
    <section aria-labelledby="payment-progress-heading" className="rounded-[1.15rem] border border-[var(--subscription-border)] bg-[var(--subscription-panel)] px-4 py-4 shadow-[0_5px_20px_rgba(15,23,42,0.035)] sm:px-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="payment-progress-heading" className="text-sm font-extrabold text-[var(--subscription-text)]">Progreso del pago</h2>
        <p className="hidden text-xs text-[var(--subscription-muted)] sm:block">El estado se actualiza desde el proveedor.</p>
      </div>
      <ol className="mt-4 grid grid-cols-4">
        {labels.map((label, index) => {
          const state = states[index];
          const Icon = state === "complete" ? Check : state === "active" ? Clock3 : state === "error" ? CircleAlert : Circle;
          return (
            <li key={label} className="relative flex min-w-0 flex-col items-center text-center">
              {index > 0 ? <span aria-hidden="true" className={`absolute right-1/2 top-[15px] h-0.5 w-full ${states[index - 1] === "complete" ? "bg-emerald-500" : "bg-[var(--subscription-border)]"}`} /> : null}
              <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${state === "complete" ? "border-emerald-500 bg-emerald-500 text-white" : state === "active" ? "border-amber-500 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : state === "error" ? "border-rose-500 bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" : "border-[var(--subscription-border)] bg-[var(--subscription-bg)] text-[var(--subscription-muted)]"}`}>
                <Icon aria-hidden="true" className="h-4 w-4" />
              </span>
              <span className={`mt-2 max-w-32 px-1 text-[0.68rem] font-bold leading-4 sm:text-xs ${state === "pending" ? "text-[var(--subscription-muted)]" : "text-[var(--subscription-text)]"}`}>
                {label}{state === "active" ? <span className="sr-only">, paso actual</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
