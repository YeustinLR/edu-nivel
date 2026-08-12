"use client";

import { ShieldCheck, UserRound } from "lucide-react";
import { useActionState, useId, useState } from "react";

import { Role } from "@/generated/prisma/enums";
import { updateAdminUserAction } from "@/modules/users/actions/admin-user-edit-actions";
import {
  AdminUserActionFeedback,
  AdminUserFieldError,
  AdminUserFormActions,
  adminUserFieldClass,
} from "@/modules/users/components/admin/AdminUserFormPrimitives";
import { adminUserRoleOptions } from "@/modules/users/domain/user-role";
import { initialAdminUserEditActionState } from "@/modules/users/types/admin-user-edit-action-state";
import type {
  AdminUserEditorData,
  AdminUserLevelOption,
} from "@/server/users/admin-user-editor-queries";

export function EditAdminUserForm({
  user,
  levels,
}: {
  user: Omit<AdminUserEditorData, "updatedAt"> & { updatedAt: string };
  levels: AdminUserLevelOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    updateAdminUserAction,
    initialAdminUserEditActionState,
  );
  const [role, setRole] = useState<Role>(user.role);
  const nameErrorId = useId();
  const roleErrorId = useId();
  const levelErrorId = useId();
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;
  const roleIsProtected = user.role === Role.ADMIN;
  const canSelectLevel = role === Role.STUDENT || role === Role.TEACHER;
  const editableRoleOptions = adminUserRoleOptions.filter(
    (option) => option.value !== Role.ADMIN || roleIsProtected,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={user.id} />
      <input type="hidden" name="expectedUpdatedAt" value={user.updatedAt} />
      {roleIsProtected ? <input type="hidden" name="role" value={Role.ADMIN} /> : null}

      <AdminUserActionFeedback state={state} />

      <section aria-labelledby="identity-heading" className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
            <UserRound aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h2 id="identity-heading" className="font-semibold text-foreground">
              Identidad y acceso
            </h2>
            <p className="mt-0.5 text-sm leading-6 text-muted">
              Actualiza los campos administrativos sin modificar credenciales.
            </p>
          </div>
        </div>

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
              defaultValue={values?.name ?? user.name}
              aria-invalid={Boolean(errors?.name)}
              aria-describedby={nameErrorId}
              className={adminUserFieldClass}
            />
            <AdminUserFieldError id={nameErrorId} messages={errors?.name} />
          </label>

          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Correo
            <input
              value={user.email}
              disabled
              className={adminUserFieldClass}
            />
            <span className="block min-h-4 text-xs font-normal text-muted">
              El correo se gestionará mediante un flujo verificado independiente.
            </span>
          </label>
        </div>
      </section>

      <section aria-labelledby="access-heading" className="space-y-4 border-t border-border pt-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h2 id="access-heading" className="font-semibold text-foreground">
              Rol y nivel
            </h2>
            <p className="mt-0.5 text-sm leading-6 text-muted">
              Los cambios de rol cierran las sesiones existentes del usuario.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Rol
            <select
              name={roleIsProtected ? undefined : "role"}
              value={role}
              disabled={isPending || roleIsProtected}
              onChange={(event) => setRole(event.target.value as Role)}
              aria-invalid={Boolean(errors?.role)}
              aria-describedby={roleErrorId}
              className={adminUserFieldClass}
            >
              {editableRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <AdminUserFieldError id={roleErrorId} messages={errors?.role} />
            {roleIsProtected ? (
              <span className="block text-xs font-normal text-muted">
                Las cuentas administradoras no se degradan desde este formulario.
              </span>
            ) : null}
          </label>

          {canSelectLevel ? (
            <label className="block space-y-1.5 text-sm font-medium text-foreground">
              Nivel seleccionado
              <select
                name="selectedLevelId"
                disabled={isPending}
                defaultValue={values?.selectedLevelId ?? user.selectedLevelId ?? ""}
                aria-invalid={Boolean(errors?.selectedLevelId)}
                aria-describedby={levelErrorId}
                className={adminUserFieldClass}
              >
                <option value="">Sin seleccionar</option>
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    Nivel {level.levelNumber}{level.isActive ? "" : " (inactivo)"}
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
              Este rol no utiliza un nivel seleccionado. Si guardas el cambio, cualquier
              selección anterior se eliminará.
            </div>
          )}
        </div>
      </section>

      <AdminUserFormActions
        cancelHref={`/dashboard/admin/users/${encodeURIComponent(user.id)}`}
        isPending={isPending}
      />
    </form>
  );
}
