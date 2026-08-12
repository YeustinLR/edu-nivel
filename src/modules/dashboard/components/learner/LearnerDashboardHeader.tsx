"use client";

import { Bell, BookOpen, Menu } from "lucide-react";
import Link from "next/link";

import { Role } from "@/generated/prisma/enums";
import { SidebarUserMenu } from "@/modules/dashboard/components/layout/SidebarUserMenu";
import { LearnerDashboardSearch } from "@/modules/dashboard/components/learner/LearnerDashboardSearch";
import type { LearnerRole, LearnerSearchItem } from "@/modules/dashboard/types/learner-dashboard";

export function LearnerDashboardHeader({
  role,
  firstName,
  userName,
  userEmail,
  userImage,
  searchItems,
  onOpenSidebar,
  onLogout,
}: {
  role: LearnerRole;
  firstName: string;
  userName: string;
  userEmail: string;
  userImage?: string | null;
  searchItems: LearnerSearchItem[];
  onOpenSidebar: () => void;
  onLogout: () => void;
}) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const dashboardHref =
    role === Role.STUDENT ? "/dashboard/student" : "/dashboard/teacher";

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--student-border)] bg-[color-mix(in_srgb,var(--student-bg)_92%,transparent)] backdrop-blur-xl">
      <div className="mx-auto grid min-h-[88px] w-full max-w-[1600px] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6 xl:grid-cols-[minmax(210px,0.55fr)_minmax(320px,1.4fr)_auto] xl:gap-7 xl:px-9">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onOpenSidebar} aria-label="Abrir navegación" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--student-border)] bg-[var(--student-panel)] text-[var(--student-text)] xl:hidden">
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
          <Link href={dashboardHref} className="flex items-center gap-2 xl:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--student-blue)] text-white"><BookOpen aria-hidden="true" className="h-5 w-5" /></span>
            <span className="hidden font-bold text-[var(--student-text)] sm:inline">EduNivel</span>
          </Link>
          <h1 className="hidden truncate text-[1.45rem] font-bold tracking-[-0.03em] text-[var(--student-text)] xl:block">
            Hola, {firstName} <span aria-hidden="true">👋</span>
          </h1>
        </div>

        <div className="hidden w-full xl:block">
          <LearnerDashboardSearch items={searchItems} />
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <span title="No hay notificaciones disponibles" aria-label="Notificaciones" className="relative flex h-11 w-11 items-center justify-center rounded-xl text-[var(--student-text)] transition hover:bg-[var(--student-soft)]">
            <Bell aria-hidden="true" className="h-[22px] w-[22px]" strokeWidth={1.8} />
          </span>
          <span className="hidden h-9 w-px bg-[var(--student-border)] sm:block" />
          <SidebarUserMenu
            userName={userName}
            userEmail={userEmail}
            userRole={role}
            userImage={userImage}
            initials={initials}
            onLogout={onLogout}
            collapsed={false}
            variant="learner-header"
          />
        </div>

        <div className="col-span-3 pb-3 xl:hidden">
          <LearnerDashboardSearch items={searchItems} />
        </div>
      </div>
    </header>
  );
}
