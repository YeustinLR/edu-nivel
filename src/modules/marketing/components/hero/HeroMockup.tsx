import { Lock, FileText, Bell, TrendingUp, CheckCircle } from "lucide-react";

export default function HeroMockup() {
  return (
    <div className="relative float fadein" style={{ animationDelay: ".15s" }}>
      <div className="mockup-window rounded-3xl p-5 shadow-mockup">
        <div className="flex items-center gap-1.5 mb-4">
          {["#f87171", "#fbbf24", "#4ade80"].map((c) => (
            <span key={c} className="window-dot" style={{ background: c }} />
          ))}
          <div className="ml-3 flex-1 h-5 rounded-lg flex items-center px-2.5 mockup-urlbar">
            <Lock size={8} className="text-muted mr-1.5" />
            <span>edunivel.vercel.app/dashboard</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold" style={{ color: "var(--foreground-secondary)" }}>👋 Bienvenida, Sofía</span>
          <span className="badge-yellow px-2 py-0.5 rounded-full text-xxs" style={{ fontWeight: 600 }}>Plan Estudiante · Activo</span>
        </div>

        <div className="glass-card rounded-2xl p-4 mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xxs font-semibold" style={{ color: "var(--foreground-secondary)" }}>📐 Matemáticas — 8° año</span>
            <span className="text-xxs font-bold" style={{ color: "var(--accent)" }}>68%</span>
          </div>
          <div className="progress-bar mb-3">
            <div className="progress-fill" style={{ width: "68%", background: "linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 80%, white))" }} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[["Álgebra", "82%", "var(--success)"], ["Geometría", "55%", "#f59e0b"], ["Funciones", "48%", "#ef4444"]].map(([m, p, c]) => (
              <div key={m} className="glass-card rounded-xl p-2 text-center">
                <div className="text-[8px]" style={{ color: "var(--muted)", marginBottom: 2 }}>{m}</div>
                <div className="text-xs font-bold" style={{ color: c }}>{p}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { icon: <FileText size={13} className="text-accent" />, bg: "color-mix(in srgb, var(--accent) 18%, transparent)", l: "Evaluaciones", v: "3 pendientes" },
            { icon: <Bell size={13} className="text-success" />, bg: "color-mix(in srgb, var(--success) 18%, transparent)", l: "Notificaciones", v: "2 nuevas" },
          ].map(({ icon, bg, l, v }) => (
            <div key={l} className="glass-card rounded-xl p-3 flex items-center gap-2">
              <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
              <div>
                <div className="text-[8px]" style={{ color: "var(--muted)" }}>{l}</div>
                <div className="text-xs font-bold">{v}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[8px]" style={{ color: "var(--muted)", marginBottom: 2 }}>Próxima lección</div>
            <div className="text-xs font-semibold">Ecuaciones de segundo grado</div>
            <div className="text-[8px]" style={{ color: "var(--muted)", marginTop: 1 }}>Unidad 4 · 20 min estimados</div>
          </div>
          <button className="btn-primary px-3 py-1.5 rounded-xl text-xxs">Ir →</button>
        </div>
      </div>

      <div className="floating-card top-card text-xxs">
        <TrendingUp size={12} className="text-success" />
        <span className="font-semibold">+12% esta semana</span>
      </div>

      <div className="floating-card bottom-card text-xxs">
        <CheckCircle size={12} className="text-accent" />
        <span className="font-semibold">Racha de 5 días 🔥</span>
      </div>
    </div>
  );
}
