import { ArrowRight, Globe } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="section-alt py-24 px-5 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{ width: 700, height: 300, borderRadius: "50%", background: "color-mix(in srgb, var(--accent) 4%, transparent)", filter: "blur(60px)" }} />
      </div>

      <div className="max-w-2xl mx-auto text-center relative">
        <h2 style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", fontWeight: 800, marginBottom: 14 }}>
          Empezá gratis hoy.<br /><span className="grad-text">Sin tarjeta, sin compromisos.</span>
        </h2>

        <p className="text-muted mb-10 max-w-lg mx-auto text-small" style={{ lineHeight: 1.75 }}>
          14 días de acceso completo al plan Estudiante. Cuando estés listo, elegí el plan que mejor se adapte a vos.
          Pagos seguros con Tilopay.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="btn-primary px-9 py-4 rounded-2xl text-small flex items-center justify-center gap-2 shadow-final-cta">
            Crear cuenta gratis <ArrowRight size={16} />
          </button>
          <button className="btn-outline px-9 py-4 rounded-2xl text-small flex items-center justify-center gap-2">
            <Globe size={15} /> Ver precios
          </button>
        </div>

        <p className="text-muted mt-6 text-xs">
          ✓ Sin tarjeta requerida &nbsp;·&nbsp; ✓ 14 días gratis &nbsp;·&nbsp; ✓ Alineado al MEP &nbsp;·&nbsp; ✓ Pagos con Tilopay
        </p>
      </div>
    </section>
  );
}
