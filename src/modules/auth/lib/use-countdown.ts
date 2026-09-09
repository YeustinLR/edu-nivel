"use client";

import { useCallback, useEffect, useState } from "react";

function secondsUntil(deadline: number) {
  return Math.max(Math.ceil((deadline - Date.now()) / 1000), 0);
}

export function storeCountdownDeadline(storageKey: string, seconds: number) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(storageKey, String(Date.now() + seconds * 1000));
}

/**
 * Cuenta regresiva en segundos. Se usa para el cooldown de reenvio de codigos OTP.
 */
export function useCountdown(initialSeconds = 0, storageKey?: string) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!storageKey || typeof window === "undefined") return initialSeconds;
    const stored = Number(window.sessionStorage.getItem(storageKey));
    return Number.isFinite(stored) ? secondsUntil(stored) : initialSeconds;
  });

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!storageKey) {
        setSecondsLeft((current) => Math.max(current - 1, 0));
        return;
      }
      const stored = Number(window.sessionStorage.getItem(storageKey));
      const next = Number.isFinite(stored) ? secondsUntil(stored) : 0;
      setSecondsLeft(next);
      if (next === 0) window.sessionStorage.removeItem(storageKey);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [secondsLeft, storageKey]);

  const start = useCallback((seconds: number) => {
    setSecondsLeft(seconds);
    if (storageKey) storeCountdownDeadline(storageKey, seconds);
  }, [storageKey]);

  return {
    secondsLeft,
    isActive: secondsLeft > 0,
    start,
  };
}
