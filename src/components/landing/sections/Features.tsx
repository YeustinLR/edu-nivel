import { BookOpen, BarChart2, Shield, CheckCircle } from "lucide-react";

import SectionTitle from "../shared/SectionTitle";

const featureData = [
  {
    badge: "badge-yellow",
    badgeText: "Estudiantes",
    icon: <BookOpen size={22} className="text-accent" />,
    iconBg: "color-mix(in srgb, var(--accent) 15%, transparent)",
    title: "Aprendé a tu ritmo",
    desc: "Accedé a contenidos de tu nivel (1° a 11°) alineados al MEP. Seguí tu progreso y recibí retroalimentación inmediata en cada evaluación.",
    items: [
      "Contenidos por nivel educativo (Primaria y Secundaria)",
      "Evaluaciones con corrección automática",
      "Progreso visible en tiempo real",
      "Acceso desde cualquier dispositivo",
    ],
    border: "color-mix(in srgb, var(--accent) 15%, transparent)",
  },
  {
    badge: "badge-purple",
    badgeText: "Docentes",
    icon: <BarChart2 size={22} className="text-secondary" />,
    iconBg: "color-mix(in srgb, var(--secondary) 15%, transparent)",
    title: "Seguimiento académico real",
    desc: "Vinculá a tus estudiantes, monitoreá su avance, asigná evaluaciones y descargá reportes para compartir con padres o directores.",
    items: [
      "Dashboard de progreso grupal",
      "Asignación y corrección de evaluaciones",
      "Reportes individuales descargables",
      "Notificaciones de logros y rezagos",
    ],
    border: "color-mix(in srgb, var(--secondary) 15%, transparent)",
  },
  {
    badge: "badge-green",
    badgeText: "Administradores",
    icon: <Shield size={22} className="text-success" />,
    iconBg: "color-mix(in srgb, var(--success) 15%, transparent)",
    title: "Gestión centralizada",
    desc: "Gestioná usuarios, roles, contenidos y suscripciones desde un panel administrativo completo con datos en tiempo real sobre el sistema.",
    items: [
      "Gestión de usuarios y roles",
      "Administración de contenidos por nivel",
      "Control de suscripciones y pagos Tilopay",
      "Reportes globales de la plataforma",
    ],
    border: "color-mix(in srgb, var(--success) 15%, transparent)",
  },
];

export default function Features() {
  return (
    <section id="caracteristicas" className="section-alt py-24 px-5 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <SectionTitle
          badge="Funcionalidades del sistema"
          title="Diseñado para cada rol"
          description="Estudiantes, docentes y administradores cuentan con accesos y herramientas propias, gestionadas mediante Auth.js con control de sesiones por rol."
        />

        <div className="grid lg:grid-cols-3 gap-6">
          {featureData.map(({ badge, badgeText, icon, iconBg, title, desc, items, border }) => (
            <div key={title} className="glass-card card-hover rounded-3xl p-7" style={{ borderColor: border }}>
              <span className={`${badge} inline-block px-3 py-1 rounded-full text-xs font-semibold mb-5`}>{badgeText}</span>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>{icon}</div>
              <h3 className="text-[17px] font-bold mb-2">{title}</h3>
              <p className="text-muted mb-5 text-small" style={{ lineHeight: 1.7 }}>{desc}</p>
              <ul className="flex flex-col gap-[10px]">
                {items.map((it) => (
                  <li key={it} className="flex items-start gap-2 text-muted text-xs">
                    <CheckCircle size={13} className="text-success mt-0.5 shrink-0" />{it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
