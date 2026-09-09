"use client";

import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";

import { markAllNotificationsReadAction } from "@/modules/notifications/actions/notification-actions";
import {
  notificationPanelModeForViewport,
  parseNotificationPreviewPayload,
  type NotificationPanelMode,
  type NotificationPreviewItem,
} from "@/modules/notifications/domain/notification-preview";
import {
  NotificationInboxPanel,
  type NotificationPreviewLoadState,
} from "@/modules/notifications/components/NotificationInboxPanel";

import styles from "./NotificationBell.module.css";

export const NOTIFICATIONS_CHANGED = "edunivel:notifications-changed";

const PREVIEW_STALE_AFTER_MS = 30_000;
const MOBILE_BREAKPOINT = "(max-width: 1023px)";
const PANEL_ID = "dashboard-notification-inbox";

export function NotificationBell({
  tone = "default",
}: {
  tone?: "default" | "learner";
}) {
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);
  const [countFailed, setCountFailed] = useState(false);
  const [items, setItems] = useState<NotificationPreviewItem[]>([]);
  const [loadState, setLoadState] = useState<NotificationPreviewLoadState>("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<NotificationPanelMode | null>(null);
  const [markAllPending, startMarkAllTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const desktopPanelRef = useRef<HTMLDivElement>(null);
  const mobileDialogRef = useRef<HTMLDialogElement>(null);
  const countRequestRef = useRef<AbortController | null>(null);
  const previewRequestRef = useRef<AbortController | null>(null);
  const lastCountRequestRef = useRef(0);
  const lastPreviewRequestRef = useRef(0);
  const hasPreviewRef = useRef(false);
  const panelModeRef = useRef<NotificationPanelMode | null>(null);
  const previousBodyOverflowRef = useRef<string | null>(null);
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    panelModeRef.current = panelMode;
  }, [panelMode]);

  const refreshCount = useCallback(async (force = false) => {
    if (!force && Date.now() - lastCountRequestRef.current < PREVIEW_STALE_AFTER_MS) {
      return;
    }
    lastCountRequestRef.current = Date.now();
    countRequestRef.current?.abort();
    const request = new AbortController();
    countRequestRef.current = request;
    try {
      const response = await fetch("/api/dashboard/notifications/unread-count", {
        cache: "no-store",
        signal: request.signal,
      });
      if (!response.ok) throw new Error("Count unavailable");
      const data: unknown = await response.json();
      if (
        !data ||
        typeof data !== "object" ||
        !("unreadCount" in data) ||
        !Number.isSafeInteger(data.unreadCount) ||
        (data.unreadCount as number) < 0
      ) {
        throw new Error("Invalid count");
      }
      if (!request.signal.aborted) {
        setCount(data.unreadCount as number);
        setCountFailed(false);
      }
    } catch {
      if (!request.signal.aborted) setCountFailed(true);
    } finally {
      if (countRequestRef.current === request) countRequestRef.current = null;
    }
  }, []);

  const loadPreview = useCallback(async (force = false) => {
    if (
      !force &&
      hasPreviewRef.current &&
      Date.now() - lastPreviewRequestRef.current < PREVIEW_STALE_AFTER_MS
    ) {
      return;
    }

    previewRequestRef.current?.abort();
    const request = new AbortController();
    previewRequestRef.current = request;
    if (!hasPreviewRef.current) setLoadState("loading");
    setActionError(null);
    try {
      const response = await fetch("/api/dashboard/notifications/preview", {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: request.signal,
      });
      if (!response.ok) throw new Error("Preview unavailable");
      const payload = parseNotificationPreviewPayload(await response.json());
      if (!payload) throw new Error("Invalid preview");
      if (request.signal.aborted) return;

      hasPreviewRef.current = true;
      lastPreviewRequestRef.current = Date.now();
      setItems(payload.items);
      setCount(payload.unreadCount);
      setCountFailed(false);
      setLoadState("ready");
    } catch {
      if (request.signal.aborted) return;
      if (hasPreviewRef.current) {
        setActionError("No se pudo actualizar la bandeja. Mostramos el último resultado disponible.");
        setLoadState("ready");
      } else {
        setLoadState("error");
      }
    } finally {
      if (previewRequestRef.current === request) previewRequestRef.current = null;
    }
  }, []);

  const unlockBodyScroll = useCallback(() => {
    if (previousBodyOverflowRef.current === null) return;
    document.body.style.overflow = previousBodyOverflowRef.current;
    previousBodyOverflowRef.current = null;
  }, []);

  const lockBodyScroll = useCallback(() => {
    if (previousBodyOverflowRef.current === null) {
      previousBodyOverflowRef.current = document.body.style.overflow;
    }
    document.body.style.overflow = "hidden";
  }, []);

  const closePanel = useCallback((restoreFocus = true) => {
    const dialog = mobileDialogRef.current;
    if (dialog?.open) {
      dialog.close();
      return;
    }
    setPanelMode(null);
    panelModeRef.current = null;
    if (restoreFocus) window.requestAnimationFrame(() => buttonRef.current?.focus());
  }, []);

  const handleMobileDialogClose = useCallback(() => {
    unlockBodyScroll();
    setPanelMode(null);
    panelModeRef.current = null;
    window.requestAnimationFrame(() => buttonRef.current?.focus());
  }, [unlockBodyScroll]);

  const openPanel = useCallback(() => {
    if (panelModeRef.current) {
      closePanel();
      return;
    }

    void loadPreview();
    const nextMode = notificationPanelModeForViewport(
      window.matchMedia(MOBILE_BREAKPOINT).matches,
    );
    if (nextMode === "mobile") {
      setPanelMode("mobile");
      panelModeRef.current = "mobile";
      lockBodyScroll();
      mobileDialogRef.current?.showModal();
      window.requestAnimationFrame(() => {
        mobileDialogRef.current
          ?.querySelector<HTMLButtonElement>(
            '[aria-label="Cerrar notificaciones"]',
          )
          ?.focus();
      });
      return;
    }

    setPanelMode("desktop");
    panelModeRef.current = "desktop";
    window.requestAnimationFrame(() => {
      desktopPanelRef.current
        ?.querySelector<HTMLButtonElement>('[aria-label="Cerrar notificaciones"]')
        ?.focus();
    });
  }, [closePanel, loadPreview, lockBodyScroll]);

  useEffect(() => {
    const viewport = window.matchMedia(MOBILE_BREAKPOINT);
    const handleViewportChange = () => {
      const currentMode = panelModeRef.current;
      if (!currentMode) return;
      const nextMode = notificationPanelModeForViewport(viewport.matches);
      if (currentMode !== nextMode) closePanel();
    };
    viewport.addEventListener("change", handleViewportChange);
    return () => viewport.removeEventListener("change", handleViewportChange);
  }, [closePanel]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refreshCount(), 0);
    const handleFocus = () => {
      if (document.visibilityState === "visible") void refreshCount();
    };
    const handleChanged = () => {
      lastCountRequestRef.current = 0;
      lastPreviewRequestRef.current = 0;
      void refreshCount(true);
      if (panelModeRef.current) void loadPreview(true);
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener(NOTIFICATIONS_CHANGED, handleChanged);
    return () => {
      window.clearTimeout(initialRefresh);
      countRequestRef.current?.abort();
      previewRequestRef.current?.abort();
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(NOTIFICATIONS_CHANGED, handleChanged);
      unlockBodyScroll();
    };
  }, [loadPreview, refreshCount, unlockBodyScroll]);

  useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      previousPathnameRef.current = pathname;
      closePanel(false);
      void refreshCount(true);
    }
  }, [closePanel, pathname, refreshCount]);

  useEffect(() => {
    if (panelMode !== "desktop") return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) closePanel(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePanel, panelMode]);

  const markAllRead = () => {
    setActionError(null);
    startMarkAllTransition(async () => {
      try {
        const result = await markAllNotificationsReadAction();
        if (result.status !== "success") {
          setActionError(result.message ?? "No se pudieron actualizar las notificaciones.");
          return;
        }
        const readAt = new Date().toISOString();
        setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
        setCount(0);
        window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
      } catch {
        setActionError("No se pudieron marcar las notificaciones. Inténtalo nuevamente.");
      }
    });
  };

  const label = count === null
    ? `Notificaciones, contador no disponible${countFailed ? ", vuelve a intentarlo al abrir" : ""}`
    : `Notificaciones, ${count} sin leer${countFailed ? ", último dato disponible" : ""}`;
  const buttonTone = tone === "learner"
    ? "text-[var(--student-text)] hover:bg-[var(--student-soft)] focus-visible:outline-[var(--student-blue)]"
    : "text-foreground hover:bg-surface-elevated focus-visible:outline-secondary";
  const panelTone = tone === "learner"
    ? "border-[var(--student-border)] bg-[var(--student-panel)]"
    : "border-border bg-card";

  const panel = (mobile: boolean) => (
    <NotificationInboxPanel
      tone={tone}
      items={items}
      unreadCount={count}
      loadState={loadState}
      actionError={actionError}
      markAllPending={markAllPending}
      onClose={closePanel}
      onRetry={() => void loadPreview(true)}
      onMarkAllRead={markAllRead}
      mobile={mobile}
    />
  );

  return (
    <div ref={wrapperRef} className="relative ml-auto shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={openPanel}
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-expanded={panelMode !== null}
        aria-controls={panelMode !== null ? PANEL_ID : undefined}
        className={`relative flex size-11 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${buttonTone}`}
      >
        <Bell aria-hidden="true" className="size-5" />
        {count !== null && count > 0 ? (
          <span
            aria-hidden="true"
            className={`absolute right-0 top-0 min-w-4 rounded-full px-1 text-center text-[10px] font-bold leading-4 text-white ${tone === "learner" ? "bg-[var(--student-blue)]" : "bg-secondary"}`}
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {panelMode === "desktop" ? (
        <div
          id={PANEL_ID}
          ref={desktopPanelRef}
          role="dialog"
          aria-modal="false"
          aria-label="Bandeja de notificaciones"
          className={`${styles.desktopPanel} absolute right-0 top-[calc(100%+0.7rem)] z-50 hidden max-h-[min(640px,calc(100dvh-5.5rem))] w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-[20px] border shadow-[0_22px_65px_rgba(15,23,42,0.18)] lg:flex ${panelTone}`}
        >
          {panel(false)}
        </div>
      ) : null}

      <dialog
        id={panelMode === "mobile" ? PANEL_ID : undefined}
        ref={mobileDialogRef}
        aria-label="Bandeja de notificaciones"
        onClose={handleMobileDialogClose}
        onClick={(event: MouseEvent<HTMLDialogElement>) => {
          if (event.target === event.currentTarget) closePanel();
        }}
        className={`${styles.mobileDialog} fixed inset-x-0 bottom-0 top-auto m-0 max-h-[82dvh] w-full max-w-none overflow-hidden rounded-t-[24px] border p-0 shadow-2xl backdrop:bg-ink-900/60 backdrop:backdrop-blur-[2px] lg:hidden ${panelTone}`}
      >
        {panel(true)}
      </dialog>
    </div>
  );
}
