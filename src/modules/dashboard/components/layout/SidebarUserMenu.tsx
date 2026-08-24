"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";

import { ThemeToggle } from "@/modules/dashboard/components/layout/ThemeToggle";

const roleLabel: Record<string, string> = {
  STUDENT: "Estudiante",
  TEACHER: "Docente",
  COLLABORATOR: "Colaborador",
  ADMIN: "Administrador",
};

interface SidebarUserMenuProps {
  userName: string;
  userEmail?: string;
  userRole: string;
  userImage?: string | null;
  initials: string;
  onLogout: () => void;
  collapsed: boolean;
  variant?: "sidebar" | "learner-header" | "learner-sidebar";
}

export function SidebarUserMenu({
  userName,
  userEmail,
  userRole,
  userImage,
  initials,
  onLogout,
  collapsed,
  variant = "sidebar",
}: SidebarUserMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  if (variant === "learner-header") {
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-[var(--student-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--student-blue)] sm:gap-3"
        >
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImage}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-[var(--student-panel)] shadow-sm"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--student-blue-soft)] text-sm font-bold text-[var(--student-blue)] ring-2 ring-[var(--student-panel)]">
              {initials}
            </span>
          )}
          <span className="hidden min-w-0 sm:block">
            <span className="block max-w-36 truncate text-sm font-semibold text-[var(--student-text)]">
              {userName}
            </span>
            <span className="block text-xs text-[var(--student-muted)]">
              {roleLabel[userRole] ?? userRole}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`hidden h-4 w-4 text-[var(--student-muted)] transition-transform sm:block ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-64 overflow-hidden rounded-2xl border border-[var(--student-border)] bg-[var(--student-panel)] p-2 shadow-[0_18px_55px_rgba(15,23,42,0.16)]"
          >
            <div className="border-b border-[var(--student-border)] px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-[var(--student-text)]">{userName}</p>
              {userEmail ? (
                <p className="mt-0.5 truncate text-xs text-[var(--student-muted)]">{userEmail}</p>
              ) : null}
            </div>
            <div className="py-1">
              <ThemeToggle />
              <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--student-blue)] dark:text-red-400"
              >
                <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" />
                Cerrar sesión
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (variant === "learner-sidebar") {
    return (
      <div className="relative" ref={menuRef}>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-50 overflow-hidden rounded-control border border-white/10 bg-[#1b2745] p-2 text-white shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
          >
            {userEmail ? (
              <p className="truncate border-b border-white/10 px-3 py-2 text-[11px] text-white/55">
                {userEmail}
              </p>
            ) : null}
            <div className="py-1">
              <ThemeToggle tone="learner-dark" />
              <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-[#ff9d86] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
              >
                <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" />
                Cerrar sesión
              </button>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex w-full items-center gap-3 rounded-control px-1 py-2 text-left transition-colors hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
        >
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImage}
              alt=""
              className="size-9 shrink-0 rounded-full object-cover ring-2 ring-white/10"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-100 font-heading text-xs font-bold text-violet">
              {initials}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-white">{userName}</span>
            <span className="block text-xs text-white/50">{roleLabel[userRole] ?? userRole}</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-4 text-white/45 transition-transform motion-reduce:transition-none ${menuOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="relative border-t border-border" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className={`flex w-full items-center text-left transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary ${
          collapsed ? "justify-center px-2 py-3" : "gap-3 px-4 py-3"
        } ${menuOpen ? "bg-surface-elevated" : ""}`}
      >
        {userImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={userImage}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-sm font-semibold text-foreground-secondary">
            {initials}
          </span>
        )}

        {!collapsed ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight text-foreground">
                {userName}
              </p>
              <p className="text-xs leading-tight text-muted">
                {roleLabel[userRole] ?? userRole}
              </p>
            </div>
            <span className="select-none text-lg font-medium text-muted">
              ...
            </span>
          </>
        ) : null}
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 right-0 border-b border-border bg-background px-2 py-2"
        >
          <ThemeToggle />

          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary dark:text-red-400"
          >
            <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}
