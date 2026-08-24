"use client";

import { Ellipsis, LogOut, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, type MouseEvent } from "react";

import { ThemeToggle } from "@/modules/dashboard/components/layout/ThemeToggle";
import {
  navigationByRole,
  partitionMobileNavigation,
} from "@/modules/dashboard/config/navigation";
import { useActiveNavItem } from "@/modules/dashboard/hooks/useActiveNavItem";
import type { LearnerRole } from "@/modules/dashboard/types/learner-dashboard";

const roleLabels = {
  STUDENT: "Estudiante",
  TEACHER: "Docente",
} as const;

export function LearnerMobileNavigation({
  role,
  userName,
  userEmail,
  userImage,
  onLogout,
}: {
  role: LearnerRole;
  userName: string;
  userEmail: string;
  userImage?: string | null;
  onLogout: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { activeHref } = useActiveNavItem(role);
  const items = (navigationByRole[role] ?? []).flatMap((group) => group.items);
  const { primary, more } = partitionMobileNavigation(items);
  const moreIsActive = more.some((item) => item.href === activeHref);
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function openMore() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    document.body.style.overflow = "hidden";
    dialog.showModal();
  }

  function closeMore() {
    dialogRef.current?.close();
  }

  function handleDialogClose() {
    document.body.style.overflow = "";
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) closeMore();
  }

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--student-border)] bg-[color-mix(in_srgb,var(--student-panel)_94%,transparent)] pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(19,27,46,0.08)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto grid h-[68px] max-w-lg grid-cols-4 items-stretch px-2">
          {primary.map((item) => {
            const Icon = item.icon;
            const active = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-control text-[11px] font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--student-blue)] ${
                  active
                    ? "text-[var(--student-blue)]"
                    : "text-[var(--student-muted)] hover:text-[var(--student-text)]"
                }`}
              >
                <Icon aria-hidden="true" className="size-[21px]" strokeWidth={active ? 2.4 : 1.9} />
                <span className="max-w-full truncate px-1">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={openMore}
            aria-haspopup="dialog"
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-control text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--student-blue)] ${
              moreIsActive
                ? "text-[var(--student-blue)]"
                : "text-[var(--student-muted)] hover:text-[var(--student-text)]"
            }`}
          >
            <Ellipsis aria-hidden="true" className="size-[22px]" />
            <span>Más</span>
          </button>
        </div>
      </nav>

      <dialog
        ref={dialogRef}
        aria-labelledby="learner-more-title"
        onClose={handleDialogClose}
        onClick={closeOnBackdrop}
        className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-[24px] border border-[var(--student-border)] bg-[var(--student-panel)] p-0 text-[var(--student-text)] shadow-2xl backdrop:bg-ink-900/65 backdrop:backdrop-blur-[2px] lg:hidden"
      >
        <div className="sticky top-0 z-10 border-b border-[var(--student-border)] bg-[var(--student-panel)] px-4 pb-3 pt-2">
          <span aria-hidden="true" className="mx-auto mb-2 block h-1 w-10 rounded-full bg-[var(--student-border)]" />
          <div className="flex items-center justify-between">
            <h2 id="learner-more-title" className="font-heading text-lg font-bold">Más opciones</h2>
            <button
              type="button"
              onClick={closeMore}
              aria-label="Cerrar más opciones"
              className="flex size-11 items-center justify-center rounded-full text-[var(--student-muted)] hover:bg-[var(--student-soft)] hover:text-[var(--student-text)] focus-visible:outline-2 focus-visible:outline-[var(--student-blue)]"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
          <div className="flex items-center gap-3 rounded-[16px] border border-[var(--student-border)] bg-[var(--student-bg)] p-3">
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userImage} alt="" className="size-11 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-violet-100 font-heading text-sm font-bold text-violet">
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{userName}</p>
              <p className="truncate text-xs text-[var(--student-muted)]">{roleLabels[role]} · {userEmail}</p>
            </div>
          </div>

          <nav aria-label="Más destinos">
            <ul className="space-y-1">
              {more.map((item) => {
                const Icon = item.icon;
                const active = activeHref === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeMore}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-12 items-center gap-3 rounded-control px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[var(--student-blue)] ${
                        active
                          ? "bg-[var(--student-blue-soft)] text-[var(--student-blue)]"
                          : "text-[var(--student-text)] hover:bg-[var(--student-soft)]"
                      }`}
                    >
                      <Icon aria-hidden="true" className="size-5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-[var(--student-border)] pt-3">
            <ThemeToggle tone="learner" />
            <button
              type="button"
              onClick={() => {
                closeMore();
                void onLogout();
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-sm font-semibold text-coral hover:bg-coral/10 focus-visible:outline-2 focus-visible:outline-[var(--student-blue)]"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
