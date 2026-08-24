export function StudentExploreSkeleton() {
  return (
    <div aria-label="Cargando catálogo de niveles" className="animate-pulse space-y-7">
      <div><div className="h-9 w-64 rounded-xl bg-[var(--student-soft)]" /><div className="mt-3 h-4 w-full max-w-xl rounded bg-[var(--student-soft)]" /></div>
      <div className="h-12 border-b border-[var(--student-border)]"><div className="h-full w-48 rounded bg-[var(--student-soft)]" /></div>
      <div className="flex gap-4 overflow-hidden">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-[182px] w-[255px] shrink-0 rounded-[1.15rem] bg-[var(--student-panel)]" />)}</div>
      <div className="h-[260px] rounded-[1.35rem] bg-[var(--student-panel)]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-[132px] rounded-[1.35rem] bg-[var(--student-panel)]" />)}</div>
    </div>
  );
}
