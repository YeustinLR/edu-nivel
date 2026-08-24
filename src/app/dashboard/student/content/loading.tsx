export default function StudentContentLoading() {
  return (
    <div
      className="space-y-5"
      aria-busy="true"
      aria-label="Cargando materias y recursos"
    >
      <span className="sr-only">Cargando materias y recursos</span>
      <div className="h-[74px] animate-pulse rounded-card border border-line bg-surface dark:border-[var(--student-border)] dark:bg-[var(--student-panel)]" />
      <div className="h-[230px] animate-pulse rounded-card bg-ink-900/90 motion-reduce:animate-none" />
      <div className="grid items-start gap-5 min-[1080px]:grid-cols-[330px_minmax(0,1fr)]">
        <div className="h-[430px] animate-pulse rounded-card border border-line bg-surface motion-reduce:animate-none dark:border-[var(--student-border)] dark:bg-[var(--student-panel)]" />
        <div className="h-[560px] animate-pulse rounded-card border border-line bg-surface motion-reduce:animate-none dark:border-[var(--student-border)] dark:bg-[var(--student-panel)]" />
      </div>
    </div>
  );
}
