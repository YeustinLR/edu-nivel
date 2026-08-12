import { Role } from "@/generated/prisma/enums";

export const userRoleLabels: Record<Role, string> = {
  [Role.STUDENT]: "Estudiante",
  [Role.TEACHER]: "Docente",
  [Role.COLLABORATOR]: "Colaborador",
  [Role.ADMIN]: "Administrador",
};

export const adminUserRoleOptions = Object.values(Role).map((role) => ({
  value: role,
  label: userRoleLabels[role],
}));
