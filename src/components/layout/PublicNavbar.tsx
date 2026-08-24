"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";

import { navigationLinks } from "@/constants/navigation";
import { EduNivelLogo } from "@/components/layout/EduNivelLogo";

import ThemeToggle from "./ThemeToggle";
import { useScrolled } from "./useScrolled";

export default function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled();

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-nav" : ""
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <EduNivelLogo />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Navegación principal">
          {navigationLinks.map((item) => (
            <Link key={item.label} href={item.href} className="nav-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Link href="/login" className="btn-ghost rounded-xl px-4 py-2 text-small">
            Iniciar Sesión
          </Link>
          <Link href="/registro" className="btn-primary rounded-xl px-5 py-2 text-small">
            Registrarse Gratis
          </Link>
        </div>

        <button
          type="button"
          className="cursor-pointer p-2 text-foreground md:hidden"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-controls="public-mobile-navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div
          id="public-mobile-navigation"
          className="glass-nav flex flex-col gap-4 border-t border-border px-5 py-4 md:hidden"
        >
          <div className="flex items-center justify-end">
            <ThemeToggle />
          </div>
          {navigationLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="nav-link text-body"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="flex flex-col gap-2 border-t border-border pt-2">
            <Link
              href="/login"
              className="btn-ghost rounded-xl py-2.5 text-center text-small"
              onClick={() => setMenuOpen(false)}
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/registro"
              className="btn-primary rounded-xl py-2.5 text-center text-small"
              onClick={() => setMenuOpen(false)}
            >
              Registrarse Gratis
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
