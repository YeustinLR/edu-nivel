import type { ResourceType } from "@/generated/prisma/enums";

const levelNames: Record<number, string> = {
  1: "Primer año",
  2: "Segundo año",
  3: "Tercer año",
  4: "Cuarto año",
  5: "Quinto año",
  6: "Sexto año",
  7: "Séptimo año",
  8: "Octavo año",
  9: "Noveno año",
  10: "Décimo año",
  11: "Undécimo año",
  12: "Duodécimo año",
};

export function formatLearnerLevel(levelNumber: number) {
  return levelNames[levelNumber] ?? `Nivel ${levelNumber}`;
}

export function formatResourceDuration(
  estimatedMinutes: number | null,
  durationSeconds: number | null,
) {
  if (durationSeconds && durationSeconds > 0) {
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }
  if (estimatedMinutes && estimatedMinutes > 0) {
    return `${estimatedMinutes} min`;
  }
  return null;
}

export function resourceTone(type: ResourceType) {
  if (type === "YOUTUBE" || type === "AUDIO") return "blue";
  if (type === "PDF" || type === "FILE") return "rose";
  if (type === "LESSON" || type === "NOTE" || type === "DIDACTIC") return "green";
  if (type === "QUIZ" || type === "GAME") return "violet";
  return "amber";
}
