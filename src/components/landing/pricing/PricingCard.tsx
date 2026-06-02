import { CheckCircle } from "lucide-react";

import { formatCRC } from "@/lib/currency";
import { Plan } from "@/types/plan";

interface Props {
  plan: Plan;
  annual: boolean;
}

export default function PricingCard({ plan, annual }: Props) {
  const Icon = plan.icon;

  return (
    <div className={`glass-card card-hover rounded-3xl p-7 flex flex-col ${plan.destacado ? "plan-destacado" : ""}`}>
      {plan.destacado && (
        <div className="flex justify-center mb-4">
          <span className="plan-badge">Más popular</span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-5">
        <div
          className="pricing-icon-wrapper"
          style={{
            color: plan.color === "yellow" ? "var(--accent)" : plan.color === "purple" ? "var(--secondary)" : "var(--success)",
            background: plan.color === "yellow" ? "color-mix(in srgb, var(--accent) 18%, transparent)" : plan.color === "purple" ? "color-mix(in srgb, var(--secondary) 18%, transparent)" : "color-mix(in srgb, var(--success) 18%, transparent)",
          }}
        >
          <Icon size={20} />
        </div>
        <h3 className="text-h3 font-bold">{plan.nombre}</h3>
      </div>

      <div className="mb-5">
        {plan.mensual ? (
          <>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-[28px] font-extrabold">
                {formatCRC(annual ? Math.round(plan.anual! / 12) : plan.mensual)}
              </span>
              <span className="text-muted mb-1 text-xs">/mes</span>
            </div>
            {annual && (
              <div className="text-muted text-xs">
                {formatCRC(plan.anual!)} al año · Ahorrás {formatCRC(plan.mensual * 12 - plan.anual!)}
              </div>
            )}
          </>
        ) : (
          <div className="text-[22px] font-extrabold text-secondary">Precio a consultar</div>
        )}
        <p className="text-muted mt-2 text-xs" style={{ lineHeight: 1.6 }}>{plan.desc}</p>
      </div>

      <ul style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, flex: 1 }}>
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-foreground-secondary text-xs">
            <CheckCircle size={13} className="text-success mt-0.5 shrink-0" />{feature}
          </li>
        ))}
      </ul>

      <button
        className={`w-full py-3 rounded-2xl text-small font-semibold transition-all duration-200 ${
          plan.destacado ? "btn-primary" : plan.id === "institucion" ? "btn-ghost" : "btn-outline"
        }`}
      >
        {plan.cta}
      </button>
    </div>
  );
}
