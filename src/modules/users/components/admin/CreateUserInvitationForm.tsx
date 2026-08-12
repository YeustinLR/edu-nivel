"use client";

import { CheckCircle2, Send } from "lucide-react";
import Link from "next/link";
import { useActionState, useId, useState } from "react";

import { Role } from "@/generated/prisma/enums";
import { createAdminUserInvitationAction } from "@/modules/users/actions/admin-user-invitation-actions";
import {
  AdminUserFieldError,
  adminUserFieldClass,
} from "@/modules/users/components/admin/AdminUserFormPrimitives";
import { userRoleLabels } from "@/modules/users/domain/user-role";
import { invitablesRoles } from "@/modules/users/schemas/admin-user-invitation.schema";
import { initialAdminUserInvitationActionState } from "@/modules/users/types/admin-user-invitation-action-state";
import type { AdminUserLevelOption } from "@/server/users/admin-user-editor-queries";

export function CreateUserInvitationForm({
  levels,
}: {
  levels: AdminUserLevelOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    createAdminUserInvitationAction,
    initialAdminUserInvitationActionState,
  );
  const [role, setRole] = useState<Role>(Role.STUDENT);
  const nameErrorId = useId();
  const emailErrorId = useId();
  const roleErrorId = useId();
  const levelErrorId = useId();
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;
  const canSelectLevel = role === Role.STUDENT || role === Role.TEACHER;

  if (state.status === "success") {
    return (
      <div className="py-5 text-center">
        <CheckCircle2 aria-hidden="true" className="mx-auto h-11 w-11 text-success" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Invitación enviada
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Enviamos a {state.email} un enlace de un solo uso válido durante 72 horas.
        </p>
        <Link
          href="/dashboard/admin/users"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-secondary px-5 py-2 text-sm font-medium text-white hover:bg-secondary/90"
        >
          Volver a usuarios
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.status === "error" ? (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm font-medium text-foreground">
          Nombre
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoFocus
            disabled={isPending}
            defaultValue={values?.name}
            aria-invalid={Boolean(errors?.name)}
            aria-describedby={nameErrorId}
            className={adminUserFieldClass}
          />
          <AdminUserFieldError id={nameErrorId} messages={errors?.name} />
        </label>

        <label className="block space-y-1.5 text-sm font-medium text-foreground">
          Correo
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            disabled={isPending}
            defaultValue={values?.email}
            aria-invalid={Boolean(errors?.email)}
            aria-describedby={emailErrorId}
            className={adminUserFieldClass}
          />
          <AdminUserFieldError id={emailErrorId} messages={errors?.email} />
        </label>

        <label className="block space-y-1.5 text-sm font-medium text-foreground">
          Rol inicial
          <select
            name="role"
            value={role}
            disabled={isPending}
            onChange={(event) => setRole(event.target.value as Role)}
            aria-invalid={Boolean(errors?.role)}
            aria-describedby={roleErrorId}
            className={adminUserFieldClass}
          >
            {invitablesRoles.map((option) => (
              <option key={option} value={option}>
                {userRoleLabels[option]}
              </option>
            ))}
          </select>
          <AdminUserFieldError id={roleErrorId} messages={errors?.role} />
        </label>

        {canSelectLevel ? (
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Nivel inicial <span className="font-normal text-muted">(opcional)</span>
            <select
              name="selectedLevelId"
              disabled={isPending}
              defaultValue={values?.selectedLevelId ?? ""}
              aria-invalid={Boolean(errors?.selectedLevelId)}
              aria-describedby={levelErrorId}
              className={adminUserFieldClass}
            >
              <option value="">Sin seleccionar</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  Nivel {level.levelNumber}
                </option>
              ))}
            </select>
            <AdminUserFieldError
              id={levelErrorId}
              messages={errors?.selectedLevelId}
            />
          </label>
        ) : (
          <div className="rounded-lg border border-border bg-surface/60 p-3 text-sm text-muted">
            El colaborador recibirá acceso al espacio de creación de contenido y no tendrá nivel inicial.
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface/60 p-3 text-sm leading-6 text-muted">
        La persona invitada definirá su contraseña, declarará su edad y aceptará los términos. La cuenta no existe hasta completar el enlace.
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Link
          href="/dashboard/admin/users"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-2 text-sm font-medium text-white hover:bg-secondary/90 disabled:opacity-50"
        >
          <Send aria-hidden="true" className="h-4 w-4" />
          {isPending ? "Enviando…" : "Enviar invitación"}
        </button>
      </div>
    </form>
  );
}
