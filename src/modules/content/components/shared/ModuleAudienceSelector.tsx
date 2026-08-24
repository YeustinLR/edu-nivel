"use client";

import { GraduationCap, Presentation } from "lucide-react";
import Link from "next/link";

import {
  moduleAudienceSelections,
  type ModuleAudienceSelection,
} from "@/modules/content/domain/content-audience";

const audiencePresentation = {
  STUDENT: { label: "Estudiantes", icon: GraduationCap },
  TEACHER: { label: "Docentes", icon: Presentation },
} satisfies Record<
  ModuleAudienceSelection,
  { label: string; icon: typeof GraduationCap }
>;

type ModuleAudienceSelectorProps = {
  value: ModuleAudienceSelection;
  label?: string;
} & (
  | {
      hrefByAudience: Record<ModuleAudienceSelection, string>;
      onValueChange?: never;
    }
  | {
      hrefByAudience?: never;
      onValueChange: (audience: ModuleAudienceSelection) => void;
    }
);

const optionClass =
  "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-[background-color,color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:min-h-9 sm:flex-none";

export function ModuleAudienceSelector({
  value,
  label = "Filtrar módulos por audiencia",
  hrefByAudience,
  onValueChange,
}: ModuleAudienceSelectorProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex w-full rounded-lg border border-border bg-surface p-0.5 sm:w-auto"
    >
      {moduleAudienceSelections.map((audience) => {
        const { label: optionLabel, icon: Icon } =
          audiencePresentation[audience];
        const selected = value === audience;
        const className = `${optionClass} ${
          selected
            ? "bg-background text-foreground shadow-sm ring-1 ring-inset ring-border"
            : "text-muted hover:bg-background/70 hover:text-foreground"
        }`;
        const content = (
          <>
            <Icon
              aria-hidden="true"
              className={`h-3.5 w-3.5 ${selected ? "text-secondary" : ""}`}
            />
            {optionLabel}
          </>
        );

        if (hrefByAudience) {
          return (
            <Link
              key={audience}
              href={hrefByAudience[audience]}
              scroll={false}
              aria-current={selected ? "true" : undefined}
              className={className}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={audience}
            type="button"
            aria-pressed={selected}
            onClick={() => onValueChange(audience)}
            className={className}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
