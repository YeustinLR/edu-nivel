export const contentAudienceValues = [
  "STUDENT",
  "TEACHER",
  "BOTH",
] as const;

export type ContentAudienceValue =
  (typeof contentAudienceValues)[number];

export const moduleAudienceSelections = ["STUDENT", "TEACHER"] as const;

export type ModuleAudienceSelection =
  (typeof moduleAudienceSelections)[number];

export function parseModuleAudienceSelection(
  value: string | string[] | undefined,
): ModuleAudienceSelection {
  return value === "TEACHER" ? "TEACHER" : "STUDENT";
}

export function getModuleAudiencesForSelection(
  selection: ModuleAudienceSelection,
): ContentAudienceValue[] {
  return [selection, "BOTH"];
}

export function moduleMatchesAudienceSelection(
  audience: ContentAudienceValue,
  selection: ModuleAudienceSelection,
) {
  return audience === selection || audience === "BOTH";
}
