interface Props {
  badge?: string;
  title: string;
  description?: string;
}

export default function SectionTitle({
  badge,
  title,
  description,
}: Props) {
  return (
    <div className="text-center mb-16">
      {badge && (
        <span className="badge-purple inline-block px-4 py-2 rounded-full text-xs font-semibold mb-4">
          {badge}
        </span>
      )}

      <h2 className="section-title mb-4">
        {title}
      </h2>

      {description && (
        <p className="section-description mx-auto max-w-2xl">
          {description}
        </p>
      )}
    </div>
  );
}