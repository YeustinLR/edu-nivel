"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { authClient } from "@/modules/auth/services/auth-client";
import { navigationByRole } from "@/modules/dashboard/config/navigation";
import { useActiveNavItem } from "@/modules/dashboard/hooks/useActiveNavItem";
import { SidebarLogo } from "@/modules/dashboard/components/layout/SidebarLogo";
import { SidebarNav } from "@/modules/dashboard/components/layout/SidebarNav";
import { SidebarUserMenu } from "@/modules/dashboard/components/layout/SidebarUserMenu";

interface DashboardSidebarProps {
  userName: string;
  userEmail?: string;
  userRole: string;
  userImage?: string | null;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function DashboardSidebar({
  userName,
  userRole,
  userImage,
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const router = useRouter();
  const { activeHref } = useActiveNavItem(userRole);
  const navGroups = navigationByRole[userRole] ?? [];

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }

  function handleNavClick() {
    onClose();
  }

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-30 hidden h-dvh flex-col border-r border-border bg-background transition-all duration-300 lg:flex ${
          collapsed ? "w-16" : "w-64"
        }`}
        aria-label="Navegación del panel"
      >
        <SidebarLogo
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />
        <SidebarNav
          navGroups={navGroups}
          activeHref={activeHref}
          onNavClick={handleNavClick}
          collapsed={collapsed}
        />
        <SidebarUserMenu
          userName={userName}
          userRole={userRole}
          userImage={userImage}
          initials={initials}
          onLogout={handleLogout}
          collapsed={collapsed}
        />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navegación del panel"
            className="absolute left-0 top-0 flex h-dvh w-64 flex-col border-r border-border bg-background shadow-2xl sidebar-drawer"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar menú"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>

            <SidebarLogo collapsed={false} />
            <SidebarNav
              navGroups={navGroups}
              activeHref={activeHref}
              onNavClick={handleNavClick}
              collapsed={false}
            />
            <SidebarUserMenu
              userName={userName}
              userRole={userRole}
              userImage={userImage}
              initials={initials}
              onLogout={handleLogout}
              collapsed={false}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
