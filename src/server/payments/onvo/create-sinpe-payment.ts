import "server-only";

import { randomUUID } from "node:crypto";

import {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  PlanCode,
  Prisma,
  ProviderMode,
  Role,
} from "@/generated/prisma/client";
import type { StartSinpePaymentInput } from "@/modules/payments/schemas/start-sinpe-payment.schema";
import { getSubscriptionPlan } from "@/modules/subscriptions/config/plan-catalog";
import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";
import {
  confirmOnvoPaymentIntent,
  createOnvoPaymentIntent,
  createOnvoSinpeMobilePaymentMethod,
  isDefinitiveOnvoApiRejection,
  OnvoApiError,
} from "@/server/payments/onvo/client";
import {
  CheckoutRateLimitError,
  enforceCheckoutRateLimit,
} from "@/server/payments/onvo/checkout-rate-limit";
import {
  providerModeFromEnvironment,
  reconcileOnvoPaymentIntent,
} from "@/server/payments/onvo/reconcile";
import { logOnvoPaymentEvent } from "@/server/payments/onvo/payment-log";

export class SinpeCheckoutError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "SinpeCheckoutError";
  }
}

function getProviderMode(): ProviderMode {
  const mode = process.env.ONVO_ENV;

  if (mode !== "test" && mode !== "live") {
    throw new SinpeCheckoutError(
      "ONVO_NOT_CONFIGURED",
      "ONVO no esta configurado en este entorno.",
    );
  }

  return providerModeFromEnvironment(mode);
}

function toPaymentStatus(providerStatus: string): PaymentStatus {
  if (providerStatus === "processing") return PaymentStatus.PROCESSING;
  if (providerStatus === "succeeded") return PaymentStatus.PROCESSING;
  if (providerStatus === "canceled") return PaymentStatus.CANCELED;
  if (providerStatus === "failed") return PaymentStatus.FAILED;
  if (providerStatus === "requires_payment_method") return PaymentStatus.FAILED;
  return PaymentStatus.REQUIRES_REVIEW;
}

async function findExistingCheckout(checkoutRequestId: string, userId: string) {
  const existing = await prisma.payment.findUnique({
    where: { checkoutRequestId },
  });

  if (!existing) return null;

  if (existing.userId !== userId) {
    throw new SinpeCheckoutError(
      "CHECKOUT_REQUEST_CONFLICT",
      "La solicitud de pago no pertenece al usuario autenticado.",
    );
  }

  return existing;
}

