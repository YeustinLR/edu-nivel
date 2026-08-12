"use client";

import type { ClipboardEvent, KeyboardEvent, RefObject } from "react";

type OtpInputProps = {
  digits: string[];
  inputRefs: RefObject<Array<HTMLInputElement | null>>;
  disabled?: boolean;
  onDigitChange: (index: number, value: string) => void;
  onKeyDown: (index: number, event: KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLInputElement>) => void;
};

// Grid de inputs de un digito. El estado y los handlers vienen de `useOtpInput`.
export default function OtpInput({
  digits,
  inputRefs,
  disabled = false,
  onDigitChange,
  onKeyDown,
  onPaste,
}: OtpInputProps) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${digits.length}, minmax(0, 1fr))` }}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(event) => onDigitChange(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={onPaste}
          className="aspect-square w-full rounded-lg border border-border bg-background text-center text-xl font-bold text-foreground outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-70"
          aria-label={`Digito ${index + 1}`}
        />
      ))}
    </div>
  );
}
