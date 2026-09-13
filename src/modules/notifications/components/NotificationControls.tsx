"use client";

import { Check, Copy } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAllNotificationsReadAction, markNotificationReadAction, resendRenewalReminderAction } from "@/modules/notifications/actions/notification-actions";
import { NOTIFICATIONS_CHANGED } from "./NotificationBell";

export function NotificationReadButton({ recipientId, disabled = false }: { recipientId?: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return <div>
    <button type="button" disabled={disabled || pending} className="min-h-11 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary" onClick={() => startTransition(async () => {
      try {
        const result = recipientId ? await markNotificationReadAction(recipientId) : await markAllNotificationsReadAction();
        setMessage(result.message ?? "");
        if (result.status === "success") { window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED)); router.refresh(); }
      } catch { setMessage("No se pudo actualizar la lectura. Inténtalo de nuevo."); }
    })}>{pending ? "Actualizando…" : recipientId ? "Marcar como leída" : "Marcar todas como leídas"}</button>
    <p role="status" className="text-sm text-muted">{message}</p>
  </div>;
}

export function CopyIdentifierButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={copy} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted transition-colors hover:bg-surface-elevated hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">
      {copied ? <Check aria-hidden="true" className="size-3.5 text-success" /> : <Copy aria-hidden="true" className="size-3.5" />}
      {copied ? "Copiado" : label}
    </button>
  );
}

export function ResendNotificationButton({ recipientId }: { recipientId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const requestId = useRef<string | null>(null);
  const router = useRouter();
  return <div>
    {confirm && <p className="text-sm">Se creará un nuevo aviso sin leer para este destinatario.</p>}
    <button type="button" disabled={pending} className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50" onClick={() => {
      if (!confirm) { setConfirm(true); return; }
      requestId.current ??= crypto.randomUUID();
      startTransition(async () => {
        try {
          const result = await resendRenewalReminderAction({ recipientId, requestId: requestId.current });
          setMessage(result.message ?? "");
          if (result.notificationId) { window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED)); router.push(`/dashboard/admin/notifications/${result.notificationId}`); router.refresh(); }
        } catch { setMessage("No se pudo confirmar el envío. Reintenta esta misma solicitud."); }
      });
    }}>{pending ? "Enviando…" : confirm ? "Confirmar reenvío" : "Reenviar"}</button>
    {confirm && !pending && <button type="button" className="min-h-11 px-3 text-sm" onClick={() => setConfirm(false)}>Cancelar</button>}
    <p role="status" className="text-sm text-muted">{message}</p>
  </div>;
}
