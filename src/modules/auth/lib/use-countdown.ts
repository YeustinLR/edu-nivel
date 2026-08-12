"use client";

import { useEffect, useState } from "react";

/**
 * Cuenta regresiva en segundos. Se usa para el cooldown de reenvio de codigos OTP.
 */
export function useCountdown(initialSeconds = 0) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  return {
    secondsLeft,
    isActive: secondsLeft > 0,
    start: setSecondsLeft,
  };
}
