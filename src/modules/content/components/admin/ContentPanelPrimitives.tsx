import { BookOpen, Check, FileText, Layers3, Library } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type ContentCreationStage = "level" | "subject" | "module";

const creationSteps = [
  { label: "Nivel", icon: Layers3 },
  { label: "Materia", icon: BookOpen },
  { label: "Módulo", icon: Library },
  { label: "Recurso", icon: FileText },
] as const;

const activeStepByStage: Record<ContentCreationStage, number> = {
  level: 0,
  subject: 1,
  module: 2,
};

export function ContentHierarchyTrail({
  stage,
}: {
  stage: ContentCreationStage;
}) {
  const activeStep = activeStepByStage[stage];

  return (
    <div className="rounded-xl border border-border bg-background px-4 py-4 sm:px-6">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        Jerarquía del contenido
      </p>
      <ol
        aria-label="Ubicación del contenido que se está creando"
        className="grid grid-cols-4 gap-2"
      >
        {creationSteps.map((step, index) => {
          const isComplete = index < activeStep;
          const isCurrent = index === activeStep;
          const Icon = step.icon;

          return (
            <li
              key={step.label}
              aria-current={isCurrent ? "step" : undefined}
              className="relative flex min-w-0 flex-col items-center text-center"
            >
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={`absolute right-1/2 top-5 h-px w-[calc(100%-1.25rem)] -translate-y-1/2 ${
                    index <= activeStep ? "bg-secondary" : "bg-border"
                  }`}
                />
              ) : null}
              <span
                className={`relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                  isComplete
                    ? "border-secondary bg-secondary text-white"
                    : isCurrent
                      ? "border-secondary bg-secondary/10 text-secondary ring-4 ring-secondary/10"
                      : "border-border bg-card text-muted"
                }`}
              >
                {isComplete ? (
                  <Check aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Icon aria-hidden="true" className="h-4 w-4" />
                )}
              </span>
              <span
                className={`mt-2 truncate text-xs font-medium sm:text-sm ${
                  isCurrent || isComplete ? "text-foreground" : "text-muted"
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ContentContextCard({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-border bg-background p-4">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {eyebrow}
        </p>
        <p className="mt-0.5 break-words text-sm font-semibold text-foreground">
          {title}
        </p>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function ContentPanelSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-6 flex items-start gap-2.5">
        {Icon ? (
          <span className="mt-0.5 inline-flex shrink-0 text-secondary">
            <Icon aria-hidden="true" className="h-4 w-4" />
          </span>
        ) : null}
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function ContentInfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 border-b border-border py-3.5 last:border-b-0 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center sm:gap-4">
      <dt className="flex items-center gap-2 text-sm text-muted">
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
        {label}
      </dt>
      <dd className="min-w-0 text-sm font-medium text-foreground sm:text-right">
        {children}
      </dd>
    </div>
  );
}
