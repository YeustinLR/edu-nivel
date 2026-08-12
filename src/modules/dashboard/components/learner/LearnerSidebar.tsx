"use client";

import { BookOpen, Rocket, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Role } from "@/generated/prisma/enums";
import { navigationByRole } from "@/modules/dashboard/config/navigation";
import type {
  LearnerAccessStatus,
  LearnerRole,
} from "@/modules/dashboard/types/learner-dashboard";
import { useActiveNavItem } from "@/modules/dashboard/hooks/useActiveNavItem";

function LearnerSidebarContent({
  role,
  accessStatus,
  onNavigate,
}: {
  role: LearnerRole;
  accessStatus: LearnerAccessStatus;
  onNavigate: () => void;
}) {
  const { activeHref } = useActiveNavItem(role);
  const items = (navigationByRole[role] ?? []).flatMap((group) => group.items);
  const hasAccess = accessStatus === "ACTIVE" || accessStatus === "INCLUDED";
  const teacher = role === Role.TEACHER;
  const dashboardHref = teacher ? "/dashboard/teacher" : "/dashboard/student";
  const exploreHref = teacher
    ? "/dashboard/teacher/explore"
    : "/dashboard/student/explore";
  const contentHref = teacher
    ? "/dashboard/teacher/content"
    : "/dashboard/student/content";
  const promoHref = hasAccess
    ? exploreHref
    : accessStatus === "NO_LEVEL"
      ? contentHref
      : "/dashboard/subscription";
  const navigationLabel = teacher
    ? "Navegación del docente"
    : "Navegación del estudiante";

  return (
    <>
      <Link
        href={dashboardHref}
        onClick={onNavigate}
        className="flex h-[88px] items-center gap-3 px-8 text-white"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-emerald-400 shadow-lg shadow-blue-950/30">
          <BookOpen aria-hidden="true" className="h-6 w-6" strokeWidth={2.3} />
        </span>
        <span className="text-[1.65rem] font-bold tracking-[-0.04em]">EduNivel</span>
      </Link>

      <nav aria-label={navigationLabel} className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        <ul className="space-y-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeHref === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`group flex min-h-12 items-center gap-4 rounded-xl px-4 text-[0.96rem] font-medium transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 ${
                    active
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-[0_10px_28px_rgba(20,91,220,0.28)]"
                      : "text-blue-50/82 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <Icon aria-hidden="true" className={`h-[21px] w-[21px] ${active ? "text-white" : "text-blue-100/90 group-hover:text-white"}`} strokeWidth={1.9} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-4 pb-5">
        <div className="relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-gradient-to-br from-blue-900 via-indigo-900 to-blue-800 p-5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <Sparkles aria-hidden="true" className="absolute right-5 top-5 h-4 w-4 text-blue-200" />
          <div className="absolute -bottom-12 -right-10 h-32 w-32 rounded-full bg-blue-500/20" />
          <Rocket aria-hidden="true" className="absolute bottom-20 right-5 h-9 w-9 rotate-12 text-blue-200/80" />
          <p className="relative max-w-44 text-base font-bold leading-6">
            {hasAccess
              ? teacher
                ? "Recursos para fortalecer tus clases"
                : "¡Sigue aprendiendo sin límites!"
              : "Desbloquea todo tu nivel"}
          </p>
          <p className="relative mt-2 max-w-44 text-xs leading-5 text-blue-100/75">
            {hasAccess
              ? teacher
                ? "Explora materias y recursos preparados para docentes."
                : "Explora tus materias y descubre nuevos recursos."
              : accessStatus === "NO_LEVEL"
                ? "Selecciona un nivel para comenzar tu ruta."
                : "Conoce el acceso premium de EduNivel."}
          </p>
          <Link
            href={promoHref}
            onClick={onNavigate}
            className="relative mt-5 inline-flex min-h-10 items-center rounded-xl bg-white px-4 text-xs font-bold text-blue-950 shadow-sm transition hover:bg-blue-50"
          >
            {hasAccess ? "Explorar recursos" : accessStatus === "NO_LEVEL" ? "Elegir nivel" : "Ver suscripción"}
          </Link>
        </div>
      </div>
    </>
  );
}

export function LearnerSidebar({
  role,
  open,
  onClose,
  accessStatus,
}: {
  role: LearnerRole;
  open: boolean;
  onClose: () => void;
  accessStatus: LearnerAccessStatus;
}) {
  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [onClose, open]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col bg-[#061b36] xl:flex" aria-label={role === Role.TEACHER ? "Navegación del docente" : "Navegación del estudiante"}>
        <LearnerSidebarContent role={role} accessStatus={accessStatus} onNavigate={onClose} />
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button type="button" aria-label="Cerrar navegación" onClick={onClose} className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" />
          <aside className="sidebar-drawer absolute inset-y-0 left-0 flex w-[min(300px,86vw)] flex-col bg-[#061b36] shadow-2xl">
            <button type="button" onClick={onClose} aria-label="Cerrar menú" className="absolute right-3 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl text-blue-100 hover:bg-white/10 hover:text-white">
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
            <LearnerSidebarContent role={role} accessStatus={accessStatus} onNavigate={onClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
