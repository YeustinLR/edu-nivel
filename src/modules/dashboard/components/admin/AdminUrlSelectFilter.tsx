"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function AdminUrlSelectFilter({
  parameter,
  value,
  label,
  options,
  allLabel,
}: {
  parameter: string;
  value?: string;
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  allLabel: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="space-y-1.5 text-sm font-medium text-foreground">
      {label}
      <select
        value={value ?? ""}
        aria-busy={isPending}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          if (event.target.value) {
            params.set(parameter, event.target.value);
          } else {
            params.delete(parameter);
          }
          params.delete("page");
          const query = params.toString();
          startTransition(() => {
            router.replace(query ? `${pathname}?${query}` : pathname, {
              scroll: false,
            });
          });
        }}
        className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/20 disabled:opacity-50"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
