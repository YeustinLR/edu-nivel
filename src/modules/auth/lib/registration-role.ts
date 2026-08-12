import { z } from "zod";

export const PUBLIC_REGISTRATION_ROLES = ["STUDENT", "TEACHER"] as const;
export const INVITABLE_REGISTRATION_ROLES = [
  "STUDENT",
  "TEACHER",
  "COLLABORATOR",
] as const;

export const registrationRoleSchema = z.enum(PUBLIC_REGISTRATION_ROLES, {
  error: "Selecciona si deseas registrarte como estudiante o docente.",
});

// Better Auth necesita reconocer COLLABORATOR para aceptar una invitación,
// pero el hook server-side continúa rechazándolo cuando no existe un token válido.
export const accountRegistrationRoleSchema = z.enum(
  INVITABLE_REGISTRATION_ROLES,
  { error: "Selecciona un tipo de cuenta válido." },
);

export type RegistrationRole = z.infer<typeof registrationRoleSchema>;

export const REGISTRATION_ROLE_OPTIONS: ReadonlyArray<{
  value: RegistrationRole;
  label: string;
  description: string;
}> = [
  {
    value: "STUDENT",
    label: "Estudiante",
    description: "Accede a tu espacio de aprendizaje y seguimiento.",
  },
  {
    value: "TEACHER",
    label: "Docente",
    description: "Accede al espacio y los recursos para docentes.",
  },
];
