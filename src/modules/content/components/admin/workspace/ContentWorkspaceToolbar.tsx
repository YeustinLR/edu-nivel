"use client";

import { Search } from "lucide-react";

const fieldClass =
  "min-h-10 rounded-lg border border-border bg-background text-sm text-foreground outline-none transition focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/20";

export function ContentWorkspaceToolbar({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="border-b border-border p-3 lg:p-4">
      <label className="relative block max-w-2xl">
        <span className="sr-only">Buscar módulos o recursos</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar módulos o recursos..."
          className={`${fieldClass} w-full pl-9 pr-3`}
        />
      </label>
    </div>
  );
}
