"use client";

import type { ClipboardEvent, KeyboardEvent } from "react";
import { useRef, useState } from "react";

import { AUTH_OTP_LENGTH } from "@/modules/auth/lib/otp";

/**
 * Estado e interaccion de un campo OTP de N digitos: escritura digito a digito con
 * avance automatico, backspace hacia el digito anterior y pegado del codigo completo.
 *
 * Lo comparten verificacion de correo y restablecimiento de contrasena.
 */
export function useOtpInput(length: number = AUTH_OTP_LENGTH) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(""));
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const otp = digits.join("");
  const isComplete = otp.length === length && digits.every(Boolean);

  function focusInput(index: number) {
    inputRefs.current[index]?.focus();
  }

  function handleDigitChange(index: number, value: string) {
    const nextDigit = value.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = nextDigit;
    setDigits(nextDigits);

    if (nextDigit && index < length - 1) {
      focusInput(index + 1);
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      focusInput(index - 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pastedDigits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length)
      .split("");

    if (!pastedDigits.length) {
      return;
    }

    const nextDigits = Array<string>(length).fill("");
    pastedDigits.forEach((digit, index) => {
      nextDigits[index] = digit;
    });
    setDigits(nextDigits);
    focusInput(Math.min(pastedDigits.length, length) - 1);
  }

  function reset() {
    setDigits(Array(length).fill(""));
    focusInput(0);
  }

  return {
    digits,
    otp,
    isComplete,
    inputRefs,
    handleDigitChange,
    handleKeyDown,
    handlePaste,
    reset,
  };
}
