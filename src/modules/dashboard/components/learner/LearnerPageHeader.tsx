export function LearnerPageHeader({
  eyebrow,
  title,
  description,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <header>
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--student-blue)]">{eyebrow}</p>
      <h1 className={`${compact ? "mt-1.5 text-3xl" : "mt-2 text-3xl sm:text-4xl"} font-extrabold tracking-[-0.04em] text-[var(--student-text)]`}>{title}</h1>
      <p className={`${compact ? "mt-1.5 text-sm leading-5" : "mt-2 text-sm leading-6 sm:text-base"} max-w-2xl text-[var(--student-muted)]`}>{description}</p>
    </header>
  );
}
