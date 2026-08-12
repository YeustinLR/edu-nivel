"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { authClient } from "@/modules/auth/services/auth-client";
import { BottomNavigation } from "@/modules/dashboard/components/layout/BottomNavigation";
import { LearnerDashboardHeader } from "@/modules/dashboard/components/learner/LearnerDashboardHeader";
import { LearnerSidebar } from "@/modules/dashboard/components/learner/LearnerSidebar";
import type {
  LearnerRole,
  LearnerShellData,
} from "@/modules/dashboard/types/learner-dashboard";

export function LearnerDashboardShell({
  role,
  children,
  userName,
  userEmail,
  userImage,
  shellData,
}: {
  role: LearnerRole;
  children: ReactNode;
  userName: string;
  userEmail: string;
  userImage?: string | null;
  shellData: LearnerShellData;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const firstName = userName.trim().split(/\s+/)[0] || userName;

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <div className="learner-dashboard min-h-dvh bg-[var(--student-bg)] text-[var(--student-text)]">
      <LearnerSidebar
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        accessStatus={shellData.access.status}
      />
      <div className="min-h-dvh xl:ml-[272px]">
        <LearnerDashboardHeader
          role={role}
          firstName={firstName}
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
          searchItems={shellData.searchItems}
          onOpenSidebar={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />
        <a href="#learner-dashboard-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">Ir al contenido principal</a>
        <main id="learner-dashboard-content" className="mx-auto w-full max-w-[1600px] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pt-7 xl:px-9 xl:pb-12">
          {children}
        </main>
      </div>
      <BottomNavigation userRole={role} onMoreClick={() => setSidebarOpen(true)} variant="learner" />
    </div>
  );
}
