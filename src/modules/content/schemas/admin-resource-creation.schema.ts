import { ResourceType } from "@/generated/prisma/enums";
import { contentCreationDispositions } from "@/modules/content/domain/content-creation";
import { z } from "zod";

export const structuredResourceTypes = [
  ResourceType.NOTE,
  ResourceType.LESSON,
  ResourceType.DIDACTIC,
  ResourceType.YOUTUBE,
  ResourceType.LINK,
] as const;

export type StructuredResourceType = (typeof structuredResourceTypes)[number];

const entityId = z.string().trim().min(1).max(128);
const requestId = z.uuid("La solicitud de creación no es válida.");
const title = z
  .string()
  .trim()
  .min(2, "El título debe contener al menos 2 caracteres.")
  .max(160, "El título no puede superar 160 caracteres.");
const optionalDescription = z
  .string()
  .trim()
  .max(1_000, "La descripción no puede superar 1 000 caracteres.")
  .transform((value) => value || undefined);
const educationalContent = z
  .string()
  .trim()
  .min(1, "El contenido es obligatorio.")
  .max(50_000, "El contenido no puede superar 50 000 caracteres.");

const optionalPositiveInteger = z
  .union([
    z.literal(""),
    z.coerce
      .number({ error: "Ingresa un número válido." })
      .int("El valor debe ser un número entero.")
      .min(1, "El valor debe ser mayor que cero.")
      .max(10_000, "El valor ingresado es demasiado alto."),
  ])
  .transform((value) => (value === "" ? undefined : value));

const optionalNonNegativeInteger = z
  .union([
    z.literal(""),
    z.coerce
      .number({ error: "Ingresa un segundo válido." })
      .int("El segundo debe ser un número entero.")
      .min(0, "El segundo inicial no puede ser negativo.")
      .max(86_400, "El segundo inicial no puede superar 24 horas."),
  ])
  .transform((value) => (value === "" ? undefined : value));

const youtubeVideoId = z
  .string()
  .trim()
  .regex(
    /^[A-Za-z0-9_-]{11}$/,
    "Ingresa una URL o un identificador válido de YouTube.",
  );

function isSafeWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const webUrl = z
  .string()
  .trim()
  .min(1, "La URL es obligatoria.")
  .max(2_048, "La URL es demasiado extensa.")
  .refine(isSafeWebUrl, "Ingresa una URL HTTP o HTTPS válida.")
  .transform((value) => new URL(value).toString());

const baseFields = {
  requestId,
  moduleId: entityId,
  title,
  description: optionalDescription,
  disposition: z.enum(contentCreationDispositions),
};

const noteSchema = z.object({
  ...baseFields,
  resourceType: z.literal(ResourceType.NOTE),
});

const lessonSchema = z.object({
  ...baseFields,
  resourceType: z.literal(ResourceType.LESSON),
  content: educationalContent,
  estimatedMinutes: optionalPositiveInteger,
});

const didacticSchema = z.object({
  ...baseFields,
  resourceType: z.literal(ResourceType.DIDACTIC),
  content: educationalContent,
  objective: z
    .string()
    .trim()
    .max(500, "El objetivo no puede superar 500 caracteres.")
    .transform((value) => value || undefined),
});

const youtubeSchema = z.object({
  ...baseFields,
  resourceType: z.literal(ResourceType.YOUTUBE),
  videoId: youtubeVideoId,
  startAt: optionalNonNegativeInteger,
});

const linkSchema = z.object({
  ...baseFields,
  resourceType: z.literal(ResourceType.LINK),
  url: webUrl,
  openInNewTab: z.boolean(),
});

export const createAdminStructuredResourceSchema = z.discriminatedUnion(
  "resourceType",
  [noteSchema, lessonSchema, didacticSchema, youtubeSchema, linkSchema],
);

export type CreateAdminStructuredResourceInput = z.output<
  typeof createAdminStructuredResourceSchema
>;

function getTextValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function normalizeYoutubeVideoId(value: string): string | null {
  const trimmed = value.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    let candidate: string | null = null;

    if (hostname === "youtu.be") {
      candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "youtube-nocookie.com"
    ) {
      if (url.pathname === "/watch") {
        candidate = url.searchParams.get("v");
      } else {
        const [kind, id] = url.pathname.split("/").filter(Boolean);
        if (kind === "embed" || kind === "shorts" || kind === "live") {
          candidate = id ?? null;
        }
      }
    }

    return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate)
      ? candidate
      : null;
  } catch {
    return null;
  }
}

export function getAdminStructuredResourceFormValues(formData: FormData) {
  const rawVideoValue = getTextValue(formData, "videoId");

  return {
    requestId: getTextValue(formData, "requestId"),
    moduleId: getTextValue(formData, "moduleId"),
    resourceType: getTextValue(formData, "resourceType"),
    title: getTextValue(formData, "title"),
    description: getTextValue(formData, "description"),
    content: getTextValue(formData, "content"),
    estimatedMinutes: getTextValue(formData, "estimatedMinutes"),
    objective: getTextValue(formData, "objective"),
    videoId: normalizeYoutubeVideoId(rawVideoValue) ?? rawVideoValue,
    startAt: getTextValue(formData, "startAt"),
    url: getTextValue(formData, "url"),
    openInNewTab: formData.get("openInNewTab") === "on",
    disposition: getTextValue(formData, "disposition"),
  };
}

export function withCreatedResourceSelection(_href: string, resourceId: string) {
  return `/dashboard/admin/content/resources/${encodeURIComponent(resourceId)}`;
}
