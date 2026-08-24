"use client";

import {
  BookOpen,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";

import { PublicationStatus } from "@/generated/prisma/enums";
import {
  duplicateWorkspaceModuleAction,
  getWorkspaceResourceDetailAction,
  reorderWorkspaceModulesAction,
  reorderWorkspaceResourcesAction,
} from "@/modules/content/actions/content-workspace-actions";
import { setContentAvailabilityAction } from "@/modules/content/actions/content-edit-actions";
import { transitionEditorialContentAction } from "@/modules/content/actions/editorial-actions";
import {
  adminCatalogBreadcrumbs,
  ContentPageHeader,
  primaryActionClass,
  secondaryActionClass,
} from "@/modules/content/components/admin/ContentPageHeader";
import { CreateModuleForm } from "@/modules/content/components/admin/creation/CreateModuleForm";
import { ContentWorkspaceDrawer } from "@/modules/content/components/admin/workspace/ContentWorkspaceDrawer";
import {
  ContentWorkspaceToolbar,
} from "@/modules/content/components/admin/workspace/ContentWorkspaceToolbar";
import { normalizeWorkspaceSearch } from "@/modules/content/components/admin/workspace/content-workspace-presentation";
import { WorkspaceModuleCard } from "@/modules/content/components/admin/workspace/WorkspaceModuleCard";
import {
  WorkspaceConfirmationDialog,
  type WorkspaceConfirmation,
} from "@/modules/content/components/admin/workspace/WorkspaceConfirmationDialog";
import { EditModuleForm } from "@/modules/content/components/editor/EditModuleForm";
import { ResourceContentView } from "@/modules/content/components/editor/ResourceContentView";
import { initialContentEditActionState } from "@/modules/content/types/content-edit-action-state";
import { initialEditorialActionState } from "@/modules/content/types/editorial-action-state";
import type {
  AdminSubjectWorkspaceModule,
  AdminSubjectWorkspaceResource,
} from "@/server/content/admin-module-list-queries";

type SubjectWorkspaceContext = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  level: { id: string; levelNumber: number; isActive: boolean };
};

type ResourceDetailResult = Awaited<
  ReturnType<typeof getWorkspaceResourceDetailAction>
>;
type WorkspaceResourceDetail = Extract<
  ResourceDetailResult,
  { status: "success" }
>["resource"];

type DrawerState =
  | { kind: "create-module" }
  | { kind: "edit-module"; moduleRecord: AdminSubjectWorkspaceModule }
  | {
      kind: "resource";
      moduleId: string;
      resourceId: string;
      resource?: WorkspaceResourceDetail;
    }
  | null;

type ToastState = { message: string; tone: "success" | "error" } | null;

type WorkspaceOrderUpdate =
  | { type: "modules"; modules: AdminSubjectWorkspaceModule[] }
  | {
      type: "resources";
      moduleId: string;
      resources: AdminSubjectWorkspaceResource[];
    };

function applyWorkspaceOrderUpdate(
  current: AdminSubjectWorkspaceModule[],
  update: WorkspaceOrderUpdate,
) {
  if (update.type === "modules") return update.modules;
  return current.map((moduleRecord) =>
    moduleRecord.id === update.moduleId
      ? { ...moduleRecord, resources: update.resources }
      : moduleRecord,
  );
}

function moveItem<T extends { id: string }>(items: T[], sourceId: string, targetId: string) {
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return items;
  const next = [...items];
  const [source] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, source);
  return next;
}

