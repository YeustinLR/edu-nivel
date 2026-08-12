"use client";

import { BookOpen, Boxes, FileText, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { LearnerSearchItem } from "@/modules/dashboard/types/learner-dashboard";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CR")
    .trim();
}

const kindLabels = {
  subject: "Materia",
  module: "Módulo",
  resource: "Recurso",
} as const;

export function filterLearnerSearchItems(
  items: LearnerSearchItem[],
  query: string,
) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];
  return items.filter((item) =>
    normalize(`${item.label} ${item.context}`).includes(normalizedQuery),
  );
}

export function LearnerDashboardSearch({ items }: { items: LearnerSearchItem[] }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const resultsId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const results = useMemo(
    () => filterLearnerSearchItems(items, query).slice(0, 7),
    [items, query],
  );
  const showResults = focused && query.trim().length > 0;

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setFocused(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[var(--student-muted)]"
      />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        placeholder="Buscar temas, recursos o materias..."
        aria-label="Buscar temas, recursos o materias"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={resultsId}
        aria-expanded={showResults}
        className="h-12 w-full rounded-2xl border border-[var(--student-border)] bg-[var(--student-panel)] pl-12 pr-11 text-sm text-[var(--student-text)] shadow-[0_2px_12px_rgba(15,42,79,0.04)] outline-none transition focus:border-[var(--student-blue)] focus:ring-4 focus:ring-[var(--student-blue-soft)]"
      />
      {query ? (
        <button
          type="button"
          onClick={() => setQuery("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--student-muted)] hover:bg-[var(--student-soft)] hover:text-[var(--student-text)]"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      ) : null}

      {showResults ? (
        <div id={resultsId} className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-[var(--student-border)] bg-[var(--student-panel)] shadow-[0_18px_50px_rgba(6,27,54,0.14)]">
          {results.length ? (
            <ul className="max-h-80 overflow-y-auto p-2">
              {results.map((item) => {
                const Icon = item.kind === "subject" ? BookOpen : item.kind === "module" ? Boxes : FileText;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        setFocused(false);
                        setQuery("");
                      }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[var(--student-soft)] focus-visible:outline-2 focus-visible:outline-[var(--student-blue)]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--student-blue-soft)] text-[var(--student-blue)]">
                        <Icon aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--student-text)]">{item.label}</span>
                        <span className="block truncate text-xs text-[var(--student-muted)]">{item.context}</span>
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--student-blue)]">{kindLabels[item.kind]}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-5 py-8 text-center">
              <Search aria-hidden="true" className="mx-auto h-6 w-6 text-[var(--student-muted)]" />
              <p className="mt-2 text-sm font-medium text-[var(--student-text)]">Sin resultados en tu nivel</p>
              <p className="mt-1 text-xs text-[var(--student-muted)]">Busca otra materia, módulo o recurso publicado.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
