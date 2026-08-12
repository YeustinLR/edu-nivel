export function LearnerPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header>
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--student-blue)]">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[var(--student-text)] sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--student-muted)] sm:text-base">{description}</p>
    </header>
  );
}
