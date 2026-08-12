import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export type AdminBreadcrumb = {
  label: string;
  href?: string;
};

export function AdminPageHeader({
  title,
  description,
  breadcrumbs = [],
  eyebrow,
  actions,
  metadata,
}: {
  title: string;
  description?: string;
  breadcrumbs?: AdminBreadcrumb[];
  eyebrow?: string;
  actions?: ReactNode;
  metadata?: ReactNode;
}) {
  return (
    <header className="space-y-4">
      {breadcrumbs.length > 0 ? (
        <nav aria-label="Migas de pan">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;

              return (
                <li
                  key={`${item.label}-${index}`}
                  className="flex items-center gap-1.5"
                >
                  {index > 0 ? (
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                  ) : null}
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className="rounded-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-secondary"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={isLast ? "page" : undefined}
                      className={
                        isLast ? "font-medium text-foreground" : undefined
                      }
                    >
                      {item.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={`${eyebrow ? "mt-1" : ""} break-words text-2xl font-semibold tracking-tight text-foreground`}
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">
              {description}
            </p>
          ) : null}
          {metadata ? <div className="mt-3">{metadata}</div> : null}
        </div>
        {actions ? (
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export const primaryActionClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

export const secondaryActionClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
