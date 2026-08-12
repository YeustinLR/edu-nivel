import { ResourceType } from "@/generated/prisma/enums";
import {
  FilePolicyError,
  getFilePolicy,
} from "@/modules/content/domain/file-policy";
import { normalizeYoutubeVideoId } from "@/modules/content/schemas/admin-resource-creation.schema";

export const resourceAttachmentKinds = [
  "YOUTUBE",
  "UPLOAD",
  "LINK",
  "LESSON",
  "DIDACTIC",
] as const;

export type ResourceAttachmentKind =
  (typeof resourceAttachmentKinds)[number];

export type UploadFileLike = {
  name: string;
  type: string;
  size: number;
};

export type ValidUploadFile = {
  category: "PDF" | "Imagen";
  resourceType: "PDF" | "IMAGE";
};

export function validateUploadFile(
  file: UploadFileLike,
): { success: true; data: ValidUploadFile } | { success: false; message: string } {
  const resourceType =
    file.type === "application/pdf"
      ? ResourceType.PDF
      : ResourceType.IMAGE;

  try {
    getFilePolicy(file.type, file.size, resourceType);
    return {
      success: true,
      data: {
        category: resourceType === ResourceType.PDF ? "PDF" : "Imagen",
        resourceType:
          resourceType === ResourceType.PDF ? "PDF" : "IMAGE",
      },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof FilePolicyError
          ? error.message
          : "El archivo seleccionado no es válido.",
    };
  }
}

export function normalizeYoutubeUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return normalizeYoutubeVideoId(url.toString());
  } catch {
    return null;
  }
}

export function getLocalLinkPreview(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    return {
      hostname: url.hostname.replace(/^www\./, ""),
      url: url.toString(),
    };
  } catch {
    return null;
  }
}

export function formatUploadSize(sizeBytes: number) {
  if (sizeBytes < 1_024) return `${sizeBytes} B`;
  if (sizeBytes < 1_048_576) return `${(sizeBytes / 1_024).toFixed(1)} KB`;
  return `${(sizeBytes / 1_048_576).toFixed(1)} MB`;
}

export function createUploadFingerprint(input: {
  moduleId: string;
  title: string;
  description: string;
  file: UploadFileLike;
}) {
  return [
    input.moduleId,
    input.title.trim(),
    input.description.trim(),
    input.file.name,
    input.file.type,
    input.file.size,
  ].join("\u0000");
}

function isOptionalIntegerValid(
  value: string,
  minimum: number,
  maximum: number,
) {
  if (!value) return true;
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum;
}

export function isResourceAttachmentReady(input: {
  attachment: ResourceAttachmentKind | null;
  moduleId: string;
  title: string;
  description: string;
  youtubeUrl: string;
  linkUrl: string;
  file: UploadFileLike | null;
  lessonContent: string;
  estimatedMinutes: string;
  didacticContent: string;
  objective: string;
}) {
  if (
    !input.moduleId ||
    input.title.trim().length < 2 ||
    input.title.trim().length > 160 ||
    input.description.trim().length > 1_000
  ) {
    return false;
  }

  switch (input.attachment) {
    case null:
      return true;
    case "YOUTUBE":
      return Boolean(normalizeYoutubeUrl(input.youtubeUrl));
    case "LINK":
      return Boolean(getLocalLinkPreview(input.linkUrl));
    case "UPLOAD":
      return Boolean(
        input.file && validateUploadFile(input.file).success,
      );
    case "LESSON":
      return (
        input.lessonContent.trim().length > 0 &&
        input.lessonContent.trim().length <= 50_000 &&
        isOptionalIntegerValid(input.estimatedMinutes, 1, 10_000)
      );
    case "DIDACTIC":
      return (
        input.didacticContent.trim().length > 0 &&
        input.didacticContent.trim().length <= 50_000 &&
        input.objective.trim().length <= 500
      );
    default:
      return false;
  }
}
