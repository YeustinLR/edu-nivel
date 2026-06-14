import { ChevronRight } from "lucide-react";

import SectionTitle from "../shared/SectionTitle";

export default function Levels() {
  return (
    <section className="py-24 px-5 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <SectionTitle
          badge="Niveles educativos"
          title="Contenidos alineados al currículo del MEP"
          description="Material organizado según los programas de estudio oficiales del Ministerio de Educación Pública de Costa Rica."
        />

        <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div
            className="card-hover rounded-3xl p-8 transition-all duration-300"
            style={{ background: "linear-gradient(145deg,color-mix(in srgb, var(--accent) 10%, transparent),color-mix(in srgb, var(--accent) 3%, transparent))", border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)" }}
          >
            <div className="text-[36px] mb-3">🚀</div>
            <span className="badge-yellow inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4">1° a 6° año</span>
            <h3 className="text-[22px] font-extrabold mb-2">Primaria</h3>
            <p className="text-muted mb-6 text-small" style={{ lineHeight: 1.7 }}>
              Materiales interactivos para niños de 6 a 12 años. Bases sólidas en las asignaturas del currículo nacional con ejercicios adaptados por grado.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-7">
              {["Matemáticas", "Español", "Ciencias", "Estudios Sociales", "Inglés", "Arte"].map((m) => (
                <span key={m} className="glass-card rounded-xl px-3 py-1.5 text-center text-muted text-xs">{m}</span>
              ))}
            </div>
            <button className="btn-primary w-full py-3 rounded-2xl text-small flex items-center justify-center gap-2">
              Ver contenido <ChevronRight size={15} />
            </button>
          </div>

          <div
            className="card-hover rounded-3xl p-8 transition-all duration-300"
            style={{ background: "linear-gradient(145deg,color-mix(in srgb, var(--success) 10%, transparent),color-mix(in srgb, var(--success) 3%, transparent))", border: "1px solid color-mix(in srgb, var(--success) 22%, transparent)" }}
          >
            <div className="text-[36px] mb-3">🔬</div>
            <span className="badge-green inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4">7° a 11° año</span>
            <h3 className="text-[22px] font-extrabold mb-2">Secundaria</h3>
            <p className="text-muted mb-6 text-small" style={{ lineHeight: 1.7 }}>
              Contenido de profundidad para estudiantes de 12 a 17 años. Material preparatorio para las pruebas nacionales FARO y bachillerato.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-7">
              {["Álgebra y Cálculo", "Biología", "Química", "Historia", "Física", "Inglés"].map((m) => (
                <span key={m} className="glass-card rounded-xl px-3 py-1.5 text-center text-muted text-xs">{m}</span>
              ))}
            </div>
            <button
              className="w-full py-3 rounded-2xl text-small flex items-center justify-center gap-2 font-semibold transition-all duration-200"
              style={{ border: "1.5px solid color-mix(in srgb, var(--success) 40%, transparent)", color: "var(--success)", background: "transparent", cursor: "pointer" }}
            >
              Ver contenido <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
