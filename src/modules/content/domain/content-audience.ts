export const contentAudienceValues = [
  "STUDENT",
  "TEACHER",
  "BOTH",
] as const;

export type ContentAudienceValue =
  (typeof contentAudienceValues)[number];
