import {
  ContentAudience,
  PublicationStatus,
  ResourceType,
} from "@/generated/prisma/enums";
import {
  BookOpen,
  CircleHelp,
  File,
  FileText,
  Gamepad2,
  ImageIcon,
  Library,
  LinkIcon,
  Play,
  StickyNote,
  Volume2,
  type LucideIcon,
} from "lucide-react";

const statusPresentation = {
  [PublicationStatus.DRAFT]: {
    label: "Borrador",
    className: "bg-surface-elevated text-foreground-secondary",
  },
  [PublicationStatus.IN_REVIEW]: {
    label: "En revisión",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  [PublicationStatus.CHANGES_REQUESTED]: {
    label: "Cambios solicitados",
    className: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  [PublicationStatus.PUBLISHED]: {
    label: "Publicado",
    className: "bg-success/10 text-success",
  },
  [PublicationStatus.UNPUBLISHED]: {
    label: "Despublicado",
    className: "bg-red-500/10 text-red-700 dark:text-red-300",
  },
} satisfies Record<
  PublicationStatus,
  { label: string; className: string }
>;

const audiencePresentation = {
  [ContentAudience.STUDENT]: "Estudiantes",
  [ContentAudience.TEACHER]: "Docentes",
  [ContentAudience.BOTH]: "Ambos",
} satisfies Record<ContentAudience, string>;

export const resourceTypeLabels = {
  [ResourceType.NOTE]: "Nota",
  [ResourceType.LESSON]: "Lección",
  [ResourceType.QUIZ]: "Cuestionario",
  [ResourceType.YOUTUBE]: "YouTube",
  [ResourceType.PDF]: "PDF",
  [ResourceType.FILE]: "Archivo",
  [ResourceType.LINK]: "Enlace",
  [ResourceType.GAME]: "Juego",
  [ResourceType.DIDACTIC]: "Material didáctico",
  [ResourceType.IMAGE]: "Imagen",
  [ResourceType.AUDIO]: "Audio",
} satisfies Record<ResourceType, string>;

const resourceTypeIcons = {
  [ResourceType.NOTE]: StickyNote,
  [ResourceType.LESSON]: BookOpen,
  [ResourceType.QUIZ]: CircleHelp,
  [ResourceType.YOUTUBE]: Play,
  [ResourceType.PDF]: FileText,
  [ResourceType.FILE]: File,
  [ResourceType.LINK]: LinkIcon,
  [ResourceType.GAME]: Gamepad2,
  [ResourceType.DIDACTIC]: Library,
  [ResourceType.IMAGE]: ImageIcon,
  [ResourceType.AUDIO]: Volume2,
} satisfies Record<ResourceType, LucideIcon>;

export function ResourceTypeIcon({
  type,
  className = "h-4 w-4",
}: {
  type: ResourceType;
  className?: string;
}) {
  const Icon = resourceTypeIcons[type];

  return <Icon aria-hidden="true" className={className} />;
}

export function PublicationStatusBadge({
  status,
}: {
  status: PublicationStatus;
}) {
  const presentation = statusPresentation[status];

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${presentation.className}`}
    >
      {presentation.label}
    </span>
  );
}

export function AudienceBadge({
  audience,
}: {
  audience: ContentAudience;
}) {
  return (
    <span className="inline-flex rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary">
      {audiencePresentation[audience]}
    </span>
  );
}

export function ResourceTypeBadge({
  type,
  showIcon = false,
}: {
  type: ResourceType;
  showIcon?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-elevated px-2.5 py-1 text-xs font-medium text-foreground-secondary">
      {showIcon ? <ResourceTypeIcon type={type} className="h-3.5 w-3.5" /> : null}
      {resourceTypeLabels[type]}
    </span>
  );
}
