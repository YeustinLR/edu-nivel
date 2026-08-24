export default function SubscriptionLoading() {
  return (
    <div className="student-subscription-theme space-y-5" aria-busy="true" aria-label="Cargando Mi suscripción">
      <span className="sr-only">Cargando Mi suscripción</span>
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--subscription-border)]" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-[var(--subscription-border)]" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.65fr)]">
        <div className="h-60 animate-pulse rounded-2xl border border-[var(--subscription-border)] bg-[var(--subscription-panel)]" />
        <div className="h-60 animate-pulse rounded-2xl border border-[var(--subscription-border)] bg-[var(--subscription-panel)]" />
      </div>
      <div className="h-44 animate-pulse rounded-2xl border border-[var(--subscription-border)] bg-[var(--subscription-panel)]" />
    </div>
  );
}
