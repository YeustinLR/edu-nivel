export type LearnerResourceAccessMode =
  | "INCLUDED"
  | "FREE_PREVIEW"
  | "SUBSCRIBED"
  | "LOCKED";

export function getLearnerResourceAccessMode({
  levelRequiresSubscription,
  isFreePreview,
  hasLevelAccess,
}: {
  levelRequiresSubscription: boolean;
  isFreePreview: boolean;
  hasLevelAccess: boolean;
}): LearnerResourceAccessMode {
  if (levelRequiresSubscription === false) return "INCLUDED";
  if (hasLevelAccess) return "SUBSCRIBED";
  if (isFreePreview === true) return "FREE_PREVIEW";
  return "LOCKED";
}

export function canOpenLearnerResource(
  mode: LearnerResourceAccessMode,
): mode is Exclude<LearnerResourceAccessMode, "LOCKED"> {
  return mode !== "LOCKED";
}
