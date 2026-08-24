"use client";

import {
  ChevronLeft,
  ChevronRight,
  FileText,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { createPortal } from "react-dom";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from "pdfjs-dist";

import {
  clampPdfPage,
  getDominantWheelDelta,
  getWheelPageDirection,
} from "@/modules/content/domain/pdf-viewer-navigation";

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.25;
const MAX_DEVICE_PIXEL_RATIO = 2;
const WHEEL_NAVIGATION_COOLDOWN_MS = 320;
const WHEEL_ACCUMULATOR_RESET_MS = 180;
const DEFAULT_PAGE_ASPECT_RATIO = 1.414;

type ViewerStatus = "loading" | "ready" | "error";
type PageRenderStatus = "idle" | "rendering" | "ready" | "error";
type PageDisplayMode = "continuous" | "paginated";

type ElementSize = {
  width: number;
  height: number;
};

function cancelRender(renderTaskRef: RefObject<RenderTask | null>) {
  const task = renderTaskRef.current;
  renderTaskRef.current = null;
  task?.cancel();
}

function releasePage(pageRef: RefObject<PDFPageProxy | null>) {
  pageRef.current?.cleanup();
  pageRef.current = null;
}

function useElementSize(element: HTMLElement | null) {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    if (!element) return;

    const updateSize = () => {
      setSize({ width: element.clientWidth, height: element.clientHeight });
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return size;
}

function PdfPageCanvas({
  pdfDocument,
  pageNumber,
  zoom,
  containerSize,
  mode,
  scrollRoot,
  eager = false,
}: {
  pdfDocument: PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
  containerSize: ElementSize;
  mode: PageDisplayMode;
  scrollRoot?: HTMLElement | null;
  eager?: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const renderedPageRef = useRef<PDFPageProxy | null>(null);
  const [shouldRender, setShouldRender] = useState(eager || pageNumber <= 2);
  const [renderStatus, setRenderStatus] =
    useState<PageRenderStatus>("idle");
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_PAGE_ASPECT_RATIO);
  const [paginatedSize, setPaginatedSize] = useState<ElementSize>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (eager) return;

    const element = wrapperRef.current;
    if (!element || !scrollRoot) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShouldRender(entry.isIntersecting),
      { root: scrollRoot, rootMargin: "800px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [eager, scrollRoot]);

  useEffect(() => {
    if (shouldRender) return;

    cancelRender(renderTaskRef);
    releasePage(renderedPageRef);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender || containerSize.width <= 0) return;
    if (mode === "paginated" && containerSize.height <= 0) return;

    let disposed = false;
    cancelRender(renderTaskRef);
    releasePage(renderedPageRef);

    void (async () => {
      try {
        setRenderStatus("rendering");
        const page = await pdfDocument.getPage(pageNumber);
        if (disposed) {
          page.cleanup();
          return;
        }

        renderedPageRef.current = page;
        const baseViewport = page.getViewport({ scale: 1 });
        setAspectRatio(baseViewport.height / baseViewport.width);

        const availableWidth = Math.max(
          mode === "continuous"
            ? Math.max(containerSize.width - 24, 240)
            : containerSize.width - 32,
          1,
        );
        const fitScale =
          mode === "continuous"
            ? availableWidth / baseViewport.width
            : Math.min(
                availableWidth / baseViewport.width,
                Math.max(containerSize.height - 32, 1) / baseViewport.height,
              );
        const viewport = page.getViewport({ scale: fitScale * zoom });
        if (mode === "paginated") {
          setPaginatedSize({ width: viewport.width, height: viewport.height });
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("CANVAS_CONTEXT_UNAVAILABLE");

        const outputScale = Math.min(
          window.devicePixelRatio || 1,
          MAX_DEVICE_PIXEL_RATIO,
        );
        canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
        canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const task = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform:
            outputScale === 1
              ? undefined
              : [outputScale, 0, 0, outputScale, 0, 0],
        });
        renderTaskRef.current = task;
        await task.promise;

        if (!disposed) {
          renderTaskRef.current = null;
          setRenderStatus("ready");
        }
      } catch (error) {
        if (disposed) return;
        if (
          error instanceof Error &&
          error.name === "RenderingCancelledException"
        ) {
          return;
        }
        setRenderStatus("error");
      }
    })();

    return () => {
      disposed = true;
      cancelRender(renderTaskRef);
      releasePage(renderedPageRef);
    };
  }, [containerSize, mode, pageNumber, pdfDocument, shouldRender, zoom]);

  useEffect(
    () => () => {
      cancelRender(renderTaskRef);
      releasePage(renderedPageRef);
    },
    [],
  );

  const continuousWidth = Math.max(containerSize.width - 24, 240) * zoom;
  const displaySize =
    mode === "continuous"
      ? {
          width: continuousWidth,
          height: continuousWidth * aspectRatio,
        }
      : paginatedSize.width > 0
        ? paginatedSize
        : {
            width: Math.max(Math.min(containerSize.width - 32, 720), 240),
            height:
              Math.max(Math.min(containerSize.width - 32, 720), 240) *
              aspectRatio,
          };
  const visibleRenderStatus = shouldRender ? renderStatus : "idle";

  return (
    <div
      ref={wrapperRef}
      data-pdf-page={pageNumber}
      aria-label={`Página ${pageNumber}`}
      className="relative shrink-0 overflow-hidden bg-white shadow-[0_2px_12px_rgba(15,23,42,0.14)] ring-1 ring-black/5"
      style={{
        width: `${Math.max(1, Math.floor(displaySize.width))}px`,
        height: `${Math.max(1, Math.floor(displaySize.height))}px`,
      }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Contenido de la página ${pageNumber}`}
        onContextMenu={(event) => event.preventDefault()}
        className={`block max-w-none bg-white transition-opacity duration-150 motion-reduce:transition-none ${
          visibleRenderStatus === "ready" ? "opacity-100" : "opacity-0"
        }`}
      />

      {visibleRenderStatus === "idle" ||
      visibleRenderStatus === "rendering" ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-neutral-100 motion-reduce:animate-none"
        />
      ) : null}

      {visibleRenderStatus === "error" ? (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="max-w-xs text-sm text-neutral-600">
            No fue posible renderizar esta página.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function PdfToolbar({
  title,
  status,
  pageNumber,
  pageCount,
  zoom,
  immersive,
  onPrevious,
  onNext,
  onZoomOut,
  onZoomIn,
  onResetZoom,
  onToggleImmersive,
  onClose,
  expandButtonRef,
}: {
  title: string;
  status: ViewerStatus;
  pageNumber: number;
  pageCount: number;
  zoom: number;
  immersive: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onResetZoom: () => void;
  onToggleImmersive: () => void;
  onClose?: () => void;
  expandButtonRef?: RefObject<HTMLButtonElement | null>;
}) {
  const ready = status === "ready";
  const iconButtonClass =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-background px-2 py-2 sm:px-3">
      <div className="order-1 flex min-w-0 basis-[calc(100%-5rem)] items-center gap-2 sm:mr-auto sm:basis-auto">
        <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
        <span className="truncate text-xs font-medium text-foreground">
          {title}
        </span>
      </div>

      <div className="order-3 flex items-center sm:order-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!ready || pageNumber <= 1}
          aria-label="Página anterior"
          className={iconButtonClass}
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <span
          aria-live="polite"
          className="min-w-16 text-center text-xs font-medium tabular-nums text-foreground"
        >
          {pageCount > 0 ? `${pageNumber} / ${pageCount}` : "— / —"}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={!ready || pageNumber >= pageCount}
          aria-label="Página siguiente"
          className={iconButtonClass}
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="order-4 ml-auto flex items-center sm:order-3 sm:ml-0">
        <button
          type="button"
          onClick={onZoomOut}
          disabled={!ready || zoom <= MIN_ZOOM}
          aria-label="Reducir zoom"
          className={iconButtonClass}
        >
          <Minus aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onResetZoom}
          disabled={!ready || zoom === 1}
          aria-label="Ajustar PDF al espacio disponible"
          className="inline-flex h-9 min-w-12 items-center justify-center rounded-md px-1.5 text-xs font-medium tabular-nums text-foreground transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-35"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          disabled={!ready || zoom >= MAX_ZOOM}
          aria-label="Aumentar zoom"
          className={iconButtonClass}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          ref={expandButtonRef}
          type="button"
          onClick={onToggleImmersive}
          disabled={!ready}
          aria-label={
            immersive ? "Salir de pantalla grande" : "Abrir en pantalla grande"
          }
          className={iconButtonClass}
        >
          {immersive ? (
            <Minimize2 aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Maximize2 aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar visor PDF"
            className={`${iconButtonClass} text-muted hover:text-foreground`}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function PdfCanvasViewer({
  resourceId,
  title,
  onClose,
}: {
  resourceId: string;
  title: string;
  onClose?: () => void;
}) {
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const immersiveDialogRef = useRef<HTMLElement>(null);
  const wheelAccumulatorRef = useRef(0);
  const wheelResetTimerRef = useRef<number | null>(null);
  const lastWheelNavigationRef = useRef(0);
  const pageNumberRef = useRef(1);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [retryKey, setRetryKey] = useState(0);
  const [inlineScroller, setInlineScroller] = useState<HTMLDivElement | null>(
    null,
  );
  const [immersivePageArea, setImmersivePageArea] =
    useState<HTMLDivElement | null>(null);
  const [immersive, setImmersive] = useState(false);
  const inlineSize = useElementSize(inlineScroller);
  const immersiveSize = useElementSize(immersivePageArea);
  const navigationHelpId = useId();

  useEffect(() => {
    let disposed = false;

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (disposed) return;

        setStatus("loading");
        setErrorMessage("");
        setPdfDocument(null);
        setPageNumber(1);
        setPageCount(0);
        setZoom(1);
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const task = pdfjs.getDocument({
          url: `/api/resources/${encodeURIComponent(resourceId)}/file`,
        });
        loadingTaskRef.current = task;
        const loadedDocument = await task.promise;

        if (disposed) {
          await task.destroy();
          return;
        }

        setPdfDocument(loadedDocument);
        setPageCount(loadedDocument.numPages);
        setStatus("ready");
      } catch (error) {
        if (disposed) return;
        setStatus("error");
        setErrorMessage(
          error instanceof Error && error.name === "PasswordException"
            ? "Este PDF está protegido con contraseña y no se puede mostrar."
            : "No fue posible cargar el PDF. Verifica tu acceso o inténtalo de nuevo.",
        );
      }
    })();

    return () => {
      disposed = true;
      const task = loadingTaskRef.current;
      loadingTaskRef.current = null;
      if (task) void task.destroy();
    };
  }, [resourceId, retryKey]);

  const scrollInlineToPage = useCallback(
    (nextPage: number) => {
      if (!inlineScroller) return;
      const target = inlineScroller.querySelector<HTMLElement>(
        `[data-pdf-page="${nextPage}"]`,
      );
      if (!target) return;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      inlineScroller.scrollTo({
        top: Math.max(0, target.offsetTop - 12),
        behavior: reducedMotion ? "auto" : "smooth",
      });
    },
    [inlineScroller],
  );

  const navigateInline = useCallback(
    (nextPage: number) => {
      const clampedPage = clampPdfPage(nextPage, pageCount);
      setPageNumber(clampedPage);
      scrollInlineToPage(clampedPage);
    },
    [pageCount, scrollInlineToPage],
  );

  const navigateImmersive = useCallback(
    (change: number) => {
      setPageNumber((current) =>
        clampPdfPage(current + change, pageCount),
      );
    },
    [pageCount],
  );

  const scrollInlineToPageRef = useRef(scrollInlineToPage);
  useEffect(() => {
    pageNumberRef.current = pageNumber;
    scrollInlineToPageRef.current = scrollInlineToPage;
  }, [pageNumber, scrollInlineToPage]);

  useEffect(() => {
    if (!inlineScroller || status !== "ready") return;
    let animationFrame = 0;

    const updateVisiblePage = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const viewport = inlineScroller.getBoundingClientRect();
        let visiblePage = 1;
        let largestVisibleArea = 0;

        for (const element of inlineScroller.querySelectorAll<HTMLElement>(
          "[data-pdf-page]",
        )) {
          const bounds = element.getBoundingClientRect();
          const visibleHeight = Math.max(
            0,
            Math.min(bounds.bottom, viewport.bottom) -
              Math.max(bounds.top, viewport.top),
          );
          if (visibleHeight > largestVisibleArea) {
            largestVisibleArea = visibleHeight;
            visiblePage = Number(element.dataset.pdfPage) || 1;
          }
        }

        if (largestVisibleArea > 0) setPageNumber(visiblePage);
      });
    };

    updateVisiblePage();
    inlineScroller.addEventListener("scroll", updateVisiblePage, {
      passive: true,
    });
    return () => {
      cancelAnimationFrame(animationFrame);
      inlineScroller.removeEventListener("scroll", updateVisiblePage);
    };
  }, [inlineScroller, status]);

  useEffect(() => {
    if (!immersive) return;

    const previousActiveElement = globalThis.document.activeElement;
    const previousBodyOverflow = globalThis.document.body.style.overflow;
    globalThis.document.body.style.overflow = "hidden";

    const focusDialog = window.requestAnimationFrame(() => {
      immersiveDialogRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setImmersive(false);
        window.requestAnimationFrame(() =>
          scrollInlineToPageRef.current(pageNumberRef.current),
        );
        return;
      }
      if (!event.altKey && !event.ctrlKey && !event.metaKey) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          navigateImmersive(-1);
          return;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          navigateImmersive(1);
          return;
        }
      }
      if (event.key !== "Tab") return;

      const dialog = immersiveDialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = globalThis.document.activeElement;
      if (!activeElement || !dialog.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (
        event.shiftKey &&
        (activeElement === first || activeElement === dialog)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    globalThis.document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusDialog);
      globalThis.document.body.style.overflow = previousBodyOverflow;
      globalThis.document.removeEventListener("keydown", handleKeyDown);
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, [immersive, navigateImmersive]);

  useEffect(() => {
    if (!immersive || !immersivePageArea) return;
    immersivePageArea.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [immersive, immersivePageArea, pageNumber]);

  useEffect(
    () => () => {
      if (wheelResetTimerRef.current !== null) {
        window.clearTimeout(wheelResetTimerRef.current);
      }
    },
    [],
  );

  const changeZoom = (nextZoom: number) => {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom)));
  };

  const exitImmersive = () => {
    setImmersive(false);
    window.requestAnimationFrame(() => scrollInlineToPage(pageNumber));
  };

  const closeViewer = () => {
    setImmersive(false);
    onClose?.();
  };

  const handleImmersiveWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (event.ctrlKey) return;

    const dominantDelta = getDominantWheelDelta(event.deltaX, event.deltaY);
    const target = event.currentTarget;
    const verticalGesture = Math.abs(event.deltaY) >= Math.abs(event.deltaX);
    if (zoom > 1 && verticalGesture) {
      const atTop = target.scrollTop <= 1;
      const atBottom =
        target.scrollTop + target.clientHeight >= target.scrollHeight - 1;
      const canPanPage =
        (dominantDelta < 0 && !atTop) || (dominantDelta > 0 && !atBottom);
      if (canPanPage) return;
    }
    if (
      zoom > 1 &&
      !verticalGesture &&
      target.scrollWidth > target.clientWidth
    ) {
      return;
    }

    event.preventDefault();

    const now = performance.now();
    if (
      now - lastWheelNavigationRef.current <
      WHEEL_NAVIGATION_COOLDOWN_MS
    ) {
      return;
    }

    wheelAccumulatorRef.current += dominantDelta;
    const direction = getWheelPageDirection(wheelAccumulatorRef.current);

    if (wheelResetTimerRef.current !== null) {
      window.clearTimeout(wheelResetTimerRef.current);
    }
    wheelResetTimerRef.current = window.setTimeout(() => {
      wheelAccumulatorRef.current = 0;
    }, WHEEL_ACCUMULATOR_RESET_MS);

    if (direction === 0) return;
    wheelAccumulatorRef.current = 0;
    lastWheelNavigationRef.current = now;
    navigateImmersive(direction);
  };

  const inlineToolbar = (
    <PdfToolbar
      title={title}
      status={status}
      pageNumber={pageNumber}
      pageCount={pageCount}
      zoom={zoom}
      immersive={false}
      onPrevious={() => navigateInline(pageNumber - 1)}
      onNext={() => navigateInline(pageNumber + 1)}
      onZoomOut={() => changeZoom(zoom - ZOOM_STEP)}
      onZoomIn={() => changeZoom(zoom + ZOOM_STEP)}
      onResetZoom={() => setZoom(1)}
      onToggleImmersive={() => setImmersive(true)}
      onClose={onClose ? closeViewer : undefined}
      expandButtonRef={expandButtonRef}
    />
  );

  const immersiveViewer =
    immersive && pdfDocument && typeof globalThis.document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[100] bg-neutral-950/80 p-0 print:hidden sm:p-3">
            <section
              ref={immersiveDialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={`Visor PDF en pantalla grande: ${title}`}
              aria-describedby={navigationHelpId}
              tabIndex={-1}
              className="mx-auto flex h-full max-w-[110rem] flex-col overflow-hidden bg-background outline-none sm:rounded-xl sm:border sm:border-white/10 sm:shadow-2xl"
            >
              <PdfToolbar
                title={title}
                status={status}
                pageNumber={pageNumber}
                pageCount={pageCount}
                zoom={zoom}
                immersive
                onPrevious={() => navigateImmersive(-1)}
                onNext={() => navigateImmersive(1)}
                onZoomOut={() => changeZoom(zoom - ZOOM_STEP)}
                onZoomIn={() => changeZoom(zoom + ZOOM_STEP)}
                onResetZoom={() => setZoom(1)}
                onToggleImmersive={exitImmersive}
                onClose={onClose ? closeViewer : undefined}
              />
              <div
                ref={setImmersivePageArea}
                onWheel={handleImmersiveWheel}
                className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-neutral-200/80 p-4 dark:bg-neutral-950"
              >
                <PdfPageCanvas
                  key={`immersive-${pageNumber}`}
                  pdfDocument={pdfDocument}
                  pageNumber={pageNumber}
                  zoom={zoom}
                  containerSize={immersiveSize}
                  mode="paginated"
                  eager
                />
              </div>
              <p id={navigationHelpId} className="sr-only">
                Página {pageNumber} de {pageCount}. Usa las flechas izquierda y
                derecha o la rueda para cambiar de página.
              </p>
            </section>
          </div>,
          globalThis.document.body,
        )
      : null;

  return (
    <>
      <section
        aria-label={`Visor PDF: ${title}`}
        className="overflow-hidden rounded-xl border border-border bg-surface-elevated/40 print:hidden"
      >
        {inlineToolbar}

        <div
          ref={setInlineScroller}
          className="relative min-h-72 max-h-[75vh] w-full overflow-auto bg-neutral-200/70 p-3 dark:bg-neutral-950/70"
        >
          {status === "ready" && pdfDocument ? (
            <div className="mx-auto flex w-max min-w-full flex-col items-center gap-4 py-1">
              {Array.from({ length: pageCount }, (_, index) => (
                <PdfPageCanvas
                  key={index + 1}
                  pdfDocument={pdfDocument}
                  pageNumber={index + 1}
                  zoom={zoom}
                  containerSize={inlineSize}
                  mode="continuous"
                  scrollRoot={inlineScroller}
                />
              ))}
            </div>
          ) : null}

          {status === "loading" ? (
            <div
              role="status"
              className="absolute inset-0 flex items-center justify-center bg-inherit text-sm text-muted"
            >
              <LoaderCircle
                aria-hidden="true"
                className="mr-2 h-5 w-5 animate-spin motion-reduce:animate-none"
              />
              Cargando PDF…
            </div>
          ) : null}

          {status === "error" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-inherit p-6 text-center">
              <p role="alert" className="max-w-md text-sm leading-6 text-muted">
                {errorMessage || "No fue posible mostrar el PDF."}
              </p>
              <button
                type="button"
                onClick={() => setRetryKey((current) => current + 1)}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Reintentar
              </button>
            </div>
          ) : null}
        </div>
      </section>
      <p className="hidden text-sm print:block">
        La impresión de este recurso está deshabilitada en EduNivel.
      </p>
      {immersiveViewer}
    </>
  );
}

export function PdfViewerLauncher({
  resourceId,
  title,
}: {
  resourceId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <PdfCanvasViewer
        resourceId={resourceId}
        title={title}
        onClose={() => setOpen(false)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
    >
      <FileText aria-hidden="true" className="h-4 w-4" />
      Ver PDF
    </button>
  );
}
