"use client";

import type { ReactNode } from "react";

export function ModuleResourcePanel({
  id,
  open,
  children,
  className = "",
}: {
  id: string;
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      id={id}
      aria-hidden={!open}
      inert={open ? undefined : true}
      className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
        open
          ? "grid-rows-[1fr] opacity-100"
          : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={`transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            open ? "translate-y-0" : "-translate-y-2"
          } ${className}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
