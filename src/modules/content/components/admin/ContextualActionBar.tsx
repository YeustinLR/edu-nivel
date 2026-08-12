import { CircleAlert, Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type ContextualAction = {
  label: string;
  href: string | null;
  unavailableReason?: string;
};

export function ContextualActionBar({
  children,
  primaryAction,
  secondaryAction,
}: {
  children: ReactNode;
  primaryAction?: ContextualAction;
  secondaryAction?: ContextualAction;
}) {
  const hasActionLinks = Boolean(primaryAction?.href || secondaryAction?.href);
  const unavailableReason =
    primaryAction && !primaryAction.href
      ? primaryAction.unavailableReason
      : undefined;
  const hasActions = hasActionLinks || Boolean(unavailableReason);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 sm:flex-1">{children}</div>

      {hasActions ? (
        <div className="w-full shrink-0 space-y-2 sm:w-auto sm:max-w-xs">
          {hasActionLinks ? (
            <nav
              aria-label="Acciones del contenido seleccionado"
              className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end"
            >
              {secondaryAction?.href ? (
                <Link
                  href={secondaryAction.href}
                  scroll={false}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border px-3.5 py-2 text-center text-sm font-medium text-foreground transition hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:w-auto"
                >
                  <Settings2
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0"
                  />
                  {secondaryAction.label}
                </Link>
              ) : null}

              {primaryAction?.href ? (
                <Link
                  href={primaryAction.href}
                  scroll={false}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-secondary px-3.5 py-2 text-center text-sm font-medium text-white transition hover:bg-secondary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:w-auto"
                >
                  <Plus aria-hidden="true" className="h-4 w-4 shrink-0" />
                  {primaryAction.label}
                </Link>
              ) : null}
            </nav>
          ) : null}

          {unavailableReason ? (
            <p
              role="status"
              className="flex items-start gap-1.5 text-xs leading-5 text-amber-700 dark:text-amber-300"
            >
              <CircleAlert
                aria-hidden="true"
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
              />
              <span>{unavailableReason}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
