import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 px-4">
      <div className="rounded-full bg-surface-elevated p-4">
        <Icon className="h-8 w-8 text-muted" />
      </div>
      <h3 className="mt-4 text-lg font-medium text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted text-center max-w-sm">{description}</p>
      {action && (
        <a
          href={action.href}
          className="mt-6 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors"
        >
          {action.label}
        </a>
      )}
    </div>
  );
}
