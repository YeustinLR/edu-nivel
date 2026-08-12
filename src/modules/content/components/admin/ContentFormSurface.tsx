import type { ReactNode } from "react";

export function ContentFormSurface({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className={`grid items-start gap-4 ${aside ? "lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]" : ""}`}>
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mx-auto w-full max-w-2xl">{children}</div>
      </section>
      {aside ? <aside className="rounded-xl border border-border bg-card p-4 sm:p-5">{aside}</aside> : null}
    </div>
  );
}
