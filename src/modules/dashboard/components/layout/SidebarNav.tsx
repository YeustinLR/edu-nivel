import Link from "next/link";

import type { NavGroup } from "@/modules/dashboard/config/navigation";

interface SidebarNavProps {
  navGroups: NavGroup[];
  activeHref: string | undefined;
  onNavClick?: () => void;
  collapsed: boolean;
  tone?: "default" | "learner";
}

export function SidebarNav({
  navGroups,
  activeHref,
  onNavClick,
  collapsed,
  tone = "default",
}: SidebarNavProps) {
  if (collapsed) {
    const items = navGroups.flatMap((group) => group.items);

    return (
      <nav
        aria-label="Navegación principal"
        className="flex-1 overflow-y-auto py-3"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeHref === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              title={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`mx-auto mb-1 flex w-12 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[10px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
                isActive
                  ? "text-secondary"
                  : "text-muted hover:bg-surface-elevated hover:text-foreground"
              }`}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span className="w-full truncate text-center leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Navegación principal"
      className={`flex-1 overflow-y-auto py-3 ${tone === "learner" ? "px-4" : ""}`}
    >
      {navGroups.map((group) => (
        <div key={group.title} className="mb-3">
          <p className={`mb-1 px-0 text-[11px] font-semibold uppercase tracking-wider ${tone === "learner" ? "text-white/45" : "text-muted"}`}>
            {group.title}
          </p>
          <ul className={`space-y-1.5 ${tone === "learner" ? "" : "px-2"}`}>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeHref === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavClick}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      tone === "learner"
                        ? isActive
                          ? "bg-[#21345f] text-white focus-visible:ring-violet"
                          : "text-white/75 hover:bg-white/8 hover:text-white focus-visible:ring-violet"
                        : isActive
                          ? "bg-secondary/10 text-secondary focus-visible:outline-secondary"
                          : "text-foreground-secondary hover:bg-surface-elevated hover:text-foreground focus-visible:outline-secondary"
                    }`}
                  >
                    <Icon aria-hidden="true" className={`h-[18px] w-[18px] shrink-0 ${tone === "learner" ? (isActive ? "text-[#56c8ff]" : "text-white/55") : ""}`} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
