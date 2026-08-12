import { z } from "zod";

import { contentAudienceValues } from "@/modules/content/domain/content-audience";

export const adminContentCreationModes = [
  "level",
  "subject",
  "module",
  "resource",
] as const;

export type AdminContentCreationMode =
  (typeof adminContentCreationModes)[number];

export type AdminContentCreationSearchParams = {
  create?: string | string[];
};

const singleString = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const creationModeParameter = z
  .preprocess(singleString, z.enum(adminContentCreationModes).optional())
  .catch(undefined);

export const adminContentCreationSearchParamsSchema = z.object({
  create: creationModeParameter,
});

export function parseAdminContentCreationSearchParams(
  searchParams: AdminContentCreationSearchParams,
) {
  return adminContentCreationSearchParamsSchema.parse(searchParams).create;
}

const optionalDescription = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum, `La descripción no puede superar ${maximum} caracteres.`)
    .transform((value) => value || undefined);

const entityId = z
  .string()
  .trim()
  .min(1, "La selección es obligatoria.")
  .max(128, "La selección no es válida.");

export const createLevelSchema = z.object({
  levelNumber: z.coerce
    .number({ error: "Ingresa un número de nivel válido." })
    .int("El número de nivel debe ser entero.")
    .positive("El número de nivel debe ser mayor que cero."),
  description: optionalDescription(500),
  requiresSubscription: z.boolean(),
});

export const createSubjectSchema = z.object({
  levelId: entityId,
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe contener al menos 2 caracteres.")
    .max(120, "El nombre no puede superar 120 caracteres."),
  description: optionalDescription(500),
});

export const createModuleSchema = z.object({
  subjectId: entityId,
  title: z
    .string()
    .trim()
    .min(2, "El título debe contener al menos 2 caracteres.")
    .max(160, "El título no puede superar 160 caracteres."),
  description: optionalDescription(1_000),
  audience: z.enum(contentAudienceValues, {
    error: "Selecciona una audiencia válida.",
  }),
  disposition: z.enum(["DRAFT", "PUBLISH"]),
});

export type CreateLevelInput = z.output<typeof createLevelSchema>;
export type CreateSubjectInput = z.output<typeof createSubjectSchema>;
export type CreateModuleInput = z.output<typeof createModuleSchema>;

function getTextValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function getCreateLevelFormValues(formData: FormData) {
  return {
    levelNumber: getTextValue(formData, "levelNumber"),
    description: getTextValue(formData, "description"),
    requiresSubscription: formData.get("requiresSubscription") === "on",
  };
}

export function getCreateSubjectFormValues(formData: FormData) {
  return {
    levelId: getTextValue(formData, "levelId"),
    name: getTextValue(formData, "name"),
    description: getTextValue(formData, "description"),
  };
}

export function getCreateModuleFormValues(formData: FormData) {
  return {
    subjectId: getTextValue(formData, "subjectId"),
    title: getTextValue(formData, "title"),
    description: getTextValue(formData, "description"),
    audience: getTextValue(formData, "audience"),
    disposition: getTextValue(formData, "disposition"),
  };
}

export function withAdminContentCreationMode(
  href: string,
  mode: AdminContentCreationMode,
) {
  const [pathname, query = ""] = href.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("create", mode);

  return `${pathname}?${params.toString()}`;
}
