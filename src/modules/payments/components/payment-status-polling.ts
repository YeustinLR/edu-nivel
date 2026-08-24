import type { PaymentStatus } from "@/generated/prisma/enums";

export const PAYMENT_STATUS_POLLING_DELAYS_MS = [15_000, 30_000, 60_000] as const;

export class PaymentStatusPollingError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "PaymentStatusPollingError";
  }
}

type TimerHandle = ReturnType<typeof setTimeout>;

type PaymentStatusPollingOptions = {
  initialStatus: PaymentStatus;
  deadlineAt: number;
  checkStatus: (signal: AbortSignal) => Promise<PaymentStatus>;
  onStatusChanged: (status: PaymentStatus) => void;
  isVisible: () => boolean;
  subscribeToResume: (listener: () => void) => () => void;
  now?: () => number;
  setTimer?: (callback: () => void, delay: number) => TimerHandle;
  clearTimer?: (timer: TimerHandle) => void;
};

export function startPaymentStatusPolling({
  initialStatus,
  deadlineAt,
  checkStatus,
  onStatusChanged,
  isVisible,
  subscribeToResume,
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}: PaymentStatusPollingOptions) {
  const deadline = deadlineAt;
  let stopped = false;
  let inFlight = false;
  let delayIndex = 0;
  let timer: TimerHandle | null = null;
  let deadlineTimer: TimerHandle | null = null;
  let requestController: AbortController | null = null;
  let unsubscribeFromResume = () => {};

  const clearScheduledCheck = () => {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearScheduledCheck();
    if (deadlineTimer !== null) {
      clearTimer(deadlineTimer);
      deadlineTimer = null;
    }
    requestController?.abort();
    unsubscribeFromResume();
  };

  const scheduleNextCheck = () => {
    if (stopped) return;
    if (now() >= deadline) {
      stop();
      return;
    }
    if (!isVisible()) return;

    const delay = PAYMENT_STATUS_POLLING_DELAYS_MS[
      Math.min(delayIndex, PAYMENT_STATUS_POLLING_DELAYS_MS.length - 1)
    ];
    clearScheduledCheck();
    timer = setTimer(() => {
      timer = null;
      void poll();
    }, delay);
  };

  const poll = async () => {
    if (stopped || inFlight) return;
    if (now() >= deadline) {
      stop();
      return;
    }
    if (!isVisible()) return;

    inFlight = true;
    requestController = new AbortController();

    try {
      const status = await checkStatus(requestController.signal);
      if (stopped) return;

      if (status !== initialStatus) {
        stop();
        onStatusChanged(status);
        return;
      }

      delayIndex += 1;
      scheduleNextCheck();
    } catch (error) {
      if (stopped || requestController.signal.aborted) return;

      if (
        error instanceof PaymentStatusPollingError &&
        !error.retryable
      ) {
        stop();
        return;
      }

      delayIndex += 1;
      scheduleNextCheck();
    } finally {
      inFlight = false;
      requestController = null;
    }
  };

  const resume = () => {
    if (stopped || !isVisible()) return;
    if (now() >= deadline) {
      stop();
      return;
    }
    clearScheduledCheck();
    void poll();
  };

  unsubscribeFromResume = subscribeToResume(resume);
  const remainingTime = deadline - now();
  if (remainingTime <= 0) {
    stop();
    return stop;
  }

  deadlineTimer = setTimer(stop, remainingTime);
  scheduleNextCheck();

  return stop;
}
