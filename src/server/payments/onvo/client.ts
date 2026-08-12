import "server-only";

import type { z } from "zod";

import { env } from "@/config/env";
import {
  onvoApiErrorSchema,
  onvoPaymentIntentSchema,
  onvoPaymentMethodSchema,
  type OnvoPaymentIntent,
  type OnvoPaymentMethod,
} from "@/server/payments/onvo/schemas";

const ONVO_API_BASE_URL = "https://api.onvopay.com/v1";
const ONVO_REQUEST_TIMEOUT_MS = 10_000;

type CreatePaymentIntentInput = {
  amount: number;
  currency: "CRC";
  description: string;
  metadata: Record<string, string>;
};

type CreateSinpeMobilePaymentMethodInput = {
  mobileNumber: {
    identification: string;
    identificationType: number;
    number: string;
  };
  billing: {
    name: string;
    email: string;
  };
};

export class OnvoConfigurationError extends Error {
  constructor() {
    super("La integracion de ONVO no esta configurada.");
    this.name = "OnvoConfigurationError";
  }
}

export class OnvoApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | null,
  ) {
    super("ONVO no pudo procesar la solicitud.");
    this.name = "OnvoApiError";
  }
}

export class OnvoResponseValidationError extends Error {
  constructor() {
    super("ONVO devolvio una respuesta con un formato inesperado.");
    this.name = "OnvoResponseValidationError";
  }
}

function getOnvoSecretKey(): string {
  if (!env.ONVO_ENV || !env.ONVO_SECRET_KEY) {
    throw new OnvoConfigurationError();
  }

  return env.ONVO_SECRET_KEY;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return null;
  }

  return response.json();
}

async function onvoRequest<TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  init?: RequestInit,
): Promise<z.output<TSchema>> {
  const response = await fetch(`${ONVO_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getOnvoSecretKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(ONVO_REQUEST_TIMEOUT_MS),
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
    const parsedError = onvoApiErrorSchema.safeParse(body);
    throw new OnvoApiError(
      response.status,
      parsedError.success ? (parsedError.data.code ?? null) : null,
    );
  }

  const parsedBody = schema.safeParse(body);

  if (!parsedBody.success) {
    throw new OnvoResponseValidationError();
  }

  return parsedBody.data;
}

export function createOnvoPaymentIntent(
  input: CreatePaymentIntentInput,
): Promise<OnvoPaymentIntent> {
  return onvoRequest("/payment-intents", onvoPaymentIntentSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createOnvoSinpeMobilePaymentMethod(
  input: CreateSinpeMobilePaymentMethodInput,
): Promise<OnvoPaymentMethod> {
  return onvoRequest("/payment-methods", onvoPaymentMethodSchema, {
    method: "POST",
    body: JSON.stringify({
      type: "mobile_number",
      ...input,
    }),
  });
}

export function confirmOnvoPaymentIntent(
  paymentIntentId: string,
  paymentMethodId: string,
): Promise<OnvoPaymentIntent> {
  return onvoRequest(
    `/payment-intents/${encodeURIComponent(paymentIntentId)}/confirm`,
    onvoPaymentIntentSchema,
    {
      method: "POST",
      body: JSON.stringify({ paymentMethodId }),
    },
  );
}

export function getOnvoPaymentIntent(
  paymentIntentId: string,
): Promise<OnvoPaymentIntent> {
  return onvoRequest(
    `/payment-intents/${encodeURIComponent(paymentIntentId)}`,
    onvoPaymentIntentSchema,
  );
}

