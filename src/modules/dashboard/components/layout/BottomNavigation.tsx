"use client";

import Link from "next/link";
import { Ellipsis } from "lucide-react";

import { useActiveNavItem } from "@/modules/dashboard/hooks/useActiveNavItem";

interface BottomNavigationProps {
  userRole: string;
  onMoreClick: () => void;
}

const MAX_VISIBLE_ITEMS = 3;

export function BottomNavigation({
  userRole,
  onMoreClick,
}: BottomNavigationProps) {
  const { allItems, activeHref } = useActiveNavItem(userRole);
  const visibleItems = allItems.slice(0, MAX_VISIBLE_ITEMS);
  const hasMore = allItems.length > MAX_VISIBLE_ITEMS;

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/90 lg:hidden"
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
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
                isActive
                  ? "text-secondary"
                  : "text-muted hover:text-foreground"
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
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
            hasMore && activeHref && !visibleItems.some((i) => i.href === activeHref)
              ? "text-secondary"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Ellipsis aria-hidden="true" className="h-5 w-5" />
          <span className="max-w-16 truncate">Más</span>
        </button>
      </div>
    </nav>
  );
}