function moveByDirection<T extends { id: string }>(items: T[], id: string, direction: -1 | 1) {
  const index = items.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function orderItemsByIds<T extends { id: string }>(items: T[], orderedIds: string[]) {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const orderedItems = orderedIds.flatMap((id) => {
    const item = itemsById.get(id);
    return item ? [item] : [];
  });
  const orderedIdSet = new Set(orderedIds);
  return [...orderedItems, ...items.filter((item) => !orderedIdSet.has(item.id))];
}

export function SubjectContentWorkspace({
  subject,
  modules,
  now,
  initialModuleId,
}: {
  subject: SubjectWorkspaceContext;
  modules: AdminSubjectWorkspaceModule[];
  now: string;
  initialModuleId?: string;
}) {
  const router = useRouter();
  const [orderedModules, updateOptimisticOrder] = useOptimistic(
    modules,
    applyWorkspaceOrderUpdate,
  );
  const [search, setSearch] = useState("");
  const [openModuleIds, setOpenModuleIds] = useState(
    () => new Set(initialModuleId ? [initialModuleId] : []),
  );
  const [draggingModuleId, setDraggingModuleId] = useState<string | null>(null);
  const [dragOverModuleId, setDragOverModuleId] = useState<string | null>(null);
  const [moduleDragPreviewIds, setModuleDragPreviewIds] = useState<string[] | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [confirmation, setConfirmation] = useState<WorkspaceConfirmation | null>(null);
  const [isPending, startTransition] = useTransition();
  const moduleElementsRef = useRef(new Map<string, HTMLDivElement>());
  const previousModulePositionsRef = useRef(new Map<string, DOMRect>());
  const moduleDropCommittedRef = useRef(false);

  const displayedModules = useMemo(
    () =>
      moduleDragPreviewIds
        ? orderItemsByIds(orderedModules, moduleDragPreviewIds)
        : orderedModules,
    [moduleDragPreviewIds, orderedModules],
  );

  const captureModulePositions = useCallback(() => {
    previousModulePositionsRef.current = new Map(
      Array.from(moduleElementsRef.current, ([id, element]) => [
        id,
        element.getBoundingClientRect(),
      ]),
    );
  }, []);

  useLayoutEffect(() => {
    const previousPositions = previousModulePositionsRef.current;
    if (previousPositions.size === 0) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    moduleElementsRef.current.forEach((element, id) => {
      const previousPosition = previousPositions.get(id);
      if (!previousPosition || reduceMotion) return;
      const currentPosition = element.getBoundingClientRect();
      const offsetY = previousPosition.top - currentPosition.top;
      if (Math.abs(offsetY) < 1) return;

      element.getAnimations().forEach((animation) => animation.cancel());
      element.animate(
        [
          { transform: `translateY(${offsetY}px)` },
          { transform: "translateY(0)" },
        ],
        {
          duration: 220,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      );
    });
    previousPositions.clear();
  }, [displayedModules]);

  const showToast = useCallback((message: string, tone: "success" | "error" = "success") => {
    setToast({ message, tone });
  }, []);

  const filteredModules = useMemo(() => {
    const query = normalizeWorkspaceSearch(search);
    return displayedModules.flatMap((moduleRecord) => {
      const moduleText = normalizeWorkspaceSearch(
        `${moduleRecord.title} ${moduleRecord.description ?? ""}`,
      );
      const moduleSearchMatches = !query || moduleText.includes(query);
      const visibleResources = moduleRecord.resources.filter((resource) => {
        return (
          !query ||
          moduleSearchMatches ||
          normalizeWorkspaceSearch(resource.title).includes(query)
        );
      });

      if (!moduleSearchMatches && visibleResources.length === 0) {
        return [];
      }
      return [{ moduleRecord, visibleResources }];
    });
  }, [displayedModules, search]);

  const searchActive = Boolean(search.trim());
  const canReorderModules = !searchActive;
  const canReorderResources = !searchActive;
  const subjectResourceCreateHref = `/dashboard/admin/content/subjects/${encodeURIComponent(subject.id)}/resources/new`;
  const moduleResourceCreateHref = (moduleId: string) =>
    `/dashboard/admin/content/modules/${encodeURIComponent(moduleId)}/resources/new`;

  const closeDrawer = useCallback(() => setDrawer(null), []);
  const handleSaved = useCallback(
    (message: string) => {
      setDrawer(null);
      showToast(message);
    },
    [showToast],
  );

  function openResourcePreview(moduleId: string, resourceId: string) {
    setDrawer({ kind: "resource", moduleId, resourceId });
    startTransition(async () => {
      const result = await getWorkspaceResourceDetailAction({
        subjectId: subject.id,
        moduleId,
        resourceId,
      });
      if (result.status === "error") {
        setDrawer(null);
        showToast(result.message, "error");
        return;
      }
      setDrawer((current) =>
        current?.kind === "resource" && current.resourceId === resourceId
          ? { ...current, resource: result.resource }
          : current,
      );
    });
  }

  function runEditorial(
    targetType: "module" | "resource",
    targetId: string,
    parentId: string,
    publicationStatus: PublicationStatus,
  ) {
    const transition =
      publicationStatus === PublicationStatus.PUBLISHED
        ? "UNPUBLISH"
        : publicationStatus === PublicationStatus.IN_REVIEW
          ? "PUBLISH"
          : "PUBLISH_DIRECT";
    const publishing = transition !== "UNPUBLISH";
    setConfirmation({
      title: publishing ? "¿Publicar contenido?" : "¿Despublicar contenido?",
      description: publishing
        ? "El contenido quedará disponible según su audiencia y el acceso al nivel."
        : "Dejará de estar disponible para estudiantes y docentes.",
      confirmLabel: publishing ? "Sí, publicar" : "Sí, despublicar",
      destructive: !publishing,
      action: () => {
        startTransition(async () => {
          const data = new FormData();
          data.set("targetType", targetType);
          data.set("targetId", targetId);
          data.set("parentId", parentId);
          data.set("transition", transition);
          if (transition === "PUBLISH") data.set("reviewConfirmed", "true");
          const result = await transitionEditorialContentAction(
            initialEditorialActionState,
            data,
          );
          if (result.status === "success") {
            setConfirmation(null);
            showToast(result.message);
          } else if (result.status === "error") {
            setConfirmation(null);
            showToast(result.message, "error");
          }
        });
      },
    });
  }

  function runAvailability(
    type: "module" | "resource",
    id: string,
    isActive: boolean,
    updatedAt: string,
  ) {
    const execute = () => {
      startTransition(async () => {
        const data = new FormData();
        data.set("type", type);
        data.set("id", id);
        data.set("expectedUpdatedAt", updatedAt);
        data.set("isActive", String(!isActive));
        const result = await setContentAvailabilityAction(
          initialContentEditActionState,
          data,
        );
        if (result.status === "success") {
          setConfirmation(null);
          showToast(result.message);
        } else if (result.status === "error") {
          setConfirmation(null);
          showToast(result.message, "error");
        }
      });
    };

    if (!isActive) {
      execute();
      return;
    }
    setConfirmation({
      title: `¿Archivar ${type === "module" ? "el módulo" : "el recurso"}?`,
      description:
        "Se ocultará del catálogo, pero permanecerá en la base de datos y podrá reactivarse.",
      confirmLabel: "Sí, archivar",
      destructive: true,
      action: execute,
    });
  }

  function persistModuleOrder(next: AdminSubjectWorkspaceModule[], previous: AdminSubjectWorkspaceModule[]) {
    if (next === previous) return;
    startTransition(async () => {
      updateOptimisticOrder({ type: "modules", modules: next });
      setModuleDragPreviewIds(null);
      const result = await reorderWorkspaceModulesAction({
        subjectId: subject.id,
        moduleIds: next.map((moduleRecord) => moduleRecord.id),
      });
      if (result.status === "error") {
        captureModulePositions();
        showToast(result.message, "error");
      } else {
        showToast(result.message);
      }
    });
  }

  function resetModuleDrag() {
    setDraggingModuleId(null);
    setDragOverModuleId(null);
    setModuleDragPreviewIds(null);
  }

  function finishModuleDrag() {
    if (moduleDropCommittedRef.current) {
      moduleDropCommittedRef.current = false;
      setDraggingModuleId(null);
      setDragOverModuleId(null);
      return;
    }
    resetModuleDrag();
  }

  function previewModuleMove(
    targetId: string,
    pointerY: number,
    targetBounds: DOMRect,
  ) {
    if (!draggingModuleId || draggingModuleId === targetId) return;

    const currentIds =
      moduleDragPreviewIds ?? orderedModules.map((moduleRecord) => moduleRecord.id);
    const sourceIndex = currentIds.indexOf(draggingModuleId);
    const targetIndex = currentIds.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const targetMiddle = targetBounds.top + targetBounds.height / 2;
    if (sourceIndex < targetIndex && pointerY < targetMiddle) return;
    if (sourceIndex > targetIndex && pointerY > targetMiddle) return;

    const nextIds = moveItem(
      currentIds.map((id) => ({ id })),
      draggingModuleId,
      targetId,
    ).map(({ id }) => id);
    if (nextIds.every((id, index) => id === currentIds[index])) return;

    captureModulePositions();
    setDragOverModuleId(targetId);
    setModuleDragPreviewIds(nextIds);
  }

  function commitModuleDrop() {
    if (!draggingModuleId) return;
    const previous = orderedModules;
    const next = moduleDragPreviewIds
      ? orderItemsByIds(previous, moduleDragPreviewIds)
      : previous;
    const orderChanged = next.some(
      (moduleRecord, index) => moduleRecord.id !== previous[index]?.id,
    );
    setDraggingModuleId(null);
    setDragOverModuleId(null);
    if (!orderChanged) {
      setModuleDragPreviewIds(null);
      return;
    }
    moduleDropCommittedRef.current = true;
    persistModuleOrder(next, previous);
  }

  function persistResourceOrder(
    moduleId: string,
    nextResources: AdminSubjectWorkspaceResource[],
    previousResources: AdminSubjectWorkspaceResource[],
  ) {
    if (nextResources === previousResources) return;
    startTransition(async () => {
      updateOptimisticOrder({
        type: "resources",
        moduleId,
        resources: nextResources,
      });
      const result = await reorderWorkspaceResourcesAction({
        subjectId: subject.id,
        moduleId,
        resourceIds: nextResources.map((resource) => resource.id),
      });
      if (result.status === "error") {
        showToast(result.message, "error");
      } else {
        showToast(result.message);
      }
    });
  }

  const drawerTitle =
    drawer?.kind === "create-module"
      ? "Crear módulo"
      : drawer?.kind === "edit-module"
          ? `Editar ${drawer.moduleRecord.title}`
          : drawer?.kind === "resource"
            ? "Vista previa del recurso"
            : "Gestión de contenido";

  return (
    <div className="space-y-6">
      <ContentPageHeader
        eyebrow="Materia"
        title={subject.name}
        description={subject.description ?? "Esta materia todavía no tiene una descripción."}
        breadcrumbs={[
          ...adminCatalogBreadcrumbs,
          {
            label: `Nivel ${subject.level.levelNumber}`,
            href: `/dashboard/admin/content/levels/${encodeURIComponent(subject.level.id)}`,
          },
          { label: subject.name },
        ]}
        metadata={
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${subject.isActive ? "bg-success/10 text-success" : "bg-red-500/10 text-red-700 dark:text-red-300"}`}>
            {subject.isActive ? "Activa" : "Archivada"}
          </span>
        }
        actions={
          <>
            <Link href={`/dashboard/admin/content/subjects/${encodeURIComponent(subject.id)}/edit`} className={secondaryActionClass}>
              <Pencil aria-hidden="true" className="h-4 w-4" /> Editar materia
            </Link>
            {subject.isActive && subject.level.isActive ? (
              <>
                <button type="button" onClick={() => setDrawer({ kind: "create-module" })} className={primaryActionClass}>
                  <Plus aria-hidden="true" className="h-4 w-4" /> Crear módulo
                </button>
                <Link href={subjectResourceCreateHref} className={secondaryActionClass}>
                  <Plus aria-hidden="true" className="h-4 w-4" /> Añadir recurso
                </Link>
              </>
            ) : null}
          </>
        }
      />

      <section className="rounded-2xl border border-border bg-card shadow-[0_18px_50px_-40px_rgba(15,23,42,.5)]" aria-labelledby="subject-modules-heading">
        <ContentWorkspaceToolbar
          search={search}
          onSearchChange={setSearch}
        />

        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex items-baseline gap-2">
            <h2 id="subject-modules-heading" className="font-semibold text-foreground">Módulos</h2>
            <span className="text-xs text-muted">
              {filteredModules.length} de {orderedModules.length}
            </span>
          </div>
          {searchActive ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
              }}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted hover:bg-surface-elevated hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" /> Limpiar búsqueda
            </button>
          ) : null}
        </div>

        {filteredModules.length > 0 ? (
          <div
            className={`space-y-3 bg-surface/35 p-3 sm:p-4 ${draggingModuleId ? "select-none" : ""}`}
            onDragOver={(event) => {
              if (!draggingModuleId) return;
              const scrollZone = 88;
              const scrollStep = 14;
              if (event.clientY < scrollZone) {
                window.scrollBy({ top: -scrollStep, behavior: "auto" });
              } else if (event.clientY > window.innerHeight - scrollZone) {
                window.scrollBy({ top: scrollStep, behavior: "auto" });
              }
            }}
          >
            <p className="sr-only" aria-live="polite">
              {draggingModuleId
                ? `Moviendo ${displayedModules.find((moduleRecord) => moduleRecord.id === draggingModuleId)?.title ?? "módulo"}. Posición ${displayedModules.findIndex((moduleRecord) => moduleRecord.id === draggingModuleId) + 1} de ${displayedModules.length}.`
                : ""}
            </p>
            {filteredModules.map(({ moduleRecord, visibleResources }) => {
              const position = displayedModules.findIndex((item) => item.id === moduleRecord.id) + 1;
              return (
                <div
                  key={moduleRecord.id}
                  ref={(element) => {
                    if (element) moduleElementsRef.current.set(moduleRecord.id, element);
                    else moduleElementsRef.current.delete(moduleRecord.id);
                  }}
                  className="relative will-change-transform has-[details[open]]:z-40"
                >
                  <WorkspaceModuleCard
                    moduleRecord={moduleRecord}
                    position={position}
                    moduleCount={orderedModules.length}
                    visibleResources={visibleResources}
                    open={openModuleIds.has(moduleRecord.id)}
                    now={now}
                    canReorderModules={canReorderModules}
                    canReorderResources={canReorderResources}
                    pending={isPending}
                    dragging={draggingModuleId === moduleRecord.id}
                    dragTarget={dragOverModuleId === moduleRecord.id}
                    onToggle={() =>
                      setOpenModuleIds((current) => {
                        const next = new Set(current);
                        if (next.has(moduleRecord.id)) next.delete(moduleRecord.id);
                        else next.add(moduleRecord.id);
                        return next;
                      })
                    }
                    onDragStart={() => {
                      moduleDropCommittedRef.current = false;
                      setDraggingModuleId(moduleRecord.id);
                      setDragOverModuleId(moduleRecord.id);
                      setModuleDragPreviewIds(orderedModules.map((item) => item.id));
                    }}
                    onDragOverModule={(pointerY, targetBounds) =>
                      previewModuleMove(moduleRecord.id, pointerY, targetBounds)
                    }
                    onDragEnd={finishModuleDrag}
                    onDropModule={commitModuleDrop}
                    onEditModule={() => setDrawer({ kind: "edit-module", moduleRecord })}
                    onAddResource={() => router.push(moduleResourceCreateHref(moduleRecord.id))}
                    onDuplicate={() =>
                      startTransition(async () => {
                        const result = await duplicateWorkspaceModuleAction({ subjectId: subject.id, moduleId: moduleRecord.id });
                        if (result.status === "success") {
                          if (result.entityId) setOpenModuleIds((current) => new Set(current).add(result.entityId!));
                          showToast(result.message);
                        } else showToast(result.message, "error");
                      })
                    }
                    onModuleEditorial={() => runEditorial("module", moduleRecord.id, subject.id, moduleRecord.publicationStatus)}
                    onModuleAvailability={() => runAvailability("module", moduleRecord.id, moduleRecord.isActive, moduleRecord.updatedAt)}
                    onMoveModule={(direction) => {
                      const previous = orderedModules;
                      persistModuleOrder(moveByDirection(previous, moduleRecord.id, direction), previous);
                    }}
                    onPreviewResource={openResourcePreview}
                    onEditResource={(_moduleId, resourceId) =>
                      router.push(`/dashboard/admin/content/resources/${encodeURIComponent(resourceId)}/edit`)
                    }
                    onResourceEditorial={(moduleId, resource) => runEditorial("resource", resource.id, moduleId, resource.publicationStatus)}
                    onResourceAvailability={(_moduleId, resource) => runAvailability("resource", resource.id, resource.isActive, resource.updatedAt)}
                    onMoveResource={(moduleId, resourceId, direction) => {
                      const owner = orderedModules.find((item) => item.id === moduleId);
                      if (!owner) return;
                      persistResourceOrder(moduleId, moveByDirection(owner.resources, resourceId, direction), owner.resources);
                    }}
                    onDropResource={(moduleId, sourceId, targetId) => {
                      const owner = orderedModules.find((item) => item.id === moduleId);
                      if (!owner) return;
                      persistResourceOrder(moduleId, moveItem(owner.resources, sourceId, targetId), owner.resources);
                    }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <BookOpen aria-hidden="true" className="mx-auto h-8 w-8 text-muted" />
            <h3 className="mt-3 text-sm font-semibold text-foreground">No hay contenido que coincida</h3>
            <p className="mt-1 text-sm text-muted">Ajusta la búsqueda para ver otros módulos.</p>
          </div>
        )}
      </section>

      <ContentWorkspaceDrawer
        open={Boolean(drawer)}
        title={drawerTitle}
        description={`Gestiona el contenido sin salir de ${subject.name}.`}
        onClose={closeDrawer}
        wide={drawer?.kind === "resource"}
      >
        {drawer?.kind === "create-module" ? (
          <CreateModuleForm
            subjectId={subject.id}
            onCancel={closeDrawer}
            onSuccess={(moduleId, message) => {
              setOpenModuleIds((current) => new Set(current).add(moduleId));
              handleSaved(message);
            }}
          />
        ) : drawer?.kind === "edit-module" ? (
          <EditModuleForm
            moduleRecord={{
              id: drawer.moduleRecord.id,
              title: drawer.moduleRecord.title,
              description: drawer.moduleRecord.description,
              audience: drawer.moduleRecord.audience,
              updatedAt: drawer.moduleRecord.updatedAt,
            }}
            onCancel={closeDrawer}
            onSuccess={handleSaved}
          />
        ) : drawer?.kind === "resource" ? (
          drawer.resource ? (
            <ResourceContentView resource={drawer.resource} />
          ) : (
            <div className="space-y-3" aria-label="Cargando recurso">
              <div className="h-6 w-32 animate-pulse rounded bg-surface-elevated" />
              <div className="h-10 animate-pulse rounded-lg bg-surface-elevated" />
              <div className="h-40 animate-pulse rounded-xl bg-surface-elevated" />
            </div>
          )
        ) : null}
      </ContentWorkspaceDrawer>

      <WorkspaceConfirmationDialog
        confirmation={confirmation}
        pending={isPending}
        onClose={() => setConfirmation(null)}
      />

      {toast ? (
        <div
          role={toast.tone === "error" ? "alert" : "status"}
          className={`fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl ${
            toast.tone === "error"
              ? "border-red-500/25 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
              : "border-success/25 bg-card text-foreground"
          }`}
        >
          <span className="flex-1">{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Cerrar notificación" className="rounded p-1 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
