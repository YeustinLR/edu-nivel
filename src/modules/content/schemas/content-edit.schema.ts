import { z } from "zod";

import { ResourceType } from "@/generated/prisma/enums";
import { contentAudienceValues } from "@/modules/content/domain/content-audience";
import { normalizeYoutubeVideoId } from "@/modules/content/schemas/admin-resource-creation.schema";

export const contentEditModes = [
  "level",
  "subject",
  "module",
  "resource",
] as const;

export type ContentEditMode = (typeof contentEditModes)[number];

export type ContentEditSearchParams = {
  edit?: string | string[];
};

const singleString = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const editModeParameter = z
  .preprocess(singleString, z.enum(contentEditModes).optional())
  .catch(undefined);

export function parseContentEditSearchParams(
  searchParams: ContentEditSearchParams,
) {
  return z.object({ edit: editModeParameter }).parse(searchParams).edit;
}

export function withContentEditMode(href: string, mode: ContentEditMode) {
  const [pathname, query = ""] = href.split("?", 2);
  const params = new URLSearchParams(query);
  params.delete("create");
  params.set("edit", mode);
  return `${pathname}?${params.toString()}`;
}

export function withoutContentEditMode(href: string) {
  const [pathname, query = ""] = href.split("?", 2);
  const params = new URLSearchParams(query);
  params.delete("edit");
  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

const entityId = z.string().trim().min(1).max(128);
const expectedUpdatedAt = z.iso.datetime({ offset: true });
const optionalDescription = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum, `La descripción no puede superar ${maximum} caracteres.`)
    .transform((value) => value || undefined);

const editBaseSchema = z.object({
  id: entityId,
  expectedUpdatedAt,
});

export const updateLevelSchema = editBaseSchema.extend({
  levelNumber: z.coerce
    .number({ error: "Ingresa un número de nivel válido." })
    .int("El número de nivel debe ser entero.")
    .positive("El número de nivel debe ser mayor que cero."),
  description: optionalDescription(500),
  requiresSubscription: z.boolean(),
});

export const updateSubjectSchema = editBaseSchema.extend({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe contener al menos 2 caracteres.")
    .max(120, "El nombre no puede superar 120 caracteres."),
  description: optionalDescription(500),
});

export const updateModuleSchema = editBaseSchema.extend({
  title: z
    .string()
    .trim()
    .min(2, "El título debe contener al menos 2 caracteres.")
    .max(160, "El título no puede superar 160 caracteres."),
  description: optionalDescription(1_000),
  audience: z.enum(contentAudienceValues, {
    error: "Selecciona una audiencia válida.",
  }),
});

function isSafeWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const optionalYoutubeVideoId = z
  .string()
  .trim()
  .max(2_048, "La URL de YouTube es demasiado extensa.")
  .transform((value) => {
    if (!value) return undefined;
    return normalizeYoutubeVideoId(value) ?? value;
  })
  .refine(
    (value) => value === undefined || /^[A-Za-z0-9_-]{11}$/.test(value),
    "Ingresa una URL o un identificador válido de YouTube.",
  )
  .optional();

const optionalWebUrl = z
  .string()
  .trim()
  .max(2_048, "La URL es demasiado extensa.")
  .transform((value) => value || undefined)
  .refine(
    (value) => value === undefined || isSafeWebUrl(value),
    "Ingresa una URL HTTP o HTTPS válida.",
  )
  .transform((value) => (value ? new URL(value).toString() : undefined))
  .optional();

