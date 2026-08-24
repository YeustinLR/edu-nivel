import type { SubscriptionPlanCode } from "@/modules/subscriptions/config/plan-catalog";

export type LearnerCheckoutFieldErrors = Partial<
  Record<
    | "levelId"
    | "planCode"
    | "mobileNumber"
    | "identificationType"
    | "identification",
    string[]
  >
>;

export type LearnerCheckoutSafeValues = {
  levelId?: string;
  subscriptionId?: string;
  planCode?: SubscriptionPlanCode;
  checkoutRequestId: string;
};

export type LearnerCheckoutActionState =
  | { status: "idle"; revision: 0 }
  | {
      status: "error";
      revision: number;
      message: string;
      code: string;
      fieldErrors?: LearnerCheckoutFieldErrors;
      values: LearnerCheckoutSafeValues;
    };

export const initialLearnerCheckoutActionState: LearnerCheckoutActionState = {
  status: "idle",
  revision: 0,
};

export const learnerCheckoutErrorMessages: Record<string, string> = {
  INVALID_PAYMENT_DATA: "Revisa los campos marcados e inténtalo nuevamente.",
  PLAN_NOT_ALLOWED: "El plan seleccionado no corresponde a tu cuenta.",
  ROLE_NOT_ALLOWED: "Tu cuenta no puede adquirir suscripciones.",
  CHECKOUT_REQUEST_CONFLICT: "La operación de pago no pertenece a tu cuenta.",
  LEVEL_NOT_AVAILABLE: "El nivel seleccionado ya no está disponible.",
  LEVEL_IS_FREE: "Este nivel no requiere una suscripción.",
  LEVEL_ALREADY_OWNED: "Ya tienes una suscripción para este nivel.",
  SUBSCRIPTION_NOT_FOUND: "No encontramos esta suscripción en tu cuenta.",
  SUBSCRIPTION_NOT_RENEWABLE:
    "Esta suscripción no se puede renovar actualmente.",
  PAYMENT_ALREADY_OPEN: "Ya existe una operación pendiente para ese nivel.",
  ONVO_NOT_CONFIGURED:
    "El servicio de pagos no está disponible en este momento. Inténtalo más tarde.",
  PAYMENT_INITIALIZATION_FAILED:
    "No fue posible iniciar el pago. Revisa el intento antes de volver a probar.",
  PAYMENT_RATE_LIMITED:
    "Has iniciado varios pagos en poco tiempo. Espera unos minutos y vuelve a intentarlo.",
};