async function findOpenLevelCheckout(userId: string, levelId: string) {
  return prisma.payment.findFirst({
    where: {
      userId,
      levelId,
      status: {
        in: [
          PaymentStatus.INITIALIZING,
          PaymentStatus.PROCESSING,
          PaymentStatus.REQUIRES_REVIEW,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSinpePayment(input: StartSinpePaymentInput) {
  const user = await requireUser();

  if (user.role !== Role.STUDENT && user.role !== Role.TEACHER) {
    throw new SinpeCheckoutError(
      "ROLE_NOT_ALLOWED",
      "Tu rol no puede comprar una suscripcion.",
    );
  }

  const plan = getSubscriptionPlan(input.planCode);

  if (!plan || plan.requiredRole !== user.role) {
    throw new SinpeCheckoutError(
      "PLAN_NOT_ALLOWED",
      "El plan seleccionado no corresponde a tu rol.",
    );
  }

  const level = await prisma.level.findUnique({
    where: { id: input.levelId },
    select: {
      id: true,
      levelNumber: true,
      isActive: true,
      requiresSubscription: true,
    },
  });

  if (!level || !level.isActive) {
    throw new SinpeCheckoutError(
      "LEVEL_NOT_AVAILABLE",
      "El nivel seleccionado no esta disponible.",
    );
  }

  if (!level.requiresSubscription) {
    throw new SinpeCheckoutError(
      "LEVEL_IS_FREE",
      "Este nivel no requiere una suscripcion.",
    );
  }

  const existing = await findExistingCheckout(
    input.checkoutRequestId,
    user.id,
  );

  if (existing) return existing;

  const openLevelCheckout = await findOpenLevelCheckout(user.id, level.id);
  if (openLevelCheckout) return openLevelCheckout;

  try {
    await enforceCheckoutRateLimit(user.id);
  } catch (error) {
    if (error instanceof CheckoutRateLimitError) {
      throw new SinpeCheckoutError(
        "PAYMENT_RATE_LIMITED",
        "Espera unos minutos antes de iniciar otro pago.",
      );
    }
    throw error;
  }

  const internalReference = `EDUNIVEL-${randomUUID()}`;
  let payment;

  try {
    payment = await prisma.payment.create({
      data: {
        userId: user.id,
        levelId: level.id,
        planCode: plan.code as PlanCode,
        product: plan.product,
        billingInterval: plan.billingInterval,
        durationMonths: plan.durationMonths,
        roleAtCheckout: user.role,
        expectedAmountMinor: plan.amountMinor,
        currency: plan.currency,
        provider: PaymentProvider.ONVO,
        providerMode: getProviderMode(),
        method: PaymentMethod.SINPE_MOBILE,
        internalReference,
        checkoutRequestId: input.checkoutRequestId,
        status: PaymentStatus.INITIALIZING,
        payerPhoneLast4: input.mobileNumber.slice(-4),
        payerIdentificationLast4: input.identification.slice(-4),
        payerIdentificationType: input.identificationType,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const concurrentCheckout = await findExistingCheckout(
        input.checkoutRequestId,
        user.id,
      );
      if (concurrentCheckout) return concurrentCheckout;

      const concurrentLevelCheckout = await findOpenLevelCheckout(
        user.id,
        level.id,
      );
      if (concurrentLevelCheckout) return concurrentLevelCheckout;
    }

    throw error;
  }

  try {
    const intent = await createOnvoPaymentIntent({
      amount: payment.expectedAmountMinor,
      currency: "CRC",
      description: `Suscripcion EduNivel ${payment.planCode}`,
      metadata: {
        paymentId: payment.id,
        internalReference: payment.internalReference,
        userId: payment.userId,
        planCode: payment.planCode,
        levelId: payment.levelId,
      },
    });

    payment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentIntentId: intent.id,
        providerStatus: intent.status,
      },
    });
    logOnvoPaymentEvent({
      event: "intent.created",
      outcome: intent.status,
      paymentId: payment.id,
      paymentIntentId: intent.id,
    });

    const paymentMethod = await createOnvoSinpeMobilePaymentMethod({
      mobileNumber: {
        number: input.mobileNumber,
        identification: input.identification,
        identificationType: input.identificationType,
      },
      billing: {
        name: user.name,
        email: user.email,
      },
    });

    payment = await prisma.payment.update({
      where: { id: payment.id },
      data: { providerPaymentMethodId: paymentMethod.id },
    });
    const confirmedIntent = await confirmOnvoPaymentIntent(
      intent.id,
      paymentMethod.id,
    );

    payment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: toPaymentStatus(confirmedIntent.status),
        providerStatus: confirmedIntent.status,
        receivedAmountMinor: confirmedIntent.receivedAmount ?? null,
      },
    });
    logOnvoPaymentEvent({
      event: "intent.confirmed",
      outcome: confirmedIntent.status,
      paymentId: payment.id,
      paymentIntentId: intent.id,
    });

    if (confirmedIntent.status === "succeeded") {
      await reconcileOnvoPaymentIntent(intent.id);
      payment = (await prisma.payment.findUnique({
        where: { id: payment.id },
      }))!;
    }

    return payment;
  } catch (error) {
    const isKnownProviderRejection =
      error instanceof OnvoApiError && isDefinitiveOnvoApiRejection(error);
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: isKnownProviderRejection
          ? PaymentStatus.FAILED
          : PaymentStatus.REQUIRES_REVIEW,
        errorCode: isKnownProviderRejection
          ? (error.code ?? `ONVO_HTTP_${error.status}`)
          : "ONVO_INITIALIZATION_UNCERTAIN",
        errorMessage: isKnownProviderRejection
          ? "ONVO rechazo la inicializacion del pago."
          : "No se pudo confirmar con certeza el estado de la operacion.",
      },
    });
    logOnvoPaymentEvent({
      event: "checkout.initialization",
      outcome: isKnownProviderRejection ? "rejected" : "uncertain",
      paymentId: payment.id,
      paymentIntentId: payment.providerPaymentIntentId,
    });

    throw new SinpeCheckoutError(
      "PAYMENT_INITIALIZATION_FAILED",
      "No fue posible iniciar el pago. Puedes revisar el intento antes de volver a probar.",
    );
  }
}
