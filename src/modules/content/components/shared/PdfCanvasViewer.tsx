"use client";

import {
  ChevronLeft,
  ChevronRight,
  FileText,
  LoaderCircle,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
  RenderTask,
} from "pdfjs-dist";

const MIN_ZOOM = 0.75;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.25;
const MAX_DEVICE_PIXEL_RATIO = 2;

type ViewerStatus = "loading" | "ready" | "error";

function cancelRender(renderTaskRef: RefObject<RenderTask | null>) {
  const task = renderTaskRef.current;
  renderTaskRef.current = null;
  task?.cancel();
}

function releasePage(pageRef: RefObject<PDFPageProxy | null>) {
  pageRef.current?.cleanup();
  pageRef.current = null;
}

export function PdfCanvasViewer({
  resourceId,
  title,
  onClose,
}: {
  resourceId: string;
  title: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const renderedPageRef = useRef<PDFPageProxy | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const updateWidth = () => setContainerWidth(container.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let disposed = false;
    const canvas = canvasRef.current;

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (disposed) return;

        setStatus("loading");
        setErrorMessage("");
        setDocument(null);
        setPageNumber(1);
        setPageCount(0);
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

        setDocument(loadedDocument);
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
      cancelRender(renderTaskRef);
      releasePage(renderedPageRef);
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      const task = loadingTaskRef.current;
      loadingTaskRef.current = null;
      if (task) void task.destroy();
    };
  }, [resourceId, retryKey]);

  useEffect(() => {
    if (!document || status !== "ready" || containerWidth <= 0) return;

    let disposed = false;
    cancelRender(renderTaskRef);
    releasePage(renderedPageRef);

    void (async () => {
      try {
        await Promise.resolve();
        if (disposed) return;
        setIsRendering(true);
        setErrorMessage("");

        const page = await document.getPage(pageNumber);
        if (disposed) {
          page.cleanup();
          return;
        }

        renderedPageRef.current = page;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(containerWidth - 24, 1);
        const fitScale = availableWidth / baseViewport.width;
        const viewport = page.getViewport({ scale: fitScale * zoom });
        const outputScale = Math.min(
          window.devicePixelRatio || 1,
          MAX_DEVICE_PIXEL_RATIO,
        );
        const context = canvas.getContext("2d", { alpha: false });

        if (!context) {
          throw new Error("CANVAS_CONTEXT_UNAVAILABLE");
        }

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
          setIsRendering(false);
        }
      } catch (error) {
        if (disposed) return;
        if (error instanceof Error && error.name === "RenderingCancelledException") {
          return;
        }
        setIsRendering(false);
        setErrorMessage("No fue posible renderizar esta página.");
      }
    })();

    return () => {
      disposed = true;
      cancelRender(renderTaskRef);
      releasePage(renderedPageRef);
    };
  }, [containerWidth, document, pageNumber, status, zoom]);

  const changeZoom = (nextZoom: number) => {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom)));
  };

  return (
    <>
      <section
        aria-label={`Visor PDF: ${title}`}
        className="select-none overflow-hidden rounded-xl border border-border bg-surface-elevated/40 print:hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background p-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
              disabled={status !== "ready" || pageNumber <= 1}
              aria-label="Página anterior"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <span className="min-w-20 text-center text-xs font-medium text-foreground">
              {pageCount > 0 ? `${pageNumber} / ${pageCount}` : "— / —"}
            </span>
            <button
              type="button"
              onClick={() =>
                setPageNumber((current) => Math.min(pageCount, current + 1))
              }
              disabled={status !== "ready" || pageNumber >= pageCount}
              aria-label="Página siguiente"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => changeZoom(zoom - ZOOM_STEP)}
              disabled={status !== "ready" || zoom <= MIN_ZOOM}
              aria-label="Reducir zoom"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus aria-hidden="true" className="h-4 w-4" />
            </button>
            <span className="min-w-12 text-center text-xs font-medium text-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => changeZoom(zoom + ZOOM_STEP)}
              disabled={status !== "ready" || zoom >= MAX_ZOOM}
              aria-label="Aumentar zoom"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              disabled={status !== "ready" || zoom === 1}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-foreground hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Maximize2 aria-hidden="true" className="h-4 w-4" />
              Ajustar
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar visor PDF"
              className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-surface-elevated hover:text-foreground"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={canvasContainerRef}
          className="relative flex min-h-72 max-h-[75vh] w-full items-start justify-center overflow-auto p-3"
        >
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Página ${pageNumber} de ${pageCount || 1}`}
            onContextMenu={(event) => event.preventDefault()}
            className={`max-w-none bg-white shadow-sm transition-opacity ${
              status === "ready" && !isRendering ? "opacity-100" : "opacity-30"
            }`}
          />

          {status === "loading" || isRendering ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
              <LoaderCircle
                aria-hidden="true"
                className="mr-2 h-5 w-5 animate-spin motion-reduce:animate-none"
              />
              {status === "loading" ? "Cargando PDF…" : "Renderizando página…"}
            </div>
          ) : null}

          {status === "error" || errorMessage ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="max-w-md text-sm leading-6 text-muted">
                {errorMessage || "No fue posible mostrar el PDF."}
              </p>
              <button
                type="button"
                onClick={() => setRetryKey((current) => current + 1)}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-secondary hover:bg-surface-elevated"
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
      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-secondary hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
    >
      <FileText aria-hidden="true" className="h-4 w-4" />
      Ver PDF
    </button>
  );
}
