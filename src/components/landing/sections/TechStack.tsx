export default function TechStack() {
  const techs = [
    { n: "Next.js", e: "Framework fullstack" },
    { n: "PostgreSQL", e: "Base de datos" },
    { n: "Prisma ORM", e: "Acceso a datos" },
    { n: "Auth.js", e: "Autenticación & roles" },
    { n: "Supabase", e: "DB en la nube" },
    { n: "Tilopay", e: "Pagos Costa Rica" },
    { n: "Tailwind CSS", e: "Estilos UI" },
    { n: "Vercel", e: "Despliegue" },
  ];

  return (
    <section className="py-16 px-5 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-8">
          Construido con tecnologías modernas y robustas
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {techs.map(({ n, e }) => (
            <div key={n} className="tech-pill rounded-2xl px-4 py-2.5 flex flex-col items-center gap-0.5">
              <span className="text-xs font-bold text-foreground-secondary">{n}</span>
              <span className="text-xxs text-muted">{e}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
