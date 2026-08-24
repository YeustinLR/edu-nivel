"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { authClient } from "@/modules/auth/services/auth-client";
import { LearnerDashboardHeader } from "@/modules/dashboard/components/learner/LearnerDashboardHeader";
import { LearnerMobileNavigation } from "@/modules/dashboard/components/learner/LearnerMobileNavigation";
import { LearnerSidebar } from "@/modules/dashboard/components/learner/LearnerSidebar";
import {
  learnerBodyFont,
  learnerHeadingFont,
  learnerMetaFont,
} from "@/modules/dashboard/styles/learner-fonts";
import type { LearnerRole } from "@/modules/dashboard/types/learner-dashboard";

export function LearnerDashboardShell({
  role,
  children,
  userName,
  userEmail,
  userImage,
}: {
  role: LearnerRole;
  children: ReactNode;
  userName: string;
  userEmail: string;
  userImage?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const firstName = userName.trim().split(/\s+/)[0] || userName;
  const isMateriasPage =
    pathname.startsWith("/dashboard/student/content") ||
    pathname.startsWith("/dashboard/teacher/content");

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <div className={`${learnerBodyFont.variable} ${learnerHeadingFont.variable} ${learnerMetaFont.variable} learner-dashboard ${isMateriasPage ? "learner-dashboard--materias" : ""} min-h-dvh bg-[var(--student-bg)] font-body text-[var(--student-text)]`}>
      <LearnerSidebar
        role={role}
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
        onLogout={handleLogout}
      />
      <div className="min-h-dvh lg:ml-[248px]">
        <LearnerDashboardHeader
          role={role}
          firstName={firstName}
        />
        <a href="#learner-dashboard-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">Ir al contenido principal</a>
        <main id="learner-dashboard-content" className="mx-auto w-full max-w-[1460px] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>
      <LearnerMobileNavigation
        role={role}
        userName={userName}
        userEmail={userEmail}
        userImage={userImage}
        onLogout={handleLogout}
      />
    </div>
  );
}
