"use client";

import { useState } from "react";

import { plans } from "@/data/plans";

import PricingCard from "./PricingCard";
import PricingToggle from "./PricingToggle";
import SectionTitle from "../shared/SectionTitle";

export default function Pricing() {
  const [planAnual, setPlanAnual] = useState(false);

  return (
    <section id="precios" className="section-alt py-24 px-5 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <SectionTitle
          badge="Modelo de suscripción · Tilopay"
          title="Planes pensados para Costa Rica"
          description="Pagos procesados de forma segura con Tilopay. Aceptamos Visa, Mastercard y American Express. Sin contratos de permanencia."
        />

        <PricingToggle planAnual={planAnual} setPlanAnual={setPlanAnual} />

        <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} annual={planAnual} />
          ))}
        </div>

        <p className="text-center text-muted mt-8" style={{ fontSize: 12 }}>
          🔒 Pago seguro procesado por Tilopay · Precios en colones costarricenses (₡) · IVA incluido
        </p>
      </div>
    </section>
  );
}
