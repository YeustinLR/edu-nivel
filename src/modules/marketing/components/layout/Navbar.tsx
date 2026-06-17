"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, Menu, X } from "lucide-react";

import { navigationLinks } from "@/constants/navigation";
import { useScrolled } from "@/modules/marketing/hooks/useScrolled";

import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled();

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "glass-nav" : ""}`}>
      <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <GraduationCap size={17} className="text-accent-foreground" strokeWidth={2.5} />
          </div>
          <span className="logo-text">
            Edu<span className="text-accent">Nivel</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {navigationLinks.map((item) => (
            <Link key={item.label} href={item.href} className="nav-link">{item.label}</Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <button className="btn-ghost px-4 py-2 rounded-xl text-small">Iniciar Sesión</button>
          <button className="btn-primary px-5 py-2 rounded-xl text-small">Registrarse Gratis</button>
        </div>

        <button className="md:hidden text-foreground p-2 cursor-pointer" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden glass-nav border-t border-border px-5 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="logo-text">
              Edu<span className="text-accent">Nivel</span>
            </span>
            <ThemeToggle />
          </div>
          {navigationLinks.map((item) => (
            <Link key={item.label} href={item.href} className="nav-link text-body" onClick={() => setMenuOpen(false)}>{item.label}</Link>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <button className="btn-ghost py-2.5 rounded-xl text-small">Iniciar Sesión</button>
            <button className="btn-primary py-2.5 rounded-xl text-small">Registrarse Gratis</button>
          </div>
        </div>
      )}
    </header>
  );
}
