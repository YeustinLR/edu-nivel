import { beforeEach, describe, expect, it, vi } from "vitest";

import { PaymentStatus } from "@/generated/prisma/enums";
import {
  PAYMENT_STATUS_POLLING_DELAYS_MS,
  PaymentStatusPollingError,
  startPaymentStatusPolling,
} from "@/modules/payments/components/payment-status-polling";

type ScheduledTimer = {
  callback: () => void;
  delay: number;
  cleared: boolean;
};

function createHarness({ visible = true, now = 0 } = {}) {
  const timers: ScheduledTimer[] = [];
  let resumeListener: (() => void) | null = null;
  let isVisible = visible;
  let currentTime = now;
  const unsubscribe = vi.fn();

  const setTimer = vi.fn((callback: () => void, delay: number) => {
    const timer = { callback, delay, cleared: false };
    timers.push(timer);
    return timer as unknown as ReturnType<typeof setTimeout>;
  });
  const clearTimer = vi.fn((handle: ReturnType<typeof setTimeout>) => {
    (handle as unknown as ScheduledTimer).cleared = true;
  });

  const runNextTimer = async () => {
    const timer = timers
      .filter((candidate) => !candidate.cleared)
      .sort((left, right) => left.delay - right.delay)[0];
    if (!timer) throw new Error("No active timer was scheduled.");
    timer.cleared = true;
    timer.callback();
    await Promise.resolve();
    await Promise.resolve();
  };

  return {
    timers,
    setTimer,
    clearTimer,
    runNextTimer,
    now: () => currentTime,
    advanceTime: (milliseconds: number) => {
      currentTime += milliseconds;
    },
    isVisible: () => isVisible,
    setVisible: (nextVisible: boolean) => {
      isVisible = nextVisible;
    },
    subscribeToResume: (listener: () => void) => {
      resumeListener = listener;
      return unsubscribe;
    },
    resume: async () => {
      resumeListener?.();
      await Promise.resolve();
      await Promise.resolve();
    },
    unsubscribe,
  };
}

