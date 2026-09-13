"use client";

import { BellRing, Check, ChevronLeft, ChevronRight, CircleAlert, Search, Send, UserRoundCheck, Users } from "lucide-react";
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
const inputClass = "min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-secondary focus:ring-2 focus:ring-secondary/20";
const secondaryButtonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
const audienceModes = [
  { value: "SELECTED_USERS", title: "Seleccionar usuarios", description: "Elige personas específicas.", icon: UserRoundCheck },
  { value: "ALL_USERS", title: "Todos los usuarios", description: "Todas las cuentas habilitadas.", icon: Users },
  { value: "ROLES", title: "Por roles", description: "Uno o varios grupos completos.", icon: UserRoundCheck },
] as const;

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
  return (
    <div className="space-y-6">
      <ol aria-label="Progreso del envío" className={`grid overflow-hidden rounded-2xl border border-border bg-card ${renewals ? "grid-cols-2" : "grid-cols-3"}`}>
        {(renewals ? ["Destinatarios", "Revisión"] : ["Mensaje", "Destinatarios", "Revisión"]).map((step, index, steps) => {
          const active = review ? index === steps.length - 1 : index < steps.length - 1;
          return <li key={step} className={`flex items-center gap-2 border-border px-3 py-3 text-xs font-semibold sm:px-4 ${index < steps.length - 1 ? "border-r" : ""} ${active ? "text-secondary" : "text-muted"}`}><span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${active ? "bg-secondary text-white" : "bg-surface-elevated"}`}>{review && index < steps.length - 1 ? <Check aria-hidden="true" className="size-3.5" /> : index + 1}</span><span className="truncate">{step}</span></li>;
        })}
      </ol>

      {review ? (
        <section aria-labelledby="confirm-notification" className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-gradient-to-br from-secondary/[0.1] via-card to-card p-5 sm:p-7">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-secondary/10 text-secondary"><Send aria-hidden="true" className="size-5" /></span>
            <h2 id="confirm-notification" ref={reviewHeading} tabIndex={-1} className="mt-4 text-xl font-semibold tracking-tight text-foreground">Revisa antes de enviar</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">El aviso se entregará dentro de EduNivel y los destinatarios no podrán responder.</p>
          </div>
          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Vista previa</p>
              <h3 className="mt-3 break-words text-lg font-semibold text-foreground">{renewals ? "Recordatorio de renovación" : title}</h3>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-foreground">{renewals ? "Consulta el vencimiento de tu acceso y renueva tu suscripción." : body}</p>
            </div>
            <aside className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Alcance</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{review.count}</p>
              <p className="mt-1 text-sm text-muted">{renewals ? "suscripciones seleccionadas" : "destinatarios habilitados"}</p>
              {!renewals && mode !== "SELECTED_USERS" ? <p className="mt-4 border-t border-border pt-4 text-xs leading-5 text-muted">El total definitivo vuelve a comprobarse al confirmar.</p> : null}
            </aside>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button type="button" disabled={busy || review.attempted} onClick={() => { setReview(null); setMessage(""); }} className={secondaryButtonClass}>Volver a editar</button>
            <button type="button" disabled={busy} onClick={send} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"><Send aria-hidden="true" className="size-4" />{busy ? "Enviando…" : "Confirmar y enviar"}</button>
          </div>
          {review.attempted && !busy ? <p className="border-t border-border px-5 py-3 text-xs leading-5 text-muted sm:px-7">Si la respuesta se interrumpió, reintenta esta misma solicitud para evitar duplicados. También puedes consultar el historial antes de crear otro envío.</p> : null}
        </section>
      ) : (
        <>
          {!renewals ? (
            <section aria-labelledby="notification-message-heading" className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
              <div className="space-y-5 p-5 sm:p-6">
                <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">Paso 1</p><h2 id="notification-message-heading" className="mt-1 text-lg font-semibold text-foreground">Escribe el mensaje</h2><p className="mt-1 text-sm text-muted">Sé breve y deja clara la acción que esperas del destinatario.</p></div>
                <label className="block space-y-1.5 text-sm font-medium text-foreground">Tipo<select value={type} onChange={e => setType(e.target.value)} className={inputClass}><option value="GENERAL_ALERT">Alerta general</option><option value="IMPORTANT_NOTICE">Aviso importante</option></select></label>
                <label className="block space-y-1.5 text-sm font-medium text-foreground">Título<input value={title} onChange={e => setTitle(e.target.value)} maxLength={150} required placeholder="Ej. Información importante para esta semana" className={inputClass} /><span className="block text-right text-xs font-normal text-muted">{title.length}/150</span></label>
                <label className="block space-y-1.5 text-sm font-medium text-foreground">Mensaje<textarea value={body} onChange={e => setBody(e.target.value)} maxLength={5000} required rows={7} placeholder="Escribe el contenido del aviso…" className={`${inputClass} resize-y py-3`} /><span className="flex justify-between text-xs font-normal text-muted"><span>Texto plano, sin adjuntos ni respuestas.</span><span>{body.length}/5000</span></span></label>
              </div>
              <aside className="border-t border-border bg-surface/50 p-5 lg:border-l lg:border-t-0 lg:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Vista previa</p>
                <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <span className={`flex size-10 items-center justify-center rounded-2xl ${type === "IMPORTANT_NOTICE" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-secondary/10 text-secondary"}`}>{type === "IMPORTANT_NOTICE" ? <CircleAlert aria-hidden="true" className="size-[18px]" /> : <BellRing aria-hidden="true" className="size-[18px]" />}</span>
                  <p className="mt-4 text-xs font-semibold text-muted">{type === "IMPORTANT_NOTICE" ? "Aviso importante" : "Alerta general"}</p>
                  <h3 className={`mt-2 break-words font-semibold ${title ? "text-foreground" : "text-muted"}`}>{title || "El título aparecerá aquí"}</h3>
                  <p className={`mt-3 whitespace-pre-wrap break-words text-sm leading-6 ${body ? "text-foreground" : "text-muted"}`}>{body || "Escribe un mensaje para ver cómo lo recibirán los usuarios."}</p>
                  <p className="mt-4 border-t border-border pt-3 text-xs text-muted">Administración de EduNivel</p>
                </div>
              </aside>
            </section>
          ) : null}

          <section aria-labelledby="notification-audience-heading" className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">Paso {renewals ? "1" : "2"}</p>
              <h2 id="notification-audience-heading" className="mt-1 text-lg font-semibold text-foreground">{renewals ? "Selecciona las suscripciones" : "Define los destinatarios"}</h2>
              <p className="mt-1 text-sm text-muted">{renewals ? "Solo aparecen períodos vencidos o próximos a vencer que cumplen las reglas de renovación." : "El sistema comprobará que todas las cuentas sigan habilitadas antes del envío."}</p>
            </div>

            {!renewals ? (
              <fieldset className="p-5 sm:p-6">
                <legend className="sr-only">Forma de seleccionar destinatarios</legend>
                <div className="grid gap-3 md:grid-cols-3">
                  {audienceModes.map(option => {
                    const Icon = option.icon;
                    const selectedMode = mode === option.value;
                    return <label key={option.value} className={`relative cursor-pointer rounded-2xl border p-4 transition-colors ${selectedMode ? "border-secondary bg-secondary/[0.06] ring-1 ring-secondary" : "border-border hover:bg-surface/60"}`}><input type="radio" name="audience-mode" value={option.value} checked={selectedMode} onChange={() => setMode(option.value)} className="sr-only" /><span className={`flex size-9 items-center justify-center rounded-xl ${selectedMode ? "bg-secondary text-white" : "bg-surface-elevated text-muted"}`}><Icon aria-hidden="true" className="size-4" /></span><span className="mt-3 block text-sm font-semibold text-foreground">{option.title}</span><span className="mt-1 block text-xs leading-5 text-muted">{option.description}</span>{selectedMode ? <Check aria-hidden="true" className="absolute right-3 top-3 size-4 text-secondary" /> : null}</label>;
                  })}
                </div>
                {mode === "ROLES" ? <div className="mt-5 rounded-2xl bg-surface/70 p-4"><p className="text-sm font-semibold text-foreground">Roles destinatarios</p><div className="mt-3 flex flex-wrap gap-2">{roles.map(value => <label key={value} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${selectedRoles.includes(value) ? "border-secondary bg-secondary/[0.06] text-secondary" : "border-border bg-background text-foreground"}`}><input type="checkbox" className="accent-secondary" checked={selectedRoles.includes(value)} onChange={e => setSelectedRoles(current => e.target.checked ? [...current, value] : current.filter(item => item !== value))} />{roleNames[value]}</label>)}</div></div> : null}
              </fieldset>
            ) : null}

            {(renewals || mode === "SELECTED_USERS") ? (
              <div className={`${!renewals ? "border-t border-border" : ""} p-5 sm:p-6`}>
                <form onSubmit={e => { e.preventDefault(); void search(); }} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-end">
                  <label className="block space-y-1.5 text-sm font-medium text-foreground">Buscar<span className="relative block"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input value={query} maxLength={150} onChange={e => setQuery(e.target.value)} placeholder="Nombre o correo" className={`${inputClass} pl-9`} /></span></label>
                  <label className="block space-y-1.5 text-sm font-medium text-foreground">Rol<select value={role} onChange={e => setRole(e.target.value)} className={inputClass}><option value="">Todos los roles</option>{roles.filter(value => !renewals || value === "STUDENT" || value === "TEACHER").map(value => <option key={value} value={value}>{roleNames[value]}</option>)}</select></label>
                  <button disabled={loading} className={secondaryButtonClass}><Search aria-hidden="true" className="size-4" />Buscar</button>
                </form>

                <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-surface/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p role="status" className="text-sm"><strong className="text-foreground">{selected.size} seleccionados</strong><span className="text-muted"> · {loading ? "Cargando…" : "La selección se conserva entre páginas."}</span></p>
                  <div className="flex flex-wrap gap-2"><button type="button" disabled={loading} className="min-h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-surface-elevated disabled:opacity-50" onClick={() => setSelected(current => { const next = new Map(current); items.filter(item => !item.alreadySent).forEach(item => next.set(item.id, item)); return next; })}>Seleccionar página</button><button type="button" disabled={!selected.size} className="min-h-9 rounded-lg px-3 text-xs font-semibold text-muted hover:bg-background disabled:opacity-40" onClick={() => setSelected(new Map())}>Limpiar selección</button></div>
                </div>

                {!loading && !items.length ? <div className="mt-5 rounded-2xl border border-dashed border-border px-5 py-10 text-center"><Users aria-hidden="true" className="mx-auto size-8 text-muted" /><p className="mt-3 text-sm font-semibold text-foreground">No hay {renewals ? "suscripciones elegibles" : "usuarios habilitados"}</p><p className="mt-1 text-xs text-muted">Prueba con otra búsqueda o rol.</p></div> : null}
                <ul aria-busy={loading} className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border">{items.map(item => <li key={item.id} className={`flex flex-col gap-3 p-3 sm:flex-row sm:items-center ${selected.has(item.id) ? "bg-secondary/[0.04]" : "bg-background"}`}>
                  <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3"><input type="checkbox" className="size-4 accent-secondary" disabled={loading || item.alreadySent} checked={selected.has(item.id)} onChange={e => setSelected(current => { const next = new Map(current); if (e.target.checked) next.set(item.id, item); else next.delete(item.id); return next; })} /><span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-sm font-semibold text-secondary">{item.name.charAt(0).toLocaleUpperCase("es-CR")}</span><span className="min-w-0 break-words"><strong className="block text-sm text-foreground">{item.name}</strong><span className="block truncate text-xs text-muted">{item.email} · {roleNames[item.role as keyof typeof roleNames]}</span>{item.periodEnd ? <span className="mt-1 block text-xs text-foreground">Nivel {item.levelNumber} · Vence: {notificationDate(item.periodEnd)}</span> : null}</span></label>
                  {item.alreadySent ? <span className="text-xs text-muted">Ya notificada. {item.lastNotificationId ? <Link className="font-semibold text-secondary hover:underline" href={`/dashboard/admin/notifications/${encodeURIComponent(item.lastNotificationId)}?recipientId=${encodeURIComponent(item.lastRecipientId ?? "")}`}>Ver historial</Link> : null}</span> : null}
                </li>)}</ul>

                <nav aria-label="Páginas de destinatarios" className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><span><button type="button" disabled={loading || page <= 1} className={secondaryButtonClass} onClick={() => search(page - 1)}><ChevronLeft aria-hidden="true" className="size-4" /><span className="hidden sm:inline">Anterior</span></button></span><span className="text-xs text-muted">Página {page} de {totalPages}</span><span className="flex justify-end"><button type="button" disabled={loading || page >= totalPages} className={secondaryButtonClass} onClick={() => search(page + 1)}><span className="hidden sm:inline">Siguiente</span><ChevronRight aria-hidden="true" className="size-4" /></button></span></nav>
              </div>
            ) : null}
          </section>

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-semibold text-foreground">¿Todo listo?</p><p className="mt-0.5 text-xs text-muted">Antes de enviar podrás revisar el mensaje y el alcance.</p></div>
            <button type="button" disabled={busy || loading} onClick={prepare} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">{busy ? "Verificando…" : "Revisar envío"}<ChevronRight aria-hidden="true" className="size-4" /></button>
          </div>
        </>
      )}

      {message ? <p role="status" aria-live="polite" className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">{message}</p> : null}
    </div>
  );
}
