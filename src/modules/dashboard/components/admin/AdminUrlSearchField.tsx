"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

export function AdminUrlSearchField({
  parameter,
  initialValue,
  label,
  placeholder,
}: {
  parameter: string;
  initialValue: string;
  label: string;
  placeholder: string;
}) {
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const previousInitialValueRef = useRef(initialValue);

  useEffect(() => {
    if (initialValue === previousInitialValueRef.current) return;
    previousInitialValueRef.current = initialValue;

    if (document.activeElement !== inputRef.current) {
      setValue(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    const currentValue = currentSearchParams.get(parameter) ?? "";
    if (value.trim() === currentValue) return;

    const timer = window.setTimeout(() => {
      const nextParams = new URLSearchParams(currentSearchParams.toString());
      const normalized = value.trim();
      if (normalized) nextParams.set(parameter, normalized);
      else nextParams.delete(parameter);
      nextParams.delete("page");
      const query = nextParams.toString();

      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [currentSearchParams, parameter, pathname, router, value]);

  return (
    <label className="block max-w-xl space-y-1.5 text-sm font-medium text-foreground">
      {label}
      <span className="relative block">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className="min-h-11 w-full rounded-lg border border-border bg-background py-2 pl-9 pr-10 text-sm font-normal text-foreground outline-none placeholder:text-muted focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/20"
        />
        {value ? (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label="Limpiar búsqueda"
            className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-surface-elevated hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </span>
      <span
        aria-live="polite"
        className="block min-h-4 text-xs font-normal text-muted"
      >
        {isPending
          ? "Actualizando resultados…"
          : "La búsqueda se aplica automáticamente."}
      </span>
    </label>
  );
}
