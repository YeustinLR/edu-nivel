import { Info } from "lucide-react";

export function ResourceCreationHelp({
  title,
  note,
  items,
}: {
  title: string;
  note?: string;
  items: readonly string[];
}) {
  return (
    <details className="group relative inline-block">
      <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-border bg-card text-muted shadow-sm transition hover:bg-surface-elevated hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary [&::-webkit-details-marker]:hidden">
        <Info aria-hidden="true" className="h-4 w-4" />
        <span className="sr-only">Abrir ayuda</span>
      </summary>

      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-2xl">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {note ? <p className="mt-1 text-sm leading-6 text-muted">{note}</p> : null}
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}
