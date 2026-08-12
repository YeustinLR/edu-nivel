"use client";

import { ResourceAttachmentForm } from "@/modules/content/components/creation/ResourceAttachmentForm";

export function CreateResourceForm({
  moduleId,
  requestId,
  closeHref,
}: {
  moduleId: string;
  requestId: string;
  closeHref: string;
}) {
  return (
    <ResourceAttachmentForm
      mode="admin"
      fixedModuleId={moduleId}
      requestId={requestId}
      closeHref={closeHref}
      successBaseHref="/dashboard/admin/content/resources"
    />
  );
}
