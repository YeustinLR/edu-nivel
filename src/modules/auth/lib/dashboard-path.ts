export const DASHBOARD_ROLES = [
  "STUDENT",
  "TEACHER",
  "COLLABORATOR",
  "ADMIN",
] as const;

export type DashboardRole = (typeof DASHBOARD_ROLES)[number];

const dashboardPathByRole: Record<DashboardRole, string> = {
  STUDENT: "/dashboard/student",
  TEACHER: "/dashboard/teacher",
  COLLABORATOR: "/dashboard/collaborator",
  ADMIN: "/dashboard/admin",
};

export function isDashboardRole(value: unknown): value is DashboardRole {
  return (
    typeof value === "string" &&
    DASHBOARD_ROLES.some((role) => role === value)
  );
}

export function getDashboardPathForRole(role: DashboardRole): string {
  return dashboardPathByRole[role];
}

/**
 * Conserva un destino privado especifico y solo reemplaza la entrada generica
 * `/dashboard` por el panel canonico del rol autenticado.
 */
export function getPostLoginDestination(
  safeRedirect: string,
  role: unknown,
): string {
  if (safeRedirect !== "/dashboard" || !isDashboardRole(role)) {
    return safeRedirect;
  }

  return getDashboardPathForRole(role);
}
