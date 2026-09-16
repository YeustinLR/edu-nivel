"use client";

import {
  ResourceAttachmentForm,
  type ResourceModuleOption,
} from "@/modules/content/components/creation/ResourceAttachmentForm";

export function CreateResourceForm({
  moduleId,
  requestId,
  closeHref,
  subjectId,
  modules,
  onCancel,
  onSuccess,
  mode = "admin",
  draftBaseHref,
}: {
  moduleId?: string;
  requestId: string;
  closeHref?: string;
  subjectId?: string;
  modules?: ResourceModuleOption[];
  onCancel?: () => void;
  onSuccess?: (resourceId: string, message: string) => void;
  mode?: "admin" | "collaborator";
  draftBaseHref?: string;
}) {
  return (
    <ResourceAttachmentForm
      mode={mode}
      fixedModuleId={moduleId}
      modules={modules}
      requestId={requestId}
      closeHref={closeHref}
      successHref={closeHref}
      draftBaseHref={draftBaseHref ?? "/dashboard/admin/content/resources"}
      draftPathSuffix="/edit"
      expectedSubjectId={subjectId}
      onCancel={onCancel}
      onSuccess={onSuccess}
    />
  );
}
