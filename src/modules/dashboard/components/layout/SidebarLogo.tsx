import { ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";

interface SidebarLogoProps {
  collapsed: boolean;
  onToggleCollapse?: () => void;
}

export function SidebarLogo({ collapsed, onToggleCollapse }: SidebarLogoProps) {
  return (
    <div
      className={`flex items-center border-b border-border ${
        collapsed
          ? "flex-col justify-center gap-1 px-2 py-2"
          : "h-14 gap-2 px-4"
      }`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-sm">
        <GraduationCap aria-hidden="true" size={17} strokeWidth={2.5} />
      </span>

      {collapsed ? (
        onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expandir sidebar"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
          >
            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        ) : null
      ) : (
        <>
          <span className="text-base font-semibold tracking-tight text-foreground">
            Edu<span className="text-accent">Nivel</span>
          </span>
          {onToggleCollapse ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Colapsar sidebar"
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
