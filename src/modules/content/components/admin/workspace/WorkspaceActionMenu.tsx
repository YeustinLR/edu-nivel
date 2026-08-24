"use client";

import { MoreVertical } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type ToggleEvent,
} from "react";

export function WorkspaceActionMenu({
  label,
  children,
  placement = "down",
}: {
  label: string;
  children: ReactNode;
  placement?: "up" | "down";
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);

  function cancelScheduledClose() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  function closeImmediately() {
    cancelScheduledClose();
    setOpen(false);
  }

  function scheduleClose() {
    cancelScheduledClose();
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      closeTimeoutRef.current = null;
    }, 350);
  }

  useEffect(() => {
    if (!open) return;

    function closeFromOutside(event: PointerEvent) {
      if (!detailsRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeFromKeyboard(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      detailsRef.current?.querySelector("summary")?.focus();
    }

    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeFromKeyboard);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeFromKeyboard);
      cancelScheduledClose();
    };
  }, [open]);

  function closeAfterAction(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a")) closeImmediately();
  }

  return (
    <details
      ref={detailsRef}
      open={open}
      onToggle={(event: ToggleEvent<HTMLDetailsElement>) =>
        setOpen(event.currentTarget.open)
      }
      onMouseEnter={cancelScheduledClose}
      onMouseLeave={scheduleClose}
      className="group relative shrink-0"
    >
      <summary
        aria-label={label}
        className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-border text-muted hover:bg-surface-elevated hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary [&::-webkit-details-marker]:hidden"
      >
        <MoreVertical aria-hidden="true" className="h-4 w-4" />
      </summary>
      <div
        onClick={closeAfterAction}
        className={`absolute right-0 z-30 w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl ${
          placement === "up" ? "bottom-full mb-1" : "top-full mt-1"
        }`}
      >
        {children}
      </div>
    </details>
  );
}
