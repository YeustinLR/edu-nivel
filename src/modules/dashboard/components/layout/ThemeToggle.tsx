"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

function useIsHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

interface ThemeToggleProps {
  showLabel?: boolean;
}

export function ThemeToggle({ showLabel = true }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isHydrated = useIsHydrated();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground-secondary transition-colors hover:bg-surface-elevated hover:text-foreground"
    >
      {isHydrated ? (
        isDark ? (
          <Sun aria-hidden="true" className="h-4 w-4 shrink-0" />
        ) : (
          <Moon aria-hidden="true" className="h-4 w-4 shrink-0" />
        )
      ) : (
        <span className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {showLabel ? (isDark ? "Modo claro" : "Modo oscuro") : null}
    </button>
  );
}
