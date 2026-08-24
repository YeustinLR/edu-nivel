"use client";

import { LinkIcon, PlayCircle, UploadCloud } from "lucide-react";

import type { ResourceAttachmentKind } from "@/modules/content/domain/resource-attachment";

const attachmentPresentation = {
  YOUTUBE: {
    label: "YouTube",
    icon: PlayCircle,
    idleClass:
      "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
    selectedClass: "border-red-500 bg-red-500 text-white shadow-sm",
  },
  UPLOAD: {
    label: "Subir",
    icon: UploadCloud,
    idleClass:
      "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300",
    selectedClass: "border-sky-500 bg-sky-500 text-white shadow-sm",
  },
  LINK: {
    label: "Vínculo",
    icon: LinkIcon,
    idleClass:
      "border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300",
    selectedClass: "border-violet-500 bg-violet-500 text-white shadow-sm",
  },
} satisfies Record<
  ResourceAttachmentKind,
  {
    label: string;
    icon: typeof PlayCircle;
    idleClass: string;
    selectedClass: string;
  }
>;

export const adminResourceAttachments: ResourceAttachmentKind[] = [
  "YOUTUBE",
  "UPLOAD",
  "LINK",
];

export const collaboratorResourceAttachments: ResourceAttachmentKind[] = [
  "UPLOAD",
];

export function ResourceAttachmentChoices({
  attachments,
  selected,
  disabled = false,
  compact = false,
  onSelect,
}: {
  attachments: ResourceAttachmentKind[];
  selected: ResourceAttachmentKind | null;
  disabled?: boolean;
  compact?: boolean;
  onSelect?: (kind: ResourceAttachmentKind) => void;
}) {
  return (
    <div
      className={`mt-3 grid gap-2 ${
        compact ? "max-w-44 grid-cols-1" : "grid-cols-1 sm:grid-cols-3"
      }`}
    >
      {attachments.map((kind) => {
        const option = attachmentPresentation[kind];
        const Icon = option.icon;
        const isSelected = selected === kind;

        return (
          <button
            key={kind}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            onClick={() => onSelect?.(kind)}
            className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-2.5 py-2 text-center text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed ${isSelected ? option.selectedClass : option.idleClass}`}
          >
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="leading-tight">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
