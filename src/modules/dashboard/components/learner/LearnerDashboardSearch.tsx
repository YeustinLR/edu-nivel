"use client";

import { BookOpen, Boxes, FileText, GraduationCap, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type Ref } from "react";

import {
  isStudentExploreHref,
  studentExploreNavigateEvent,
  type StudentExploreNavigateDetail,
} from "@/modules/content/domain/student-explore-navigation";
import type { LearnerSearchItem } from "@/modules/dashboard/types/learner-dashboard";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CR")
    .trim();
}

const kindLabels = {
  level: "Nivel",
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
  const terms = normalizedQuery.split(/[^a-z0-9]+/).filter(Boolean);

  return items
    .map((item, index) => {
      const label = normalize(item.label);
      const context = normalize(item.context);
      const keywords = normalize(item.keywords?.join(" ") ?? "");
      const searchable = `${label} ${context} ${keywords}`;
      if (!terms.every((term) => searchable.includes(term))) return null;

      const score = label === normalizedQuery
        ? 0
        : label.startsWith(normalizedQuery)
          ? 1
          : label.includes(normalizedQuery)
            ? 2
            : terms.every((term) => label.includes(term))
              ? 3
              : keywords.includes(normalizedQuery)
                ? 4
                : context.includes(normalizedQuery)
                  ? 5
                  : 6;
      return { item, index, score };
    })
    .filter((match): match is { item: LearnerSearchItem; index: number; score: number } => match !== null)
    .sort((left, right) => left.score - right.score || left.index - right.index)
    .map((match) => match.item);
}

export function LearnerDashboardSearch({
  items,
  catalogMode = false,
  loadState = "ready",
  onRequestItems,
  inputRef,
  onNavigate,
}: {
  items: LearnerSearchItem[];
  catalogMode?: boolean;
  loadState?: "idle" | "loading" | "ready" | "error";
  onRequestItems?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const resultsId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const results = useMemo(
    () => filterLearnerSearchItems(items, query).slice(0, 8),
    [items, query],
  );
  const hasQuery = query.trim().length > 0;
  const showResults = focused && hasQuery;

  function closeSearch() {
    setFocused(false);
    setQuery("");
  }

  function navigateToResult(result: LearnerSearchItem) {
    closeSearch();
    onNavigate?.();
    if (
      pathname === "/dashboard/student/explore" &&
      isStudentExploreHref(result.href)
    ) {
      window.history.pushState(null, "", result.href);
      window.dispatchEvent(
        new CustomEvent<StudentExploreNavigateDetail>(studentExploreNavigateEvent, {
          detail: { href: result.href },
        }),
      );
      return;
    }
    router.push(result.href);
  }

  function openFirstResult() {
    const firstResult = results[0];
    if (firstResult) navigateToResult(firstResult);
  }

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
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          setFocused(true);
          onRequestItems?.();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setFocused(false);
            event.currentTarget.blur();
          } else if (event.key === "Enter" && hasQuery) {
            event.preventDefault();
            openFirstResult();
          }
        }}
        placeholder={catalogMode ? "Buscar niveles, materias o temas..." : "Buscar temas, recursos o materias..."}
        aria-label={catalogMode ? "Buscar niveles, materias o temas" : "Buscar temas, recursos o materias"}
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
          {loadState === "loading" || loadState === "idle" ? (
            <div className="px-5 py-8 text-center">
              <Search aria-hidden="true" className="mx-auto h-6 w-6 animate-pulse text-[var(--student-muted)]" />
              <p className="mt-2 text-sm font-medium text-[var(--student-text)]">Cargando búsqueda…</p>
            </div>
          ) : loadState === "error" ? (
            <div className="px-5 py-8 text-center">
              <Search aria-hidden="true" className="mx-auto h-6 w-6 text-[var(--student-muted)]" />
              <p className="mt-2 text-sm font-medium text-[var(--student-text)]">No pudimos cargar la búsqueda</p>
              <button type="button" onClick={onRequestItems} className="mt-2 text-xs font-semibold text-[var(--student-blue)]">Intentar nuevamente</button>
            </div>
          ) : results.length ? (
            <ul className="max-h-80 overflow-y-auto p-2">
              {results.map((item) => {
                const Icon = item.kind === "level" ? GraduationCap : item.kind === "subject" ? BookOpen : item.kind === "module" ? Boxes : FileText;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={(event) => {
                        event.preventDefault();
                        navigateToResult(item);
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
              <p className="mt-2 text-sm font-medium text-[var(--student-text)]">{catalogMode ? "Sin resultados publicados" : "Sin resultados en tu nivel"}</p>
              <p className="mt-1 text-xs text-[var(--student-muted)]">{catalogMode ? "Explorar no muestra borradores ni contenido en revisión." : "Busca otra materia, módulo o recurso publicado."}</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
