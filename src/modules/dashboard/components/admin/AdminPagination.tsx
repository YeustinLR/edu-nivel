import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { secondaryActionClass } from "@/modules/dashboard/components/admin/AdminPageHeader";

export function AdminPagination({
  page,
  totalPages,
  previousHref,
  nextHref,
  ariaLabel,
  compact = false,
}: {
  page: number;
  totalPages: number;
  previousHref?: string;
  nextHref?: string;
  ariaLabel: string;
  compact?: boolean;
}) {
  const navigationClass = compact
    ? "inline-flex min-h-11 items-center justify-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:min-h-9"
    : secondaryActionClass;

  return (
    <nav
      aria-label={ariaLabel}
      className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:w-auto"
    >
      <span className="flex justify-start">
        {previousHref ? (
          <Link
            href={previousHref}
            aria-label="Página anterior"
            className={navigationClass}
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </Link>
        ) : null}
      </span>
      <span
        aria-current="page"
        className={`whitespace-nowrap px-2 text-foreground ${compact ? "text-xs" : "text-sm"}`}
      >
        Página {page} de {totalPages}
      </span>
      <span className="flex justify-end">
        {nextHref ? (
          <Link
            href={nextHref}
            aria-label="Página siguiente"
            className={navigationClass}
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : null}
      </span>
    </nav>
  );
}
