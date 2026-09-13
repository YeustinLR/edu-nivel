"use client";

import {
  Clock3,
  CircleHelp,
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
  useCallback,
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
import { QuizQuestionEditor } from "@/modules/content/components/editor/QuizQuestionEditor";
import {
  quizQuestionsSchema,
  type QuizQuestion,
} from "@/modules/content/domain/quiz";
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
  successHref,
  successBaseHref,
  draftBaseHref,
  draftPathSuffix = "",
  openDraftEditor = false,
  expectedSubjectId,
  onCancel,
  onSuccess,
}: {
  mode: "admin" | "collaborator";
  fixedModuleId?: string;
  modules?: ResourceModuleOption[];
  requestId?: string;
  closeHref?: string;
  successHref?: string;
  successBaseHref?: string;
  draftBaseHref?: string;
  draftPathSuffix?: string;
  openDraftEditor?: boolean;
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
  const [resourceMode, setResourceMode] = useState<"CONTENT" | "QUIZ">("CONTENT");
  const [attachment, setAttachment] =
    useState<ResourceAttachmentKind | null>(null);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [content, setContent] = useState("");
  const [contentValidationError, setContentValidationError] = useState<string | null>(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [passingScore, setPassingScore] = useState("70");
  const [maxAttempts, setMaxAttempts] = useState("");
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadAttempt, setUploadAttempt] = useState<UploadAttempt | null>(null);
  const [activeDisposition, setActiveDisposition] =
    useState<ContentCreationDisposition | null>(null);
  const errorSummaryRef = useRef<HTMLParagraphElement>(null);

  const moduleErrorId = useId();
  const titleErrorId = useId();
  const instructionsErrorId = useId();
  const attachmentErrorId = useId();
  const videoErrorId = useId();
  const urlErrorId = useId();
  const contentErrorId = useId();
  const estimatedMinutesErrorId = useId();
  const passingScoreErrorId = useId();
  const maxAttemptsErrorId = useId();
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
  const quizQuestionsValidation = useMemo(
    () => quizQuestionsSchema.safeParse(quizQuestions),
    [quizQuestions],
  );
  const uploadBusy = ["preparing", "uploading", "confirming"].includes(
    uploadStage,
  );
  const isPending = isStructuredPending || uploadBusy || state.status === "success";

  const navigateAfterSuccess = useCallback((
    resourceId: string,
    disposition: ContentCreationDisposition,
  ) => {
    const notice =
      disposition === "PUBLISH"
        ? "resource-published"
        : disposition === "SUBMIT_FOR_REVIEW"
          ? "resource-submitted"
          : "resource-draft";

    if (disposition === "DRAFT" && draftBaseHref) {
      const destination = new URL(
        `${draftBaseHref}/${encodeURIComponent(resourceId)}${draftPathSuffix}`,
        window.location.origin,
      );
      destination.searchParams.set("notice", notice);
      if (openDraftEditor) destination.searchParams.set("edit", "1");
      if (openDraftEditor) destination.hash = "resource-editor";
      router.replace(
        `${destination.pathname}${destination.search}${destination.hash}`,
      );
      return true;
    }

    if (successHref) {
      const destination = new URL(successHref, window.location.origin);
      destination.searchParams.set("module", moduleId);
      destination.searchParams.set("resource", resourceId);
      destination.searchParams.set("notice", notice);
      router.replace(
        `${destination.pathname}${destination.search}${destination.hash}`,
        { scroll: false },
      );
      return true;
    }

    if (successBaseHref) {
      const destination = new URL(
        `${successBaseHref}/${encodeURIComponent(resourceId)}`,
        window.location.origin,
      );
      destination.searchParams.set("notice", notice);
      router.replace(`${destination.pathname}${destination.search}`);
      return true;
    }

    return false;
  }, [draftBaseHref, draftPathSuffix, moduleId, openDraftEditor, router, successBaseHref, successHref]);

  useEffect(() => {
    if (state.status !== "success") return;
    if (onSuccess) {
      onSuccess(state.resourceId, state.message);
      return;
    }
    navigateAfterSuccess(
      state.resourceId,
      activeDisposition ?? (mode === "admin" ? "PUBLISH" : "SUBMIT_FOR_REVIEW"),
    );
  }, [activeDisposition, mode, navigateAfterSuccess, onSuccess, state]);

  useEffect(() => {
    if (state.status === "error" || uploadStage === "error") {
      errorSummaryRef.current?.focus();
    }
  }, [state, uploadStage]);

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

  function selectResourceMode(nextMode: "CONTENT" | "QUIZ") {
    if (resourceMode === nextMode || isPending) return;
    if (nextMode === "QUIZ") {
      resetAttachmentFields();
      setAttachment(null);
    }
    setResourceMode(nextMode);
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

  const quizSettingsReady =
    /^\d+$/.test(passingScore) &&
    Number(passingScore) >= 0 &&
    Number(passingScore) <= 100 &&
    (!maxAttempts ||
      (/^\d+$/.test(maxAttempts) &&
        Number(maxAttempts) >= 1 &&
        Number(maxAttempts) <= 100));
  const canSubmit =
    (resourceMode === "QUIZ"
      ? quizQuestionsValidation.success &&
        quizSettingsReady &&
        isResourceAttachmentReady({
          attachment: null,
          moduleId,
          title,
          instructions,
          content: "",
          estimatedMinutes,
          youtubeUrl: "",
          linkUrl: "",
          file: null,
        })
      : isResourceAttachmentReady({
          attachment,
          moduleId,
          title,
          instructions,
          content,
          estimatedMinutes,
          youtubeUrl,
          linkUrl,
          file,
      })) &&
    (resourceMode === "QUIZ" || !contentValidationError) &&
    !isPending;

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
            editorSessionId: requestId,
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
      } else {
        navigateAfterSuccess(confirmation.resource.id, disposition);
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

    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const disposition = submitter?.value as ContentCreationDisposition;
    if (!disposition) {
      event.preventDefault();
      return;
    }
    setActiveDisposition(disposition);

    if (attachment === "UPLOAD") {
      event.preventDefault();
      void submitUpload(disposition);
    }
  }

  const structuredResourceType =
    resourceMode === "QUIZ"
      ? ResourceType.QUIZ
      : attachment === null
      ? ResourceType.NOTE
      : attachment === "YOUTUBE"
      ? ResourceType.YOUTUBE
      : attachment === "LINK"
        ? ResourceType.LINK
        : "";
  const uploadPendingLabel =
    uploadStage === "preparing"
      ? "Preparando…"
      : uploadStage === "uploading"
        ? "Subiendo…"
        : uploadStage === "confirming"
          ? "Confirmando…"
          : "Guardando…";
  const pendingLabel = uploadBusy
    ? uploadPendingLabel
    : activeDisposition === "PUBLISH"
      ? "Publicando…"
      : activeDisposition === "SUBMIT_FOR_REVIEW"
        ? "Enviando…"
        : "Guardando borrador…";

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
      <input type="hidden" name="questions" value={JSON.stringify(quizQuestions)} />
      <input type="hidden" name="passingScore" value={passingScore} />
      <input type="hidden" name="maxAttempts" value={maxAttempts} />
      <input
        type="hidden"
        name="shuffleQuestions"
        value={shuffleQuestions ? "true" : "false"}
      />
      {attachment === "LINK" ? (
        <input type="hidden" name="openInNewTab" value="on" />
      ) : null}

      {state.status === "error" ? (
        <p
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300"
        >
          {state.message}
        </p>
      ) : null}
      {uploadMessage ? (
        <p
          ref={uploadStage === "error" ? errorSummaryRef : undefined}
          tabIndex={uploadStage === "error" ? -1 : undefined}
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
        <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Tipo de recurso">
          <button
            type="button"
            aria-pressed={resourceMode === "CONTENT"}
            disabled={isPending}
            onClick={() => selectResourceMode("CONTENT")}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${resourceMode === "CONTENT" ? "border-secondary bg-secondary text-white" : "border-border bg-background text-foreground hover:bg-surface-elevated"}`}
          >
            <FileText aria-hidden="true" className="size-4" />
            Contenido educativo
          </button>
          <button
            type="button"
            aria-pressed={resourceMode === "QUIZ"}
            disabled={isPending}
            onClick={() => selectResourceMode("QUIZ")}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${resourceMode === "QUIZ" ? "border-secondary bg-secondary text-white" : "border-border bg-background text-foreground hover:bg-surface-elevated"}`}
          >
            <CircleHelp aria-hidden="true" className="size-4" />
            Cuestionario
          </button>
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

        <textarea
          name="content"
          value={resourceMode === "CONTENT" ? content : ""}
          readOnly
          hidden
        />
        {resourceMode === "CONTENT" ? (
          <div className="space-y-1.5 text-sm font-medium text-foreground">
            <div>Contenido <span className="font-normal text-muted">(opcional)</span></div>
            <ResourceDocumentField
              initialValue={content}
              imageUploadContext={{
                editorSessionId: requestId,
                moduleId: moduleId || undefined,
              }}
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
        ) : null}

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

      {resourceMode === "QUIZ" ? (
        <div className="space-y-6 rounded-xl border border-secondary/20 bg-secondary/5 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1.5 text-sm font-medium text-foreground">
              Porcentaje de referencia
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={passingScore}
                  disabled={isPending}
                  onChange={(event) => setPassingScore(event.target.value)}
                  aria-label="Porcentaje de referencia"
                  className={creationFieldClass}
                />
                <span className="text-muted">%</span>
              </div>
              <CreationFieldError id={passingScoreErrorId} messages={errors?.passingScore} />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-foreground">
              Límite de intentos <span className="font-normal text-muted">(opcional)</span>
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                value={maxAttempts}
                disabled={isPending}
                onChange={(event) => setMaxAttempts(event.target.value)}
                placeholder="Sin límite"
                aria-label="Límite de intentos"
                className={creationFieldClass}
              />
              <CreationFieldError id={maxAttemptsErrorId} messages={errors?.maxAttempts} />
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                disabled={isPending}
                onChange={(event) => setShuffleQuestions(event.target.checked)}
                className="size-4 accent-secondary"
              />
              Mezclar preguntas
            </label>
          </div>
          <QuizQuestionEditor
            questions={quizQuestions}
            disabled={isPending}
            onChange={(nextQuestions) => {
              setQuizQuestions(nextQuestions);
              invalidateUploadAttempt();
            }}
            error={errors?.questions?.[0]}
          />
          {!quizSettingsReady ? (
            <p role="status" className="text-sm text-amber-800 dark:text-amber-200">
              Revisa el porcentaje de referencia y el límite de intentos.
            </p>
          ) : null}
        </div>
      ) : null}

      {resourceMode === "CONTENT" ? <fieldset disabled={isPending} aria-describedby={attachmentErrorId}>
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
      </fieldset> : null}

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
