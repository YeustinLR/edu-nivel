"use client";

import { Search, Sparkles, X } from "lucide-react";
import { NotificationBell } from "@/modules/notifications/components/NotificationBell";
import { useEffect, useRef, useState, type MouseEvent } from "react";

import { Role } from "@/generated/prisma/enums";
import { LearnerDashboardSearch } from "@/modules/dashboard/components/learner/LearnerDashboardSearch";
import type { LearnerRole, LearnerSearchItem } from "@/modules/dashboard/types/learner-dashboard";

export function LearnerDashboardHeader({
  role,
  firstName,
}: {
  role: LearnerRole;
  firstName: string;
}) {
  const searchDialogRef = useRef<HTMLDialogElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchRequestRef = useRef<AbortController>(null);
  const searchLoadStateRef = useRef<"idle" | "loading" | "ready" | "error">("idle");
  const [searchLoadState, setSearchLoadState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [searchItems, setSearchItems] = useState<LearnerSearchItem[]>([]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      searchRequestRef.current?.abort();
    };
  }, []);

  async function loadSearchItems() {
    if (
      searchLoadStateRef.current === "loading" ||
      searchLoadStateRef.current === "ready"
    ) {
      return;
    }

    const controller = new AbortController();
    searchRequestRef.current?.abort();
    searchRequestRef.current = controller;
    searchLoadStateRef.current = "loading";
    setSearchLoadState("loading");

    try {
      const response = await fetch("/api/dashboard/learner-search", {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Search request failed with ${response.status}.`);

      const payload: unknown = await response.json();
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("items" in payload) ||
        !Array.isArray(payload.items)
      ) {
        throw new Error("Search response is invalid.");
      }
      if (controller.signal.aborted) return;

      setSearchItems(payload.items as LearnerSearchItem[]);
      searchLoadStateRef.current = "ready";
      setSearchLoadState("ready");
    } catch {
      if (controller.signal.aborted) return;
      searchLoadStateRef.current = "error";
      setSearchLoadState("error");
    }
  }

  function openSearch() {
    const dialog = searchDialogRef.current;
    if (!dialog || dialog.open) return;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    void loadSearchItems();
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function closeSearch() {
    searchDialogRef.current?.close();
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeSearch();
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[var(--student-border)] bg-[color-mix(in_srgb,var(--student-bg)_92%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1460px] items-center gap-3 px-4 sm:px-6 lg:grid lg:min-h-[84px] lg:grid-cols-[minmax(220px,0.7fr)_minmax(320px,1.3fr)_minmax(120px,0.7fr)] lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-gold-100 to-white text-gold shadow-sm ring-1 ring-gold/15 dark:from-gold/20 dark:to-[var(--student-panel)]"
            >
              <Sparkles className="size-[18px]" fill="currentColor" />
            </span>
            <p className="min-w-0 truncate font-heading text-base font-semibold tracking-[-0.02em] text-[var(--student-muted)] sm:text-lg lg:text-xl">
              Hola, <strong className="font-bold text-[var(--student-text)]">{firstName}</strong>
              <span aria-hidden="true" className="ml-1.5">👋</span>
            </p>
          </div>

          <div className="hidden w-full lg:block">
            <LearnerDashboardSearch
              items={searchItems}
              catalogMode={role === Role.STUDENT}
              loadState={searchLoadState}
              onRequestItems={loadSearchItems}
            />
          </div>

          <div className="ml-auto flex items-center justify-end gap-1 lg:ml-0 lg:gap-2">
            <button
              type="button"
              onClick={openSearch}
              aria-label="Abrir búsqueda"
              aria-haspopup="dialog"
              className="flex size-11 items-center justify-center rounded-full text-[var(--student-text)] hover:bg-[var(--student-soft)] focus-visible:outline-2 focus-visible:outline-[var(--student-blue)] lg:hidden"
            >
              <Search aria-hidden="true" className="size-5" />
            </button>
            <NotificationBell tone="learner" />
          </div>
        </div>
      </header>

      <dialog
        ref={searchDialogRef}
        aria-labelledby="learner-search-title"
        onClose={() => { document.body.style.overflow = ""; }}
        onClick={closeOnBackdrop}
        className="fixed inset-x-0 bottom-0 top-auto m-0 min-h-[68dvh] w-full max-w-none rounded-t-[24px] border border-[var(--student-border)] bg-[var(--student-panel)] p-0 text-[var(--student-text)] shadow-2xl backdrop:bg-ink-900/65 backdrop:backdrop-blur-[2px] lg:hidden"
      >
        <div className="border-b border-[var(--student-border)] px-4 pb-4 pt-2">
          <span aria-hidden="true" className="mx-auto mb-2 block h-1 w-10 rounded-full bg-[var(--student-border)]" />
          <div className="mb-3 flex items-center justify-between">
            <h2 id="learner-search-title" className="font-heading text-lg font-bold">Buscar en EduNivel</h2>
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Cerrar búsqueda"
              className="flex size-11 items-center justify-center rounded-full text-[var(--student-muted)] hover:bg-[var(--student-soft)] focus-visible:outline-2 focus-visible:outline-[var(--student-blue)]"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
          <LearnerDashboardSearch
            items={searchItems}
            catalogMode={role === Role.STUDENT}
            loadState={searchLoadState}
            onRequestItems={loadSearchItems}
            inputRef={searchInputRef}
            onNavigate={closeSearch}
          />
        </div>
      </dialog>
    </>
  );
}
