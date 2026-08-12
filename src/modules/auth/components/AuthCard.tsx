import type { ReactNode } from "react";
import { GraduationCap } from "lucide-react";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
};

export default function AuthCard({
  title,
  subtitle,
  children,
  className = "",
  compact = false,
}: AuthCardProps) {
  return (
    <section
      className={`glass-card rounded-lg shadow-sm ${
        compact ? "p-4 sm:p-5" : "p-6 sm:p-8"
      } ${className}`.trim()}
    >
      <div className={`${compact ? "mb-2" : "mb-5"} flex flex-col items-center gap-2`}>
        <div className={`flex items-center justify-center rounded-lg bg-accent ${
          compact ? "h-7 w-7" : "h-8 w-8"
        }`}>
          <GraduationCap
            size={compact ? 15 : 17}
            className="text-accent-foreground"
            strokeWidth={2.5}
          />
        </div>
      </div>
      <div className={`${compact ? "mb-4 space-y-1" : "mb-7 space-y-2"} text-center`}>
        <h1 className={`${compact ? "text-lg" : "text-2xl"} font-bold text-foreground`}>
          {title}
        </h1>
        <p className="text-small text-muted">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
