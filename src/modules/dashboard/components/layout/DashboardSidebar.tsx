"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";

import { authClient } from "@/modules/auth/services/auth-client";
import { navigationByRole } from "@/modules/dashboard/config/navigation";
import { useActiveNavItem } from "@/modules/dashboard/hooks/useActiveNavItem";
import { SidebarNav } from "@/modules/dashboard/components/layout/SidebarNav";
import { SidebarUserMenu } from "@/modules/dashboard/components/layout/SidebarUserMenu";
import { EduNivelLogo } from "@/components/layout/EduNivelLogo";

interface DashboardSidebarProps {
  userName: string;
  userEmail?: string;
  userRole: string;
  userImage?: string | null;
  open: boolean;
  onClose: () => void;
}

export function DashboardSidebar({
  userName,
  userEmail,
  userRole,
  userImage,
  open,
  onClose,
}: DashboardSidebarProps) {
  const router = useRouter();
  const { activeHref } = useActiveNavItem(userRole);
  const navGroups = navigationByRole[userRole] ?? [];
  const dashboardHref = navGroups.flatMap((group) => group.items)[0]?.href ?? "/dashboard";

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
        className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-ink-900 font-body text-white lg:flex"
        aria-label="Navegación del panel"
      >
        <Link href={dashboardHref} className="mx-5 flex h-24 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900">
          <EduNivelLogo inverse size="large" />
        </Link>
        <SidebarNav
          navGroups={navGroups}
          activeHref={activeHref}
          onNavClick={handleNavClick}
          collapsed={false}
          tone="learner"
        />
        <div className="space-y-3 px-4 pb-5">
          <SidebarUserMenu
            userName={userName}
            userEmail={userEmail}
            userRole={userRole}
            userImage={userImage}
            initials={initials}
            onLogout={handleLogout}
            collapsed={false}
            variant="learner-sidebar"
          />
        </div>
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
            className="absolute left-0 top-0 flex h-dvh w-[248px] flex-col bg-ink-900 font-body text-white shadow-2xl sidebar-drawer"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar menú"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>

            <Link href={dashboardHref} onClick={handleNavClick} className="mx-5 flex h-24 items-center">
              <EduNivelLogo inverse size="large" />
            </Link>
            <SidebarNav
              navGroups={navGroups}
              activeHref={activeHref}
              onNavClick={handleNavClick}
              collapsed={false}
              tone="learner"
            />
            <SidebarUserMenu
              userName={userName}
              userEmail={userEmail}
              userRole={userRole}
              userImage={userImage}
              initials={initials}
              onLogout={handleLogout}
              collapsed={false}
              variant="learner-sidebar"
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
