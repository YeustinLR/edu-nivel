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
  tone?: "default" | "learner" | "learner-dark";
}

export function ThemeToggle({ showLabel = true, tone = "default" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isHydrated = useIsHydrated();
  const isDark = resolvedTheme === "dark";
  const toneClass =
    tone === "learner-dark"
      ? "text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-violet"
      : tone === "learner"
        ? "text-[var(--student-muted)] hover:bg-[var(--student-soft)] hover:text-[var(--student-text)] focus-visible:outline-[var(--student-blue)]"
        : "text-foreground-secondary hover:bg-surface-elevated hover:text-foreground focus-visible:outline-secondary";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${toneClass}`}
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
