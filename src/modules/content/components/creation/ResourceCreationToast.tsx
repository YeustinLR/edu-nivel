"use client";

import { CircleCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

const defaultClearParams = ["notice"];

export function ResourceCreationToast({
  message,
  clearParams,
}: {
  message?: string;
  clearParams?: string[];
}) {
  const [visible, setVisible] = useState(Boolean(message));
  const paramsToClear = clearParams ?? defaultClearParams;

  useEffect(() => {
    if (!message) return;
    const url = new URL(window.location.href);
    paramsToClear.forEach((param) => url.searchParams.delete(param));
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );

    const timeout = window.setTimeout(() => setVisible(false), 5_000);
    return () => window.clearTimeout(timeout);
  }, [message, paramsToClear]);

  if (!message || !visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-xl border border-success/25 bg-card px-4 py-3 text-sm text-foreground shadow-xl"
    >
      <CircleCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-success" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Cerrar notificación"
        className="rounded p-1 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
