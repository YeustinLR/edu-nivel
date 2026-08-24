"use client";

import {
  CircleCheck,
  Clock3,
  ExternalLink,
  FileText,
  ImageIcon,
  Paperclip,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";

import { ResourceType } from "@/generated/prisma/enums";
import type { ContentCreationDisposition } from "@/modules/content/domain/content-creation";
import { createAdminStructuredResourceAction } from "@/modules/content/actions/admin-resource-creation-actions";
import {
  CreationFieldError,
  CreationFormActions,
  creationFieldClass,
} from "@/modules/content/components/admin/creation/ContentCreationForm";
import {
  createUploadFingerprint,
  formatUploadSize,
  getLocalLinkPreview,
  isResourceAttachmentReady,
  normalizeYoutubeUrl,
  type ResourceAttachmentKind,
  validateUploadFile,
} from "@/modules/content/domain/resource-attachment";
import { initialResourceCreationActionState } from "@/modules/content/types/resource-creation-action-state";
import { ResourceDocumentField } from "@/modules/content/components/editor/ResourceDocumentField";
import {
  adminResourceAttachments,
  collaboratorResourceAttachments,
  ResourceAttachmentChoices,
} from "@/modules/content/components/creation/ResourceAttachmentChoices";

export type ResourceModuleOption = {
  id: string;
  title: string;
  subjectName: string;
};

type UploadStage =
  | "idle"
  | "preparing"
  | "uploading"
  | "confirming"
  | "done"
  | "error";

type UploadAttempt = {
  fingerprint: string;
  uploadId: string;
  uploadUrl: string;
  expiresAt: number;
  uploaded: boolean;
};

export function ResourceAttachmentForm({
  mode,
  fixedModuleId,
  modules = [],
  requestId = "",
  closeHref,
  successBaseHref,
  expectedSubjectId,
  onCancel,
  onSuccess,
}: {
  mode: "admin" | "collaborator";
  fixedModuleId?: string;
  modules?: ResourceModuleOption[];
  requestId?: string;
  closeHref?: string;
  successBaseHref?: string;
  expectedSubjectId?: string;
  onCancel?: () => void;
  onSuccess?: (resourceId: string, message: string) => void;
}) {
  const [state, structuredAction, isStructuredPending] = useActionState(
    createAdminStructuredResourceAction,
    initialResourceCreationActionState,
  );
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [attachment, setAttachment] =
    useState<ResourceAttachmentKind | null>(null);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [content, setContent] = useState("");
  const [contentValidationError, setContentValidationError] = useState<string | null>(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadAttempt, setUploadAttempt] = useState<UploadAttempt | null>(null);

  const moduleErrorId = useId();
  const titleErrorId = useId();
  const instructionsErrorId = useId();
  const attachmentErrorId = useId();
  const videoErrorId = useId();
  const urlErrorId = useId();
  const contentErrorId = useId();
  const estimatedMinutesErrorId = useId();
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const moduleId = fixedModuleId ?? selectedModuleId;
  const attachments =
    mode === "admin" ? adminResourceAttachments : collaboratorResourceAttachments;
  const youtubeVideoId = useMemo(
    () => normalizeYoutubeUrl(youtubeUrl),
    [youtubeUrl],
  );
  const linkPreview = useMemo(() => getLocalLinkPreview(linkUrl), [linkUrl]);
  const fileValidation = useMemo(
    () => (file ? validateUploadFile(file) : null),
    [file],
  );
  const uploadBusy = ["preparing", "uploading", "confirming"].includes(
    uploadStage,
  );
  const isPending = isStructuredPending || uploadBusy;

  useEffect(() => {
    if (state.status !== "success") return;
    if (onSuccess) {
      onSuccess(state.resourceId, state.message);
    } else if (successBaseHref) {
      router.replace(
        `${successBaseHref}/${encodeURIComponent(state.resourceId)}`,
        { scroll: false },
      );
    }
  }, [onSuccess, router, state, successBaseHref]);

  function invalidateUploadAttempt() {
    setUploadAttempt(null);
    if (uploadStage === "error" || uploadStage === "done") {
      setUploadStage("idle");
      setUploadMessage(null);
    }
  }

  function clearSelectedFile() {
    setFile(null);
    setUploadAttempt(null);
    setUploadStage("idle");
    setUploadMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetAttachmentFields() {
    setYoutubeUrl("");
    setLinkUrl("");
    clearSelectedFile();
  }

  function selectAttachment(nextAttachment: ResourceAttachmentKind) {
    if (attachment === nextAttachment || isPending) return;

    resetAttachmentFields();
    setAttachment(nextAttachment);
  }

  function removeAttachment() {
    if (isPending) return;
    resetAttachmentFields();
    setAttachment(null);
  }

  function selectFile(nextFile: File | undefined) {
    setIsDragging(false);
    if (!nextFile) return;

    const validation = validateUploadFile(nextFile);
    if (!validation.success) {
      clearSelectedFile();
      setUploadStage("error");
      setUploadMessage(validation.message);
      return;
    }

    setFile(nextFile);
    setUploadAttempt(null);
    setUploadStage("idle");
    setUploadMessage(null);
  }

  const canSubmit =
    isResourceAttachmentReady({
      attachment,
      moduleId,
      title,
      instructions,
      content,
      estimatedMinutes,
      youtubeUrl,
      linkUrl,
      file,
    }) && !contentValidationError && !isPending;

  async function submitUpload(disposition: ContentCreationDisposition) {
    if (!file || !fileValidation?.success) return;

    const fingerprint = createUploadFingerprint({
      moduleId,
      title,
      instructions,
      content,
      estimatedMinutes,
      file,
    }) + `:${disposition}`;
    let attempt =
      uploadAttempt?.fingerprint === fingerprint &&
      uploadAttempt.expiresAt > Date.now()
        ? uploadAttempt
        : null;

    try {
      setUploadMessage(null);

      if (!attempt) {
        setUploadStage("preparing");
        const intentResponse = await fetch("/api/uploads/intents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moduleId,
            expectedSubjectId,
            resourceType: fileValidation.data.resourceType,
            title: title.trim(),
            instructions: instructions.trim() || undefined,
            content: content.trim(),
            estimatedMinutes: estimatedMinutes
              ? Number(estimatedMinutes)
              : undefined,
            originalName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            disposition,
          }),
        });
        const intent = (await intentResponse.json()) as {
          uploadId?: string;
          uploadUrl?: string;
          expiresAt?: string;
          message?: string;
        };

        if (!intentResponse.ok || !intent.uploadId || !intent.uploadUrl) {
          throw new Error(intent.message ?? "No se pudo preparar la carga.");
        }

        attempt = {
          fingerprint,
          uploadId: intent.uploadId,
          uploadUrl: intent.uploadUrl,
          expiresAt: intent.expiresAt
            ? new Date(intent.expiresAt).getTime()
            : Date.now() + 10 * 60 * 1_000,
          uploaded: false,
        };
        setUploadAttempt(attempt);
      }

      if (!attempt.uploaded) {
        setUploadStage("uploading");
        const uploadResponse = await fetch(attempt.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadResponse.ok) {
          throw new Error("No se pudo subir el archivo a R2.");
        }

        attempt = { ...attempt, uploaded: true };
        setUploadAttempt(attempt);
      }

      setUploadStage("confirming");
      const confirmationResponse = await fetch(
        `/api/uploads/${encodeURIComponent(attempt.uploadId)}/confirm`,
        { method: "POST" },
      );
      const confirmation = (await confirmationResponse.json()) as {
        state?: string;
        message?: string;
        resource?: { id?: string } | null;
      };

      if (!confirmationResponse.ok) {
        throw new Error(
          confirmation.message ?? "No se pudo confirmar la carga.",
        );
      }
      if (confirmation.state === "PROCESSING") {
        throw new Error(
          confirmation.message ??
            "La carga sigue procesándose. Intenta confirmar nuevamente.",
        );
      }
      if (!confirmation.resource?.id) {
        throw new Error("La confirmación no devolvió el recurso creado.");
      }

      setUploadStage("done");
      setUploadMessage(
        disposition === "PUBLISH"
          ? "Archivo publicado."
          : disposition === "SUBMIT_FOR_REVIEW"
            ? "Archivo enviado a revisión."
            : "Archivo guardado como borrador.",
      );
      const message =
        disposition === "PUBLISH"
          ? "Recurso publicado."
          : disposition === "SUBMIT_FOR_REVIEW"
            ? "Recurso enviado a revisión."
            : "Recurso guardado como borrador.";
      if (onSuccess) {
        onSuccess(confirmation.resource.id, message);
      } else if (successBaseHref) {
        router.replace(
          `${successBaseHref}/${encodeURIComponent(confirmation.resource.id)}`,
        );
      }
    } catch (error) {
      setUploadStage("error");
      setUploadMessage(
        error instanceof Error
          ? error.message
          : "No se pudo completar la carga.",
      );
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!canSubmit) {
      event.preventDefault();
      return;
    }

    if (attachment === "UPLOAD") {
      event.preventDefault();
      const submitter = (event.nativeEvent as SubmitEvent)
        .submitter as HTMLButtonElement | null;
      const disposition = submitter?.value as ContentCreationDisposition;
      if (!disposition) return;
      void submitUpload(disposition);
    }
  }

  const structuredResourceType =
    attachment === null
      ? ResourceType.NOTE
      : attachment === "YOUTUBE"
      ? ResourceType.YOUTUBE
      : attachment === "LINK"
        ? ResourceType.LINK
        : "";
  const pendingLabel =
    uploadStage === "preparing"
      ? "Preparando…"
      : uploadStage === "uploading"
        ? "Subiendo…"
        : uploadStage === "confirming"
          ? "Confirmando…"
          : "Guardando…";

  if (state.status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-success/30 bg-success/10 p-5"
      >
        <p className="flex items-center gap-2 font-medium text-success">
          <CircleCheck aria-hidden="true" className="h-5 w-5" />
          {state.message}
        </p>
        <p className="mt-1 text-sm text-foreground-secondary">
          Abriendo el recurso creado…
        </p>
      </div>
    );
  }

  return (
    <form action={structuredAction} onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="moduleId" value={moduleId} />
      {expectedSubjectId ? (
        <input
          type="hidden"
          name="expectedSubjectId"
          value={expectedSubjectId}
        />
      ) : null}
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="resourceType" value={structuredResourceType} />
      {attachment === "LINK" ? (
        <input type="hidden" name="openInNewTab" value="on" />
      ) : null}

      {state.status === "error" ? (
        <p
          role="alert"
          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300"
        >
          {state.message}
        </p>
      ) : null}
      {uploadMessage ? (
        <p
          role={uploadStage === "error" ? "alert" : "status"}
          className={`rounded-lg border px-3 py-2.5 text-sm ${
            uploadStage === "error"
              ? "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300"
              : "border-success/30 bg-success/10 text-success"
          }`}
        >
          {uploadMessage}
        </p>
      ) : null}

      {!fixedModuleId ? (
        <label className="block max-w-md space-y-1.5 text-sm font-medium text-foreground">
          Módulo
          <select
            name="moduleSelection"
            required
            value={selectedModuleId}
            disabled={isPending}
            onChange={(event) => {
              setSelectedModuleId(event.target.value);
              invalidateUploadAttempt();
            }}
            aria-describedby={moduleErrorId}
            className={creationFieldClass}
          >
            <option value="">Selecciona un módulo</option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.subjectName} — {module.title}
              </option>
            ))}
          </select>
          <CreationFieldError id={moduleErrorId} messages={errors?.moduleId} />
        </label>
      ) : (
        <CreationFieldError id={moduleErrorId} messages={errors?.moduleId} />
      )}

      <section aria-labelledby="resource-basic-heading" className="space-y-4">
        <div>
          <h2 id="resource-basic-heading" className="font-semibold text-foreground">
            Información básica
          </h2>
          <p className="mt-1 text-sm text-muted">
            Identifica el recurso antes de elegir qué deseas adjuntar.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Título
            <input
              name="title"
              type="text"
              minLength={2}
              maxLength={160}
              required
              autoFocus
              value={title}
              disabled={isPending}
              onChange={(event) => {
                setTitle(event.target.value);
                invalidateUploadAttempt();
              }}
              aria-invalid={Boolean(errors?.title)}
              aria-describedby={titleErrorId}
              className={creationFieldClass}
            />
            <CreationFieldError id={titleErrorId} messages={errors?.title} />
          </label>

          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Indicaciones para el estudiante{" "}
            <span className="font-normal text-muted">(opcional)</span>
            <input
              name="instructions"
              type="text"
              maxLength={1_000}
              value={instructions}
              disabled={isPending}
              onChange={(event) => {
                setInstructions(event.target.value);
                invalidateUploadAttempt();
              }}
              placeholder="Escribe una instrucción breve para que el estudiante sepa qué hacer."
              aria-invalid={Boolean(errors?.instructions)}
              aria-describedby={instructionsErrorId}
              className={creationFieldClass}
            />
            <span className="block text-xs font-normal leading-5 text-muted">
              Explica brevemente qué debe hacer o en qué debe prestar atención.
            </span>
            <CreationFieldError
              id={instructionsErrorId}
              messages={errors?.instructions}
            />
          </label>
        </div>

        <div className="space-y-1.5 text-sm font-medium text-foreground">
          <div>Contenido <span className="font-normal text-muted">(opcional)</span></div>
          <textarea name="content" value={content} readOnly hidden />
          <ResourceDocumentField
            initialValue={content}
            disabled={isPending}
            invalid={Boolean(errors?.content) || Boolean(contentValidationError)}
            describedBy={contentErrorId}
            onChange={(serialized, error) => {
              setContent(serialized);
              setContentValidationError(error);
              invalidateUploadAttempt();
            }}
          />
          <CreationFieldError
            id={contentErrorId}
            messages={errors?.content ?? (contentValidationError ? [contentValidationError] : undefined)}
          />
        </div>

        <label className="block text-sm font-medium text-foreground">
          <span className="flex items-center gap-1.5">
            <Clock3 aria-hidden="true" className="h-4 w-4 text-secondary" />
            Tiempo estimado
            <span className="font-normal text-muted">(opcional)</span>
          </span>
          <span className="mt-1.5 flex w-fit items-center rounded-lg border border-border bg-background focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20">
            <input
              name="estimatedMinutes"
              type="number"
              min={1}
              max={10_000}
              step={1}
              value={estimatedMinutes}
              disabled={isPending}
              onChange={(event) => {
                setEstimatedMinutes(event.target.value);
                invalidateUploadAttempt();
              }}
              aria-label="Duración estimada"
              aria-invalid={Boolean(errors?.estimatedMinutes)}
              aria-describedby={estimatedMinutesErrorId}
              placeholder="45"
              className="h-10 w-20 bg-transparent px-3 text-center text-sm text-foreground outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60"
            />
            <span className="border-l border-border px-3 text-sm text-muted">min</span>
          </span>
          <span className="mt-1 block text-xs font-normal text-muted">
            Indica los minutos aproximados, por ejemplo 45.
          </span>
          <CreationFieldError
            id={estimatedMinutesErrorId}
            messages={errors?.estimatedMinutes}
          />
        </label>
      </section>

      <fieldset disabled={isPending} aria-describedby={attachmentErrorId}>
        <legend className="sr-only">Adjuntar contenido opcional</legend>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Paperclip aria-hidden="true" className="h-4 w-4 text-secondary" />
            <span>
              Adjuntar <span className="font-normal text-muted">(opcional)</span>
            </span>
          </div>
          {attachment ? (
            <button
              type="button"
              onClick={removeAttachment}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted transition-colors hover:bg-red-500/10 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
              Quitar adjunto
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted">
          Añade, si lo necesitas, un video, archivo, imagen o vínculo al contenido escrito.
        </p>
        <ResourceAttachmentChoices
          attachments={attachments}
          selected={attachment}
          disabled={isPending}
          compact={mode !== "admin"}
          onSelect={selectAttachment}
        />
        <CreationFieldError
          id={attachmentErrorId}
          messages={errors?.resourceType}
        />
      </fieldset>

      {attachment === "YOUTUBE" ? (
        <label className="block space-y-1.5 text-sm font-medium text-foreground">
          URL de YouTube
          <input
            name="videoId"
            type="url"
            required
            value={youtubeUrl}
            disabled={isPending}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            aria-invalid={Boolean(youtubeUrl && !youtubeVideoId) || Boolean(errors?.videoId)}
            aria-describedby={videoErrorId}
            className={creationFieldClass}
          />
          <CreationFieldError
            id={videoErrorId}
            messages={
              errors?.videoId ??
              (youtubeUrl && !youtubeVideoId
                ? ["Ingresa una URL válida de YouTube."]
                : undefined)
            }
          />
        </label>
      ) : null}

      {attachment === "LINK" ? (
        <div className="space-y-3">
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            URL
            <input
              name="url"
              type="url"
              maxLength={2_048}
              required
              value={linkUrl}
              disabled={isPending}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://ejemplo.com/recurso"
              aria-invalid={Boolean(linkUrl && !linkPreview) || Boolean(errors?.url)}
              aria-describedby={urlErrorId}
              className={creationFieldClass}
            />
            <CreationFieldError
              id={urlErrorId}
              messages={
                errors?.url ??
                (linkUrl && !linkPreview
                  ? ["Ingresa una URL HTTP o HTTPS válida."]
                  : undefined)
              }
            />
          </label>
          {linkPreview ? (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <ExternalLink aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-foreground">{linkPreview.hostname}</p>
                <p className="mt-1 truncate text-xs text-muted">{linkPreview.url}</p>
                <p className="mt-1 text-xs text-muted">Vínculo externo</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {attachment === "UPLOAD" ? (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={isPending}
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          {!file ? (
            <div
              onDragEnter={(event: DragEvent<HTMLDivElement>) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event: DragEvent<HTMLDivElement>) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event: DragEvent<HTMLDivElement>) => {
                event.preventDefault();
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setIsDragging(false);
                }
              }}
              onDrop={(event: DragEvent<HTMLDivElement>) => {
                event.preventDefault();
                selectFile(event.dataTransfer.files[0]);
              }}
              className={`rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-colors ${
                isDragging
                  ? "border-secondary bg-secondary/10"
                  : "border-border bg-background"
              }`}
            >
              <UploadCloud
                aria-hidden="true"
                className="mx-auto h-9 w-9 text-secondary"
              />
              <p className="mt-3 font-medium text-foreground">
                Arrastra un archivo aquí
              </p>
              <p className="mt-1 text-sm text-muted">o</p>
              <button
                type="button"
                disabled={isPending}
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              >
                Seleccionar archivo
              </button>
              <p className="mt-3 text-xs leading-5 text-muted">
                PDF hasta 50 MB · JPEG, PNG o WebP hasta 10 MB
              </p>
            </div>
          ) : fileValidation?.success ? (
            <div className="flex items-start gap-3 rounded-xl border border-secondary/30 bg-secondary/5 p-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                {fileValidation.data.resourceType === "PDF" ? (
                  <FileText aria-hidden="true" className="h-5 w-5" />
                ) : (
                  <ImageIcon aria-hidden="true" className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{file.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {fileValidation.data.category} · {file.type} · {formatUploadSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={clearSelectedFile}
                aria-label={`Eliminar ${file.name}`}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-red-500/10 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <CreationFormActions
        closeHref={closeHref}
        onCancel={onCancel}
        isPending={isPending}
        submitDisabled={!canSubmit}
        submitLabel={
          uploadStage === "error"
            ? "Reintentar"
            : mode === "admin"
              ? "Publicar recurso"
              : "Enviar a revisión"
        }
        pendingLabel={pendingLabel}
        submitName="disposition"
        submitValue={mode === "admin" ? "PUBLISH" : "SUBMIT_FOR_REVIEW"}
        secondarySubmit={{ label: "Guardar borrador", value: "DRAFT" }}
      />
    </form>
  );
}
