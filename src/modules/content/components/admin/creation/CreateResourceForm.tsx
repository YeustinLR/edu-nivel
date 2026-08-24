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
}: {
  moduleId?: string;
  requestId: string;
  closeHref?: string;
  subjectId?: string;
  modules?: ResourceModuleOption[];
  onCancel?: () => void;
  onSuccess?: (resourceId: string, message: string) => void;
}) {
  return (
    <ResourceAttachmentForm
      mode="admin"
      fixedModuleId={moduleId}
      modules={modules}
      requestId={requestId}
      closeHref={closeHref}
      successBaseHref="/dashboard/admin/content/resources"
      expectedSubjectId={subjectId}
      onCancel={onCancel}
      onSuccess={onSuccess}
    />
  );
}
