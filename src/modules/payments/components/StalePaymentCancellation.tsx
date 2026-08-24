"use client";

import { AlertTriangle } from "lucide-react";
import { useRef } from "react";

import { cancelStaleSinpePaymentAction } from "@/modules/payments/actions/reconcile-sinpe-payment";

export function StalePaymentCancellation({ paymentId }: { paymentId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-300 px-4 text-sm font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-400/30 dark:text-rose-300 dark:hover:bg-rose-500/10">
        Cancelar este intento
      </button>
      <dialog ref={dialogRef} className="m-auto w-[min(92vw,30rem)] rounded-2xl border border-[var(--subscription-border)] bg-[var(--subscription-panel)] p-0 text-[var(--subscription-text)] shadow-2xl backdrop:bg-slate-950/55">
        <div className="p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-xl font-extrabold">¿Cancelar este intento?</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--subscription-muted)]">
            Hazlo únicamente si no realizaste la transferencia. EduNivel consultará ONVO una vez más antes de cancelar para evitar perder una confirmación tardía.
          </p>
          <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => dialogRef.current?.close()} className="min-h-11 rounded-xl border border-[var(--subscription-border)] px-4 text-sm font-bold hover:bg-[var(--subscription-soft)]">Volver</button>
            <form action={cancelStaleSinpePaymentAction}>
              <input type="hidden" name="paymentId" value={paymentId} />
              <button type="submit" className="min-h-11 w-full rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700">Sí, cancelar intento</button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
