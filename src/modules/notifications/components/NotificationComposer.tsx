"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { previewNotificationRecipientsAction, previewNotificationAudienceAction, sendNotificationAction, sendRenewalRemindersAction } from "@/modules/notifications/actions/notification-actions";
import { notificationDate } from "@/modules/notifications/domain/notifications";
import type { NotificationAudience } from "@/modules/notifications/schemas/notification.schema";
import { NOTIFICATIONS_CHANGED } from "./NotificationBell";

type Candidate = { id: string; name: string; email: string; role: string; levelNumber?: number; periodEnd?: string; alreadySent?: boolean; lastNotificationId?: string; lastRecipientId?: string };
const roles = ["STUDENT", "TEACHER", "COLLABORATOR", "ADMIN"] as const;
const roleNames = { STUDENT: "Estudiante", TEACHER: "Docente", COLLABORATOR: "Colaborador", ADMIN: "Administrador" };
const inputClass = "min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground";

export function NotificationComposer({ renewals = false, initialId = "" }: { renewals?: boolean; initialId?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<NotificationAudience["mode"]>("SELECTED_USERS");
  const [selectedRoles, setSelectedRoles] = useState<(typeof roles)[number][]>([]);
  const [type, setType] = useState("GENERAL_ALERT");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Map<string, Candidate>>(new Map());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [review, setReview] = useState<{ count: number; requestId: string; attempted?: boolean } | null>(null);
  const mounted = useRef(true);
  const searchSequence = useRef(0);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const reviewing = review !== null;

  useEffect(() => {
    if (reviewing) reviewHeading.current?.focus();
  }, [reviewing]);

  useEffect(() => {
    mounted.current = true;
    const sequence = ++searchSequence.current;
    previewNotificationRecipientsAction(renewals ? { subscriptionId: initialId } : { userId: initialId }, renewals)
      .then(result => {
        if (!mounted.current || sequence !== searchSequence.current) return;
        setItems(result.items); setTotalPages(result.totalPages); setPage(result.page);
        if (initialId) {
          const candidate: Candidate | undefined = result.items.find(item => item.id === initialId);
          if (candidate && !candidate.alreadySent) setSelected(new Map([[candidate.id, candidate]]));
        }
      }).catch(() => { if (mounted.current && sequence === searchSequence.current) setMessage("No se pudieron cargar los destinatarios. Utiliza Buscar para reintentar."); })
      .finally(() => { if (mounted.current && sequence === searchSequence.current) setLoading(false); });
    return () => { mounted.current = false; };
  }, [initialId, renewals]);

  async function search(nextPage = 1) {
    const sequence = ++searchSequence.current;
    setLoading(true); setMessage("");
    try {
      const result = await previewNotificationRecipientsAction({ q: query, role, page: String(nextPage) }, renewals);
      if (!mounted.current || sequence !== searchSequence.current) return;
      setItems(result.items); setTotalPages(result.totalPages); setPage(result.page);
    } catch { setMessage("No se pudieron cargar los destinatarios. Inténtalo de nuevo."); }
    finally { if (mounted.current && sequence === searchSequence.current) setLoading(false); }
  }
  function audience(): NotificationAudience {
    return mode === "ALL_USERS" ? { mode } : mode === "ROLES" ? { mode, roles: selectedRoles } : { mode, userIds: [...selected.keys()] };
  }
  async function prepare() {
    setMessage("");
    if (!renewals && (!title.trim() || !body.trim())) { setMessage("Escribe el título y el mensaje."); return; }
    if ((renewals || mode === "SELECTED_USERS") && !selected.size) { setMessage("Selecciona al menos un destinatario."); return; }
    if (!renewals && mode === "ROLES" && !selectedRoles.length) { setMessage("Selecciona al menos un rol."); return; }
    setBusy(true);
    try {
      const count = renewals ? selected.size : await previewNotificationAudienceAction(audience());
      if (!count || count > 10000) { setMessage("El envío debe tener entre 1 y 10.000 destinatarios habilitados."); return; }
      if (!renewals && mode === "SELECTED_USERS" && count !== selected.size) { setMessage("Una cuenta seleccionada ya no está habilitada. Actualiza la selección."); return; }
      setReview({ count, requestId: crypto.randomUUID() });
    } catch { setMessage("No se pudo verificar el alcance. Inténtalo de nuevo."); }
    finally { setBusy(false); }
  }
  async function send() {
    if (!review || busy) return;
    setReview({ ...review, attempted: true });
    setBusy(true); setMessage("");
    try {
      const result = renewals
        ? await sendRenewalRemindersAction({ requestId: review.requestId, subscriptions: [...selected.values()].map(item => ({ id: item.id, periodEnd: item.periodEnd })) })
        : await sendNotificationAction({ requestId: review.requestId, title, body, type, audience: audience() });
      setMessage(result.message ?? "");
      if (result.status === "error" && result.code && !["SEND_FAILED", "CONCURRENT_OPERATION"].includes(result.code)) {
        setReview(current => current && { ...current, attempted: false });
      }
      if (result.notificationId) {
        window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
        router.push(`/dashboard/admin/notifications/${result.notificationId}`); router.refresh();
      }
    } catch { setMessage("No se pudo confirmar el envío. Reintenta sin cambiar esta solicitud."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">
    {review ? <section aria-labelledby="confirm-notification" className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 id="confirm-notification" ref={reviewHeading} tabIndex={-1} className="text-lg font-semibold">Confirmar envío</h2>
      <p>{review.count} {renewals ? "suscripciones seleccionadas" : "destinatarios habilitados"}. Solo notificaciones internas.</p>
      <h3 className="font-semibold">{renewals ? "Recordatorio de renovación" : title}</h3>
      <p className="whitespace-pre-wrap break-words">{renewals ? "Consulta el vencimiento de tu acceso y renueva tu suscripción." : body}</p>
      {!renewals && mode !== "SELECTED_USERS" && <p className="text-sm text-muted">El total definitivo se calcula al confirmar. Solo incluye cuentas habilitadas en ese momento.</p>}
      <button type="button" disabled={busy} onClick={send} className="min-h-11 rounded-lg bg-secondary px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Enviando…" : "Confirmar y enviar"}</button>
      <button type="button" disabled={busy || review.attempted} onClick={() => { setReview(null); setMessage(""); }} className="min-h-11 px-4 disabled:opacity-50">Volver a editar</button>
      {review.attempted && !busy && <p className="text-sm">Si la respuesta se interrumpió, reintenta esta misma solicitud para evitar duplicados. También puedes consultar el historial antes de crear otro envío.</p>}
    </section> : <>
      {!renewals && <section className="grid gap-4 rounded-xl border border-border bg-card p-5">
        <label>Tipo<select value={type} onChange={e => setType(e.target.value)} className={inputClass}><option value="GENERAL_ALERT">Alerta general</option><option value="IMPORTANT_NOTICE">Aviso importante</option></select></label>
        <label>Título<input value={title} onChange={e => setTitle(e.target.value)} maxLength={150} required className={inputClass} /></label>
        <label>Mensaje<textarea value={body} onChange={e => setBody(e.target.value)} maxLength={5000} required rows={5} className={inputClass} /></label>
        <p className="text-sm text-muted">Texto plano, sin adjuntos. Los destinatarios no pueden responder.</p>
        <label>Destinatarios<select value={mode} onChange={e => setMode(e.target.value as NotificationAudience["mode"])} className={inputClass}><option value="SELECTED_USERS">Seleccionar usuarios</option><option value="ALL_USERS">Todos los usuarios habilitados</option><option value="ROLES">Todos los usuarios de uno o varios roles</option></select></label>
        {mode === "ROLES" && <fieldset><legend>Roles destinatarios</legend><div className="flex flex-wrap gap-4">{roles.map(value => <label key={value} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={selectedRoles.includes(value)} onChange={e => setSelectedRoles(current => e.target.checked ? [...current, value] : current.filter(item => item !== value))} />{roleNames[value]}</label>)}</div></fieldset>}
      </section>}
      {(renewals || mode === "SELECTED_USERS") && <section aria-label="Seleccionar destinatarios" className="space-y-4 rounded-xl border border-border bg-card p-5">
        <form onSubmit={e => { e.preventDefault(); void search(); }} className="flex flex-wrap items-end gap-3">
          <label className="flex-1">Buscar por nombre o correo<input value={query} maxLength={150} onChange={e => setQuery(e.target.value)} className={inputClass} /></label>
          <label>Rol<select value={role} onChange={e => setRole(e.target.value)} className={inputClass}><option value="">Todos</option>{roles.filter(value => !renewals || value === "STUDENT" || value === "TEACHER").map(value => <option key={value} value={value}>{roleNames[value]}</option>)}</select></label>
          <button disabled={loading} className="min-h-11 rounded-lg border border-border px-4">Buscar</button>
        </form>
        <p role="status">{selected.size} seleccionados. {loading ? "Cargando…" : "La selección se conserva al cambiar de página."}</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={loading} className="min-h-11 rounded-lg border border-border px-3" onClick={() => setSelected(current => { const next = new Map(current); items.filter(item => !item.alreadySent).forEach(item => next.set(item.id, item)); return next; })}>Seleccionar página</button>
          <button type="button" className="min-h-11 px-3" onClick={() => setSelected(new Map())}>Limpiar selección</button>
        </div>
        {!loading && !items.length && <p>No hay {renewals ? "suscripciones elegibles" : "usuarios habilitados"} con estos filtros.</p>}
        <ul aria-busy={loading} className="divide-y divide-border">{items.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
          <label className="flex min-h-11 min-w-0 flex-1 items-center gap-3"><input type="checkbox" disabled={loading || item.alreadySent} checked={selected.has(item.id)} onChange={e => setSelected(current => { const next = new Map(current); if (e.target.checked) next.set(item.id, item); else next.delete(item.id); return next; })} /><span className="min-w-0 break-words"><strong>{item.name}</strong><span className="block text-sm text-muted">{item.email} · {roleNames[item.role as keyof typeof roleNames]}</span>{item.periodEnd && <span className="block text-sm">Nivel {item.levelNumber} · Vencimiento: {notificationDate(item.periodEnd)}</span>}</span></label>
          {item.alreadySent && <span className="text-sm">Ya notificada. {item.lastNotificationId && <Link className="underline" href={`/dashboard/admin/notifications/${item.lastNotificationId}?recipientId=${encodeURIComponent(item.lastRecipientId ?? "")}`}>Historial y reenvío</Link>}</span>}
        </li>)}</ul>
        <nav aria-label="Páginas de destinatarios" className="flex items-center gap-3"><button type="button" disabled={loading || page <= 1} className="min-h-11 px-3 disabled:opacity-50" onClick={() => search(page - 1)}>Anterior</button><span>Página {page} de {totalPages}</span><button type="button" disabled={loading || page >= totalPages} className="min-h-11 px-3 disabled:opacity-50" onClick={() => search(page + 1)}>Siguiente</button></nav>
      </section>}
      <button type="button" disabled={busy || loading} onClick={prepare} className="min-h-11 rounded-lg bg-secondary px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Verificando…" : "Revisar envío"}</button>
    </>}
    <p role="status" aria-live="polite" className="text-sm text-foreground">{message}</p>
  </div>;
}
