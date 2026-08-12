"use client";

import { ClipboardCheck, LayoutGrid, Library } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    label: "Resumen",
    href: "/dashboard/admin/content",
    icon: LayoutGrid,
    exact: true,
  },
  {
    label: "Catálogo",
    href: "/dashboard/admin/content/catalog",
    icon: Library,
  },
  {
    label: "Revisiones",
    href: "/dashboard/admin/content/reviews",
    icon: ClipboardCheck,
  },
] as const;

export function AdminContentNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones de contenido"
      className="border-b border-border"
    >
      <ul className="flex w-max gap-5">
        {items.map((item) => {
          const isCatalogEntity =
            item.href.endsWith("/catalog") &&
            ["levels", "subjects", "modules", "resources"].some((segment) =>
              pathname.startsWith(`/dashboard/admin/content/${segment}/`),
            );
          const isActive = "exact" in item && item.exact
            ? pathname === item.href
            : pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              isCatalogEntity;
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative inline-flex min-h-12 items-center gap-2 px-1 text-sm font-medium focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
                  isActive
                    ? "text-secondary after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-secondary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
