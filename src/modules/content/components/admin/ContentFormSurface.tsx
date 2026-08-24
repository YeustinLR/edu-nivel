import type { ReactNode } from "react";

export function ContentFormSurface({
  children,
  aside,
  wide = false,
}: {
  children: ReactNode;
  aside?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`grid items-start gap-4 ${aside ? "lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]" : ""}`}>
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className={`mx-auto w-full ${wide ? "max-w-5xl" : "max-w-2xl"}`}>{children}</div>
      </section>
      {aside ? <aside className="rounded-xl border border-border bg-card p-4 sm:p-5">{aside}</aside> : null}
    </div>
  );
}
