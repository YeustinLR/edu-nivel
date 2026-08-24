export function normalizeWorkspaceSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");
}

export function formatRelativeWorkspaceDate(value: string, nowValue: string) {
  const date = new Date(value);
  const now = new Date(nowValue);
  const milliseconds = date.getTime() - now.getTime();
  if (!Number.isFinite(milliseconds)) return "Fecha no disponible";

  const formatter = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  const minutes = Math.round(milliseconds / 60_000);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(milliseconds / 3_600_000);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  const days = Math.round(milliseconds / 86_400_000);
  if (Math.abs(days) < 30) return formatter.format(days, "day");
  const months = Math.round(milliseconds / 2_629_800_000);
  if (Math.abs(months) < 12) return formatter.format(months, "month");
  return formatter.format(Math.round(milliseconds / 31_557_600_000), "year");
}
