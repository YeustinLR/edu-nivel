"use client";

import {
  ResourceAttachmentForm,
  type ResourceModuleOption,
} from "@/modules/content/components/creation/ResourceAttachmentForm";

export function UploadResourceForm({
  modules,
  requestId,
  successBaseHref = "/dashboard/collaborator/content/resources",
}: {
  modules: ResourceModuleOption[];
  requestId: string;
  successBaseHref?: string;
}) {
  return (
    <ResourceAttachmentForm
      mode="collaborator"
      modules={modules}
      requestId={requestId}
      closeHref="/dashboard/collaborator/content"
      successBaseHref={successBaseHref}
    />
  );
}