describe("payment status polling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("backs off while the payment remains pending", async () => {
    const harness = createHarness();
    const checkStatus = vi.fn().mockResolvedValue(PaymentStatus.PROCESSING);

    const stop = startPaymentStatusPolling({
      initialStatus: PaymentStatus.PROCESSING,
      deadlineAt: 30 * 60_000,
      checkStatus,
      onStatusChanged: vi.fn(),
      ...harness,
    });

    expect(harness.timers.at(-1)?.delay).toBe(
      PAYMENT_STATUS_POLLING_DELAYS_MS[0],
    );
    await harness.runNextTimer();
    expect(harness.timers.at(-1)?.delay).toBe(
      PAYMENT_STATUS_POLLING_DELAYS_MS[1],
    );
    await harness.runNextTimer();
    expect(harness.timers.at(-1)?.delay).toBe(
      PAYMENT_STATUS_POLLING_DELAYS_MS[2],
    );
    await harness.runNextTimer();
    expect(harness.timers.at(-1)?.delay).toBe(
      PAYMENT_STATUS_POLLING_DELAYS_MS[2],
    );

    stop();
  });

  it("stops and refreshes once when PENDING changes to SUCCESS", async () => {
    const harness = createHarness();
    const onStatusChanged = vi.fn();

    startPaymentStatusPolling({
      initialStatus: PaymentStatus.PROCESSING,
      deadlineAt: 30 * 60_000,
      checkStatus: vi.fn().mockResolvedValue(PaymentStatus.SUCCEEDED),
      onStatusChanged,
      ...harness,
    });

    await harness.runNextTimer();

    expect(onStatusChanged).toHaveBeenCalledOnce();
    expect(onStatusChanged).toHaveBeenCalledWith(PaymentStatus.SUCCEEDED);
    expect(harness.timers.filter((timer) => !timer.cleared)).toHaveLength(0);
    expect(harness.unsubscribe).toHaveBeenCalledOnce();
  });

  it("stops when the payment reaches a negative terminal status", async () => {
    const harness = createHarness();
    const onStatusChanged = vi.fn();

    startPaymentStatusPolling({
      initialStatus: PaymentStatus.PROCESSING,
      deadlineAt: 30 * 60_000,
      checkStatus: vi.fn().mockResolvedValue(PaymentStatus.FAILED),
      onStatusChanged,
      ...harness,
    });

    await harness.runNextTimer();

    expect(onStatusChanged).toHaveBeenCalledWith(PaymentStatus.FAILED);
    expect(harness.timers.filter((timer) => !timer.cleared)).toHaveLength(0);
  });

  it("does not start after the polling timeout", () => {
    const harness = createHarness();
    const checkStatus = vi.fn();

    const stop = startPaymentStatusPolling({
      initialStatus: PaymentStatus.PROCESSING,
      deadlineAt: 0,
      checkStatus,
      onStatusChanged: vi.fn(),
      ...harness,
    });

    expect(harness.timers).toHaveLength(0);
    expect(checkStatus).not.toHaveBeenCalled();
    expect(harness.unsubscribe).toHaveBeenCalledOnce();
    stop();
  });

  it("cleans up at the deadline even while the tab remains hidden", async () => {
    const harness = createHarness({ visible: false });
    const checkStatus = vi.fn();

    startPaymentStatusPolling({
      initialStatus: PaymentStatus.PROCESSING,
      deadlineAt: 60_000,
      checkStatus,
      onStatusChanged: vi.fn(),
      ...harness,
    });

    expect(harness.timers).toHaveLength(1);
    harness.advanceTime(60_000);
    await harness.runNextTimer();

    expect(checkStatus).not.toHaveBeenCalled();
    expect(harness.unsubscribe).toHaveBeenCalledOnce();
    expect(harness.timers.filter((timer) => !timer.cleared)).toHaveLength(0);
  });

  it("aborts an in-flight request and removes listeners during cleanup", async () => {
    const harness = createHarness();
    const requestState: {
      signal?: AbortSignal;
      resolve?: (status: PaymentStatus) => void;
    } = {};
    const checkStatus = vi.fn(
      (signal: AbortSignal) =>
        new Promise<PaymentStatus>((resolve) => {
          requestState.signal = signal;
          requestState.resolve = resolve;
        }),
    );
    const onStatusChanged = vi.fn();
    const stop = startPaymentStatusPolling({
      initialStatus: PaymentStatus.PROCESSING,
      deadlineAt: 30 * 60_000,
      checkStatus,
      onStatusChanged,
      ...harness,
    });

    const pendingTimer = harness.timers.find((timer) => timer.delay === 15_000);
    if (!pendingTimer) throw new Error("Initial polling timer was not scheduled.");
    pendingTimer.cleared = true;
    pendingTimer.callback();
    await Promise.resolve();
    stop();

    expect(requestState.signal?.aborted).toBe(true);
    expect(harness.unsubscribe).toHaveBeenCalledOnce();
    requestState.resolve?.(PaymentStatus.SUCCEEDED);
    await Promise.resolve();
    expect(onStatusChanged).not.toHaveBeenCalled();
  });

  it("pauses while hidden and checks immediately when visibility returns", async () => {
    const harness = createHarness({ visible: false });
    const checkStatus = vi.fn().mockResolvedValue(PaymentStatus.PROCESSING);

    const stop = startPaymentStatusPolling({
      initialStatus: PaymentStatus.PROCESSING,
      deadlineAt: 30 * 60_000,
      checkStatus,
      onStatusChanged: vi.fn(),
      ...harness,
    });

    expect(harness.timers).toHaveLength(1);
    expect(harness.timers[0]?.delay).toBe(30 * 60_000);
    harness.setVisible(true);
    await harness.resume();

    expect(checkStatus).toHaveBeenCalledOnce();
    expect(harness.timers.at(-1)?.delay).toBe(30_000);
    stop();
  });

  it("never overlaps checks when resume events arrive during a request", async () => {
    const harness = createHarness({ visible: false });
    const requestState: {
      resolve?: (status: PaymentStatus) => void;
    } = {};
    const checkStatus = vi.fn(
      () =>
        new Promise<PaymentStatus>((resolve) => {
          requestState.resolve = resolve;
        }),
    );
    const stop = startPaymentStatusPolling({
      initialStatus: PaymentStatus.PROCESSING,
      deadlineAt: 30 * 60_000,
      checkStatus,
      onStatusChanged: vi.fn(),
      ...harness,
    });

    harness.setVisible(true);
    await harness.resume();
    await harness.resume();

    expect(checkStatus).toHaveBeenCalledOnce();
    requestState.resolve?.(PaymentStatus.PROCESSING);
    await Promise.resolve();
    await Promise.resolve();
    stop();
  });

  it("stops immediately after a non-retryable endpoint error", async () => {
    const harness = createHarness();
    const checkStatus = vi
      .fn()
      .mockRejectedValue(new PaymentStatusPollingError("Not found", false));

    startPaymentStatusPolling({
      initialStatus: PaymentStatus.PROCESSING,
      deadlineAt: 30 * 60_000,
      checkStatus,
      onStatusChanged: vi.fn(),
      ...harness,
    });

    await harness.runNextTimer();

    expect(checkStatus).toHaveBeenCalledOnce();
    expect(harness.timers.filter((timer) => !timer.cleared)).toHaveLength(0);
  });
});
