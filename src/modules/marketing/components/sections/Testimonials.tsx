import { Star } from "lucide-react";

import { testimonials } from "@/modules/marketing/data/testimonials";

import SectionTitle from "../shared/SectionTitle";

export default function Testimonials() {
  return (
    <section className="section-alt py-16 md:py-20 px-5 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <SectionTitle
          badge="Opiniones reales"
          title="Lo que dicen quienes la prueban"
        />

        <div className="grid sm:grid-cols-2 gap-6">
          {testimonials.map(({ nombre, rol, texto, iniciales, color }) => (
            <div
              key={nombre}
              className="rounded-3xl p-7 text-left"
              style={{ background: "linear-gradient(135deg,color-mix(in srgb, var(--secondary) 10%, transparent),color-mix(in srgb, var(--secondary) 7%, transparent))", border: "1px solid color-mix(in srgb, var(--secondary) 18%, transparent)" }}
            >
              <div className="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} className="text-accent fill-accent" />
                ))}
              </div>
              <p className="text-foreground-secondary mb-6 text-small" style={{ lineHeight: 1.75, fontStyle: "italic" }}>{texto}</p>
              <div className="flex items-center gap-3">
                <div
                  className="text-xs font-bold"
                  style={{
                    width: 36, height: 36, borderRadius: "50%", background: color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {iniciales}
                </div>
                <div>
                  <div className="text-small font-semibold">{nombre}</div>
                  <div className="text-xs text-muted">{rol}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-3xl p-6 mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { n: "2 roles", d: "Estudiante, Docente" },
            { n: "MEP", d: "Currículo oficial CR" },
            { n: "14 días", d: "Prueba gratuita" },
            { n: "Tilopay", d: "Pago local seguro" },
          ].map(({ n, d }) => (
            <div key={n}>
              <div className="grad-text text-[20px] font-extrabold">{n}</div>
              <div className="text-xs text-muted mt-0.5">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
