"use client";

import Link from "next/link";

import { EduNivelLogo } from "@/components/layout/EduNivelLogo";
import { Role } from "@/generated/prisma/enums";
import { SidebarUserMenu } from "@/modules/dashboard/components/layout/SidebarUserMenu";
import { LearnerStreakBadge } from "@/modules/dashboard/components/learner/LearnerStreakBadge";
import { navigationByRole } from "@/modules/dashboard/config/navigation";
import { useActiveNavItem } from "@/modules/dashboard/hooks/useActiveNavItem";
import type { LearnerRole } from "@/modules/dashboard/types/learner-dashboard";

export function LearnerSidebar({
  role,
  streakDays,
  userName,
  userEmail,
  userImage,
  onLogout,
}: {
  role: LearnerRole;
  streakDays: number;
  userName: string;
  userEmail: string;
  userImage?: string | null;
  onLogout: () => void;
}) {
  const { activeHref } = useActiveNavItem(role);
  const items = (navigationByRole[role] ?? []).flatMap((group) => group.items);
  const teacher = role === Role.TEACHER;
  const dashboardHref = teacher ? "/dashboard/teacher" : "/dashboard/student";
  const navigationLabel = teacher
    ? "Navegación del docente"
    : "Navegación del estudiante";
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      aria-label={navigationLabel}
      className="fixed inset-y-0 left-0 z-40 hidden w-[224px] flex-col bg-ink-900 font-body text-white lg:flex"
    >
      <Link
        href={dashboardHref}
        className="mx-5 flex h-24 items-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
      >
        <EduNivelLogo inverse size="large" />
      </Link>

      <nav aria-label={navigationLabel} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
        <ul className="space-y-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeHref === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 ${
                    active
                      ? "bg-[#21345f] text-white"
                      : "text-white/75 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    className={`size-[18px] ${active ? "text-[#56c8ff]" : "text-white/55 group-hover:text-white/80"}`}
                    strokeWidth={2}
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-3 px-4 pb-5">
        <LearnerStreakBadge days={streakDays} />

        <SidebarUserMenu
          userName={userName}
          userEmail={userEmail}
          userRole={role}
          userImage={userImage}
          initials={initials}
          onLogout={onLogout}
          collapsed={false}
          variant="learner-sidebar"
        />
      </div>
    </aside>
  );
}
