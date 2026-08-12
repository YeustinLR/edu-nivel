import { ResourceType } from "@/generated/prisma/enums";

export const UPLOAD_URL_TTL_SECONDS = 10 * 60;
export const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

const MEBIBYTE = 1024 * 1024;

export const FILE_POLICIES = {
  "application/pdf": {
    resourceType: ResourceType.PDF,
    maxSizeBytes: 50 * MEBIBYTE,
    extension: "pdf",
  },
  "image/jpeg": {
    resourceType: ResourceType.IMAGE,
    maxSizeBytes: 10 * MEBIBYTE,
    extension: "jpg",
  },
  "image/png": {
    resourceType: ResourceType.IMAGE,
    maxSizeBytes: 10 * MEBIBYTE,
    extension: "png",
  },
  "image/webp": {
    resourceType: ResourceType.IMAGE,
    maxSizeBytes: 10 * MEBIBYTE,
    extension: "webp",
  },
} as const;

export type SupportedMimeType = keyof typeof FILE_POLICIES;

export class FilePolicyError extends Error {
  constructor(
    public readonly code: "UNSUPPORTED_MIME_TYPE" | "FILE_TOO_LARGE",
    message: string,
  ) {
    super(message);
    this.name = "FilePolicyError";
  }
}

export function getFilePolicy(
  mimeType: string,
  sizeBytes: number,
  resourceType: ResourceType,
) {
  const policy = FILE_POLICIES[mimeType as SupportedMimeType];

  if (!policy || policy.resourceType !== resourceType) {
    throw new FilePolicyError(
      "UNSUPPORTED_MIME_TYPE",
      "Solo se admiten PDF, JPEG, PNG y WebP.",
    );
  }

  if (sizeBytes <= 0 || sizeBytes > policy.maxSizeBytes) {
    throw new FilePolicyError(
      "FILE_TOO_LARGE",
      `El archivo supera el limite permitido de ${Math.round(
        policy.maxSizeBytes / MEBIBYTE,
      )} MB.`,
    );
  }

  return policy;
}
