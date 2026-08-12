import { type LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
}

export function StatsCard({ label, value, icon: Icon, trend }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
          {trend && (
            <p className="mt-1 text-xs text-success">{trend}</p>
          )}
        </div>
        <div className="rounded-lg bg-accent/10 p-2">
          <Icon className="h-5 w-5 text-accent" />
        </div>
      </div>
    </div>
  );
}
