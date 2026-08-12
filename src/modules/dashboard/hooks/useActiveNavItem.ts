"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import type { NavItem } from "@/modules/dashboard/config/navigation";
import { navigationByRole } from "@/modules/dashboard/config/navigation";

export interface ActiveNavResult {
  allItems: NavItem[];
  activeHref: string | undefined;
  activeItem: NavItem | undefined;
}

export function useActiveNavItem(userRole: string): ActiveNavResult {
  const pathname = usePathname();

  const allItems = useMemo(
    () =>
      (navigationByRole[userRole] ?? []).flatMap((group) => group.items),
    [userRole],
  );

  const activeItem = useMemo(() => {
    return allItems
      .filter(
        (item) =>
          pathname === item.href || pathname.startsWith(`${item.href}/`),
      )
      .sort((left, right) => right.href.length - left.href.length)[0];
  }, [allItems, pathname]);

  const activeHref = activeItem?.href;

  return { allItems, activeHref, activeItem };
}
