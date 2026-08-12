import Link from "next/link";

import { getPremiumAccessDecision } from "@/server/auth/guards";

const denialMessages: Record<string, string> = {
  ROLE_NOT_ELIGIBLE: "Tu rol no participa en los planes premium.",
  EMAIL_NOT_VERIFIED: "Debes verificar tu correo antes de acceder.",
  SUBSCRIPTION_REQUIRED: "Necesitas una suscripcion para abrir esta pagina.",
  SUBSCRIPTION_INACTIVE: "Tu suscripcion no esta activa.",
  SUBSCRIPTION_NOT_STARTED: "La vigencia de tu suscripcion aun no inicia.",
  SUBSCRIPTION_EXPIRED: "Tu suscripcion ya vencio.",
  SUBSCRIPTION_PRODUCT_MISMATCH:
    "La suscripcion no corresponde al producto requerido por tu rol.",
  SUBSCRIPTION_PAYMENT_UNCONFIRMED:
    "No existe un pago confirmado y aplicado para esta suscripcion.",
};

export default async function PremiumTestPage() {
  const { decision, subscription } = await getPremiumAccessDecision();

  if (!decision.allowed || !subscription) {
    const code = decision.allowed ? "SUBSCRIPTION_REQUIRED" : decision.code;

    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm font-medium text-secondary">Contenido bloqueado</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Pagina premium de prueba
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted">
          {denialMessages[code] ?? "No tienes acceso premium vigente."}
        </p>
        <Link
          href="/dashboard/subscription"
          className="mt-6 inline-block rounded-lg bg-secondary px-5 py-3 font-medium text-white"
        >
          Ver planes y desbloquear
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-success/30 bg-success/10 p-8 text-center">
      <p className="text-sm font-medium text-success">Acceso autorizado</p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">
        Pagina premium de prueba
      </h1>
      <p className="mt-3 text-sm text-muted">
        La validacion server-side encontro una suscripcion vigente, compatible con
        tu rol y respaldada por un pago confirmado.
      </p>
      <p className="mt-4 text-sm font-medium text-foreground">
        Vigente hasta {subscription.currentPeriodEnd.toLocaleDateString("es-CR")}
      </p>
    </div>
  );
}
