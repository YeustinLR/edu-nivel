"use client";

import Link from "next/link";
import { Ellipsis } from "lucide-react";

import { useActiveNavItem } from "@/modules/dashboard/hooks/useActiveNavItem";

interface BottomNavigationProps {
  userRole: string;
  onMoreClick: () => void;
  variant?: "default" | "learner";
}

const MAX_VISIBLE_ITEMS = 3;

export function BottomNavigation({
  userRole,
  onMoreClick,
  variant = "default",
}: BottomNavigationProps) {
  const { allItems, activeHref } = useActiveNavItem(userRole);
  const visibleItems = allItems.slice(0, MAX_VISIBLE_ITEMS);
  const hasMore = allItems.length > MAX_VISIBLE_ITEMS;
  const isLearner = variant === "learner";

  return (
    <nav
      aria-label="Navegación principal"
      className={isLearner
        ? "fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--student-border)] bg-[color-mix(in_srgb,var(--student-panel)_94%,transparent)] pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl xl:hidden"
        : "fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/90 lg:hidden"}
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeHref === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${isLearner ? "focus-visible:outline-[var(--student-blue)]" : "focus-visible:outline-secondary"} ${
                isActive
                  ? isLearner ? "text-[var(--student-blue)]" : "text-secondary"
                  : isLearner ? "text-[var(--student-muted)] hover:text-[var(--student-text)]" : "text-muted hover:text-foreground"
              }`}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span className="max-w-16 truncate">{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onMoreClick}
          aria-label="Más opciones"
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${isLearner ? "focus-visible:outline-[var(--student-blue)]" : "focus-visible:outline-secondary"} ${
            hasMore && activeHref && !visibleItems.some((i) => i.href === activeHref)
              ? isLearner ? "text-[var(--student-blue)]" : "text-secondary"
              : isLearner ? "text-[var(--student-muted)] hover:text-[var(--student-text)]" : "text-muted hover:text-foreground"
          }`}
        >
          <Ellipsis aria-hidden="true" className="h-5 w-5" />
          <span className="max-w-16 truncate">Más</span>
        </button>
      </div>
    </nav>
  );
}
