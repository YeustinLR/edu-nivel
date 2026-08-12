"use client";

import { CheckCircle2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useActionState, useId, useState } from "react";

import { Role } from "@/generated/prisma/enums";
import PasswordField from "@/modules/auth/components/PasswordField";
import PasswordStrengthMeter from "@/modules/auth/components/PasswordStrengthMeter";
import { MIN_PASSWORD_LENGTH } from "@/modules/auth/lib/password";
import { createAdminUserAction } from "@/modules/users/actions/admin-user-management-actions";
import { AdminUserFieldError, adminUserFieldClass } from "@/modules/users/components/admin/AdminUserFormPrimitives";
import { userRoleLabels } from "@/modules/users/domain/user-role";
import { invitablesRoles } from "@/modules/users/schemas/admin-user-invitation.schema";
import { initialAdminUserCreateActionState } from "@/modules/users/types/admin-user-create-action-state";
import type { AdminUserLevelOption } from "@/server/users/admin-user-editor-queries";

export function CreateAdminUserForm({ levels }: { levels: AdminUserLevelOption[] }) {
  const [state, formAction, isPending] = useActionState(
    createAdminUserAction,
    initialAdminUserCreateActionState,
  );
  const [role, setRole] = useState<Role>(Role.STUDENT);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
        <h2 className="mt-4 text-lg font-semibold text-foreground">Usuario creado</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          La cuenta de {state.email} está verificada. Comunica la contraseña temporal de forma segura.
        </p>
        <Link
          href={`/dashboard/admin/users/${encodeURIComponent(state.userId)}`}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-secondary px-5 py-2 text-sm font-medium text-white hover:bg-secondary/90"
        >
          Ver usuario
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
          <input name="name" required minLength={2} maxLength={100} autoFocus disabled={isPending} defaultValue={values?.name} aria-describedby={nameErrorId} className={adminUserFieldClass} />
          <AdminUserFieldError id={nameErrorId} messages={errors?.name} />
        </label>
        <label className="block space-y-1.5 text-sm font-medium text-foreground">
          Correo
          <input name="email" type="email" required autoComplete="email" disabled={isPending} defaultValue={values?.email} aria-describedby={emailErrorId} className={adminUserFieldClass} />
          <AdminUserFieldError id={emailErrorId} messages={errors?.email} />
        </label>
        <label className="block space-y-1.5 text-sm font-medium text-foreground">
          Rol inicial
          <select name="role" value={role} disabled={isPending} onChange={(event) => setRole(event.target.value as Role)} aria-describedby={roleErrorId} className={adminUserFieldClass}>
            {invitablesRoles.map((option) => <option key={option} value={option}>{userRoleLabels[option]}</option>)}
          </select>
          <AdminUserFieldError id={roleErrorId} messages={errors?.role} />
        </label>
        {canSelectLevel ? (
          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Nivel inicial <span className="font-normal text-muted">(opcional)</span>
            <select name="selectedLevelId" disabled={isPending} defaultValue={values?.selectedLevelId ?? ""} aria-describedby={levelErrorId} className={adminUserFieldClass}>
              <option value="">Sin seleccionar</option>
              {levels.map((level) => <option key={level.id} value={level.id}>Nivel {level.levelNumber}</option>)}
            </select>
            <AdminUserFieldError id={levelErrorId} messages={errors?.selectedLevelId} />
          </label>
        ) : <div className="rounded-lg border border-border bg-surface/60 p-3 text-sm text-muted">El colaborador no utiliza nivel inicial.</div>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <PasswordField id="password" name="password" label="Contraseña temporal" autoComplete="new-password" value={password} onChange={setPassword} disabled={isPending} minLength={MIN_PASSWORD_LENGTH} compact error={errors?.password?.[0]} />
          <div className="mt-2"><PasswordStrengthMeter password={password} /></div>
        </div>
        <PasswordField id="confirmPassword" name="confirmPassword" label="Confirmar contraseña" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} disabled={isPending} minLength={MIN_PASSWORD_LENGTH} compact error={errors?.confirmPassword?.[0]} />
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm leading-6 text-amber-900 dark:text-amber-100">
        El correo quedará verificado por administración. La persona deberá cambiar esta contraseña y completar las declaraciones legales antes de entrar al panel.
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Link href="/dashboard/admin/users" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated">Cancelar</Link>
        <button type="submit" disabled={isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-2 text-sm font-medium text-white hover:bg-secondary/90 disabled:opacity-50">
          <UserPlus aria-hidden="true" className="h-4 w-4" />
          {isPending ? "Creando…" : "Crear usuario"}
        </button>
      </div>
    </form>
  );
}
