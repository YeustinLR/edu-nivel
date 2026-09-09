"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { GraduationCap } from "lucide-react";
import { NotificationBell } from "@/modules/notifications/components/NotificationBell";

import { DashboardSidebar } from "@/modules/dashboard/components/layout/DashboardSidebar";
import { BottomNavigation } from "@/modules/dashboard/components/layout/BottomNavigation";
import { useActiveNavItem } from "@/modules/dashboard/hooks/useActiveNavItem";
import { LearnerDashboardShell } from "@/modules/dashboard/components/learner/LearnerDashboardShell";

interface DashboardShellProps {
  children: ReactNode;
  userName: string;
  userEmail: string;
  userRole: string;
  userImage?: string | null;
}

export function DashboardShell({
  children,
  userName,
  userEmail,
  userRole,
  userImage,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { allItems, activeItem } = useActiveNavItem(userRole);

  const pageTitle =
    activeItem && activeItem.label !== "Panel" ? activeItem.label : null;

  if (userRole === "STUDENT" || userRole === "TEACHER") {
    return (
      <LearnerDashboardShell
        role={userRole}
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
      >
        {children}
      </LearnerDashboardShell>
    );
  }

  return (
    <div className="flex min-h-dvh bg-surface">
      <DashboardSidebar
        userName={userName}
        userRole={userRole}
        userEmail={userEmail}
        userImage={userImage}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div
        className={`flex flex-1 flex-col transition-[margin] duration-300 ${
          "lg:ml-[248px]"
        }`}
      >
        <div className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/90 lg:sticky lg:top-0">
          <Link
            href={allItems[0]?.href ?? "/dashboard"}
            className="flex items-center gap-2 rounded-md lg:hidden"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-sm">
              <GraduationCap aria-hidden="true" size={17} strokeWidth={2.5} />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">
              Edu<span className="text-accent">Nivel</span>
            </span>
          </Link>

          {pageTitle ? (
            <h1 className="hidden text-base font-semibold text-foreground lg:block">
              {pageTitle}
            </h1>
          ) : null}

          <NotificationBell />
        </div>

        <a
          href="#dashboard-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-secondary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Ir al contenido principal
        </a>

        <main
          id="dashboard-content"
          className="mx-auto w-full max-w-7xl px-5 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-14 sm:pt-6 lg:px-8 lg:pb-10 lg:pt-5"
        >
          {children}
        </main>
      </div>

      <BottomNavigation
        userRole={userRole}
        onMoreClick={() => setSidebarOpen(true)}
      />
    </div>
  );
}
