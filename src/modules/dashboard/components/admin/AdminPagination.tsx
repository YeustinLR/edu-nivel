import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { secondaryActionClass } from "@/modules/dashboard/components/admin/AdminPageHeader";

export function AdminPagination({
  page,
  totalPages,
  previousHref,
  nextHref,
  ariaLabel,
}: {
  page: number;
  totalPages: number;
  previousHref?: string;
  nextHref?: string;
  ariaLabel: string;
}) {
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
            className={secondaryActionClass}
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </Link>
        ) : null}
      </span>
      <span
        aria-current="page"
        className="whitespace-nowrap px-2 text-sm text-foreground"
      >
        Página {page} de {totalPages}
      </span>
      <span className="flex justify-end">
        {nextHref ? (
          <Link
            href={nextHref}
            aria-label="Página siguiente"
            className={secondaryActionClass}
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : null}
      </span>
    </nav>
  );
}
