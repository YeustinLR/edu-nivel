"use client";
export default function NotificationError({ reset }: { reset: () => void }) {
  return <div role="alert" className="space-y-3 rounded-xl border border-border p-5"><h2 className="font-semibold">No se pudieron cargar las notificaciones.</h2><p>Inténtalo nuevamente. Si estabas enviando un aviso, consulta el historial antes de crear otro.</p><button onClick={reset} className="min-h-11 rounded-lg border border-border px-4">Reintentar</button></div>;
}
