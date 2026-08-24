import {
  ContentAudience,
  PublicationStatus,
  ResourceType,
} from "@/generated/prisma/enums";
import {
  CircleCheck,
  CircleHelp,
  CircleOff,
  Clock3,
  File,
  FilePenLine,
  FileText,
  Gamepad2,
  GraduationCap,
  ImageIcon,
  LinkIcon,
  Play,
  Presentation,
  StickyNote,
  TriangleAlert,
  UsersRound,
  Volume2,
  type LucideIcon,
} from "lucide-react";

const statusPresentation = {
  [PublicationStatus.DRAFT]: {
    label: "Borrador",
    className: "bg-surface-elevated text-foreground-secondary",
    icon: FilePenLine,
  },
  [PublicationStatus.IN_REVIEW]: {
    label: "En revisión",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: Clock3,
  },
  [PublicationStatus.CHANGES_REQUESTED]: {
    label: "Cambios solicitados",
    className: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
    icon: TriangleAlert,
  },
  [PublicationStatus.PUBLISHED]: {
    label: "Publicado",
    className: "bg-success/10 text-success",
    icon: CircleCheck,
  },
  [PublicationStatus.UNPUBLISHED]: {
    label: "Despublicado",
    className: "bg-red-500/10 text-red-700 dark:text-red-300",
    icon: CircleOff,
  },
} satisfies Record<
  PublicationStatus,
  { label: string; className: string; icon: LucideIcon }
>;

const audiencePresentation = {
  [ContentAudience.STUDENT]: { label: "Estudiantes", icon: GraduationCap },
  [ContentAudience.TEACHER]: { label: "Docentes", icon: Presentation },
  [ContentAudience.BOTH]: {
    label: "Estudiantes y docentes",
    icon: UsersRound,
  },
} satisfies Record<
  ContentAudience,
  { label: string; icon: LucideIcon }
>;

export const resourceTypeLabels = {
  [ResourceType.NOTE]: "Contenido",
  [ResourceType.QUIZ]: "Cuestionario",
  [ResourceType.YOUTUBE]: "YouTube",
  [ResourceType.PDF]: "PDF",
  [ResourceType.FILE]: "Archivo",
  [ResourceType.LINK]: "Enlace",
  [ResourceType.GAME]: "Juego",
  [ResourceType.IMAGE]: "Imagen",
  [ResourceType.AUDIO]: "Audio",
} satisfies Record<ResourceType, string>;

const resourceTypeIcons = {
  [ResourceType.NOTE]: StickyNote,
  [ResourceType.QUIZ]: CircleHelp,
  [ResourceType.YOUTUBE]: Play,
  [ResourceType.PDF]: FileText,
  [ResourceType.FILE]: File,
  [ResourceType.LINK]: LinkIcon,
  [ResourceType.GAME]: Gamepad2,
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
  compact = false,
  showIcon = compact,
}: {
  status: PublicationStatus;
  compact?: boolean;
  showIcon?: boolean;
}) {
  const presentation = statusPresentation[status];
  const Icon = presentation.icon;

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        compact
          ? "gap-1 px-1.5 py-0.5 text-[11px] leading-4"
          : "gap-1.5 px-2.5 py-1 text-xs"
      } ${presentation.className}`}
    >
      {showIcon ? <Icon aria-hidden="true" className="h-3 w-3" /> : null}
      {presentation.label}
    </span>
  );
}

export function AudienceBadge({
  audience,
  appearance = "badge",
}: {
  audience: ContentAudience;
  appearance?: "badge" | "inline";
}) {
  const presentation = audiencePresentation[audience];
  const Icon = presentation.icon;

  return (
    <span
      className={
        appearance === "inline"
          ? "inline-flex items-center gap-1 text-xs font-medium text-muted"
          : "inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary"
      }
    >
      <Icon
        aria-hidden="true"
        className={`h-3.5 w-3.5 ${appearance === "inline" ? "text-secondary" : ""}`}
      />
      {presentation.label}
    </span>
  );
}

export function ResourceTypeBadge({
  type,
  showIcon = false,
  appearance = "badge",
}: {
  type: ResourceType;
  showIcon?: boolean;
  appearance?: "badge" | "inline";
}) {
  return (
    <span
      className={
        appearance === "inline"
          ? "inline-flex items-center gap-1 text-xs font-medium text-muted"
          : "inline-flex items-center gap-1.5 rounded-full bg-surface-elevated px-2.5 py-1 text-xs font-medium text-foreground-secondary"
      }
    >
      {showIcon ? <ResourceTypeIcon type={type} className="h-3.5 w-3.5" /> : null}
      {resourceTypeLabels[type]}
    </span>
  );
}
