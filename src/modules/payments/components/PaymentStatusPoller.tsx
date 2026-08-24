"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PaymentStatus, type PaymentStatus as PaymentStatusValue } from "@/generated/prisma/enums";
import {
  PaymentStatusPollingError,
  startPaymentStatusPolling,
} from "@/modules/payments/components/payment-status-polling";

type PaymentStatusPollerProps = {
  paymentId: string;
  initialStatus: PaymentStatusValue;
  enabled: boolean;
  deadlineAt: number;
};

function isPaymentStatus(value: unknown): value is PaymentStatusValue {
  return Object.values(PaymentStatus).includes(value as PaymentStatusValue);
}

export function PaymentStatusPoller({
  paymentId,
  initialStatus,
  enabled,
  deadlineAt,
}: PaymentStatusPollerProps) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    return startPaymentStatusPolling({
      initialStatus,
      deadlineAt,
      checkStatus: async (signal) => {
        const response = await fetch(
          `/api/payments/${encodeURIComponent(paymentId)}/status`,
          {
            method: "GET",
            cache: "no-store",
            headers: { Accept: "application/json" },
            signal,
          },
        );

        if (!response.ok) {
          throw new PaymentStatusPollingError(
            `Payment status request failed with ${response.status}.`,
            response.status >= 500 || response.status === 429,
          );
        }

        const payload: unknown = await response.json();
        const status =
          typeof payload === "object" && payload !== null && "status" in payload
            ? payload.status
            : null;

        if (!isPaymentStatus(status)) {
          throw new PaymentStatusPollingError(
            "Payment status response is invalid.",
            false,
          );
        }

        return status;
      },
      onStatusChanged: () => router.refresh(),
      isVisible: () => document.visibilityState === "visible",
      subscribeToResume: (resume) => {
        const handleVisibilityChange = () => {
          if (document.visibilityState === "visible") resume();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", resume);

        return () => {
          document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange,
          );
          window.removeEventListener("focus", resume);
        };
      },
    });
  }, [deadlineAt, enabled, initialStatus, paymentId, router]);

  return null;
}
