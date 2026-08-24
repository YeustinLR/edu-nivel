import { PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";
import type {
  LearnerSubscriptionItem,
} from "@/modules/subscriptions/types/learner-subscription";

const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Costa_Rica",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Costa_Rica",
});

export function formatSubscriptionDate(value: string | Date) {
  return dateFormatter.format(new Date(value));
}

export function formatSubscriptionDateTime(value: string | Date) {
  return dateTimeFormatter.format(new Date(value));
}

export function getPlanIntervalLabel(planCode: string) {
  return planCode.endsWith("YEARLY") ? "Anual" : "Mensual";
}

export function getPaymentMethodLabel(method: PaymentMethod) {
  return method === PaymentMethod.SINPE_MOBILE ? "SINPE Móvil" : method;
}

export const paymentStatusPresentation: Record<
  PaymentStatus,
  { label: string; tone: "success" | "pending" | "danger" | "neutral" }
> = {
  [PaymentStatus.INITIALIZING]: { label: "Inicializando", tone: "pending" },
  [PaymentStatus.PROCESSING]: { label: "Pendiente", tone: "pending" },
  [PaymentStatus.SUCCEEDED]: { label: "Pagado", tone: "success" },
  [PaymentStatus.FAILED]: { label: "Fallido", tone: "danger" },
  [PaymentStatus.CANCELED]: { label: "Cancelado", tone: "neutral" },
  [PaymentStatus.REFUNDED]: { label: "Reembolsado", tone: "neutral" },
  [PaymentStatus.REQUIRES_REVIEW]: {
    label: "En revisión",
    tone: "pending",
  },
};

export function getPrimarySubscription(
  subscriptions: LearnerSubscriptionItem[],
) {
  return (
    subscriptions.find((item) => item.isSelectedLevel) ??
    subscriptions.find((item) => item.canStudy) ??
    subscriptions[0] ??
    null
  );
}