export const updateResourceSchema = editBaseSchema
  .extend({
    resourceType: z.nativeEnum(ResourceType),
    title: z
      .string()
      .trim()
      .min(2, "El título debe contener al menos 2 caracteres.")
      .max(160, "El título no puede superar 160 caracteres."),
    description: optionalDescription(1_000),
    content: z
      .string()
      .trim()
      .max(50_000, "El contenido no puede superar 50 000 caracteres.")
      .transform((value) => value || undefined)
      .optional(),
    estimatedMinutes: z
      .union([
        z.literal(""),
        z.coerce
          .number({ error: "Ingresa una duración válida." })
          .int("La duración debe expresarse en minutos enteros.")
          .min(1, "La duración debe ser de al menos un minuto.")
          .max(10_000, "La duración no es válida."),
      ])
      .transform((value) =>
        value === "" || value === undefined ? undefined : value,
      )
      .optional(),
    objective: z
      .string()
      .trim()
      .max(500, "El objetivo no puede superar 500 caracteres.")
      .transform((value) => value || undefined)
      .optional(),
    videoId: optionalYoutubeVideoId,
    startAt: z
      .union([
        z.literal(""),
        z.coerce
          .number({ error: "Ingresa un segundo válido." })
          .int("El segundo debe ser un número entero.")
          .min(0, "El segundo inicial no puede ser negativo.")
          .max(86_400, "El segundo inicial no puede superar 24 horas."),
      ])
      .transform((value) =>
        value === "" || value === undefined ? undefined : value,
      )
      .optional(),
    url: optionalWebUrl,
    openInNewTab: z.boolean().optional(),
    altText: z.string().trim().max(300).optional(),
  })
  .superRefine((value, context) => {
    if (
      (value.resourceType === ResourceType.LESSON ||
        value.resourceType === ResourceType.DIDACTIC) &&
      !value.content
    ) {
      context.addIssue({
        code: "custom",
        path: ["content"],
        message: "El contenido es obligatorio.",
      });
    }

    if (value.resourceType === ResourceType.YOUTUBE && !value.videoId) {
      context.addIssue({
        code: "custom",
        path: ["videoId"],
        message: "La URL o el identificador de YouTube es obligatorio.",
      });
    }

    if (value.resourceType === ResourceType.LINK && !value.url) {
      context.addIssue({
        code: "custom",
        path: ["url"],
        message: "La URL es obligatoria.",
      });
    }
  });

export const contentAvailabilitySchema = editBaseSchema.extend({
  type: z.enum(["level", "subject", "module", "resource"]),
  isActive: z.boolean(),
});

export type UpdateLevelInput = z.output<typeof updateLevelSchema>;
export type UpdateSubjectInput = z.output<typeof updateSubjectSchema>;
export type UpdateModuleInput = z.output<typeof updateModuleSchema>;
export type UpdateResourceInput = z.output<typeof updateResourceSchema>;
export type ContentAvailabilityInput = z.output<
  typeof contentAvailabilitySchema
>;

function getTextValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function getEditBaseValues(formData: FormData) {
  return {
    id: getTextValue(formData, "id"),
    expectedUpdatedAt: getTextValue(formData, "expectedUpdatedAt"),
  };
}

export function getUpdateLevelFormValues(formData: FormData) {
  return {
    ...getEditBaseValues(formData),
    levelNumber: getTextValue(formData, "levelNumber"),
    description: getTextValue(formData, "description"),
    requiresSubscription: formData.get("requiresSubscription") === "on",
  };
}

export function getUpdateSubjectFormValues(formData: FormData) {
  return {
    ...getEditBaseValues(formData),
    name: getTextValue(formData, "name"),
    description: getTextValue(formData, "description"),
  };
}

export function getUpdateModuleFormValues(formData: FormData) {
  return {
    ...getEditBaseValues(formData),
    title: getTextValue(formData, "title"),
    description: getTextValue(formData, "description"),
    audience: getTextValue(formData, "audience"),
  };
}

export function getUpdateResourceFormValues(formData: FormData) {
  return {
    ...getEditBaseValues(formData),
    resourceType: getTextValue(formData, "resourceType"),
    title: getTextValue(formData, "title"),
    description: getTextValue(formData, "description"),
    content: getTextValue(formData, "content") || undefined,
    estimatedMinutes: getTextValue(formData, "estimatedMinutes"),
    objective: getTextValue(formData, "objective") || undefined,
    videoId: getTextValue(formData, "videoId") || undefined,
    startAt: getTextValue(formData, "startAt"),
    url: getTextValue(formData, "url") || undefined,
    openInNewTab: formData.get("openInNewTab") === "on",
    altText: getTextValue(formData, "altText") || undefined,
  };
}

export function getContentAvailabilityFormValues(formData: FormData) {
  return {
    ...getEditBaseValues(formData),
    type: getTextValue(formData, "type"),
    isActive: getTextValue(formData, "isActive") === "true",
  };
}
