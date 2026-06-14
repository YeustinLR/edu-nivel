import { CheckCircle } from "lucide-react";
import SectionTitle from "../shared/SectionTitle";
import { featureData } from "@/data/features";

export default function Features() {
  return (
    <section id="caracteristicas" className="section-alt py-24 px-5 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <SectionTitle
          badge="Funcionalidades del sistema"
          title="Diseñado para cada rol"
          description="Estudiantes, docentes y administradores cuentan con accesos y herramientas propias, gestionadas mediante Auth.js con control de sesiones por rol."
        />

        <div className="grid lg:grid-cols-2 gap-6 max-w-[900px] mx-auto">
          {featureData.map(({ badge, badgeText, icon: Icon, iconColor, iconBg, title, desc, items, border }) => (
            <div key={title} className="glass-card card-hover rounded-3xl p-7" style={{ borderColor: border }}>
              <span className={`${badge} inline-block px-3 py-1 rounded-full text-xs font-semibold mb-5`}>{badgeText}</span>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Icon size={22} className={iconColor} />
              </div>
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