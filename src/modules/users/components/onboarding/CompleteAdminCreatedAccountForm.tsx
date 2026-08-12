"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import PasswordField from "@/modules/auth/components/PasswordField";
import PasswordStrengthMeter from "@/modules/auth/components/PasswordStrengthMeter";
import { MAXIMUM_SIGN_UP_AGE, MINIMUM_SIGN_UP_AGE } from "@/modules/auth/lib/age";
import { MIN_PASSWORD_LENGTH } from "@/modules/auth/lib/password";
import { completeAccountAction } from "@/modules/users/actions/complete-account-action";
import { initialCompleteAccountActionState } from "@/modules/users/types/complete-account-action-state";

const ageOptions = Array.from(
  { length: MAXIMUM_SIGN_UP_AGE - MINIMUM_SIGN_UP_AGE + 1 },
  (_, index) => MINIMUM_SIGN_UP_AGE + index,
);

export function CompleteAdminCreatedAccountForm({
  passwordChangeRequired,
}: {
  passwordChangeRequired: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    completeAccountAction,
    initialCompleteAccountActionState,
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const errors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-5">
      {state.status === "error" ? (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {state.message}
        </p>
      ) : null}

      {passwordChangeRequired ? (
        <div className="space-y-4">
          <PasswordField id="currentPassword" name="currentPassword" label="Contraseña temporal" autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} disabled={isPending} compact error={errors?.currentPassword?.[0]} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <PasswordField id="password" name="password" label="Nueva contraseña" autoComplete="new-password" value={password} onChange={setPassword} disabled={isPending} minLength={MIN_PASSWORD_LENGTH} compact error={errors?.password?.[0]} />
              <div className="mt-2"><PasswordStrengthMeter password={password} /></div>
            </div>
            <PasswordField id="confirmPassword" name="confirmPassword" label="Confirmar nueva contraseña" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} disabled={isPending} minLength={MIN_PASSWORD_LENGTH} compact error={errors?.confirmPassword?.[0]} />
          </div>
        </div>
      ) : null}

      <label className="block space-y-1.5 text-sm font-medium text-foreground">
        Edad declarada
        <select name="ageDeclared" required disabled={isPending} defaultValue="" className="min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground">
          <option value="" disabled>Selecciona tu edad</option>
          {ageOptions.map((age) => <option key={age} value={age}>{age}</option>)}
        </select>
        {errors?.ageDeclared?.[0] ? <span className="text-xs text-red-600">{errors.ageDeclared[0]}</span> : null}
      </label>

      <fieldset className="space-y-3 rounded-lg border border-border bg-surface/50 p-4 text-sm text-foreground">
        <legend className="px-1 font-semibold">Declaraciones obligatorias</legend>
        <label className="flex items-start gap-2"><input type="checkbox" name="adultDeclaration" required disabled={isPending} className="mt-1" /><span>Declaro que tengo 18 años o más.</span></label>
        <label className="flex items-start gap-2"><input type="checkbox" name="acceptTerms" required disabled={isPending} className="mt-1" /><span>Acepto los <Link href="/terminos-legales" target="_blank" className="font-medium text-secondary underline">términos legales</Link>.</span></label>
        <label className="flex items-start gap-2"><input type="checkbox" name="acceptPrivacy" required disabled={isPending} className="mt-1" /><span>Acepto la <Link href="/privacidad" target="_blank" className="font-medium text-secondary underline">política de privacidad</Link>.</span></label>
        {errors?.adultDeclaration?.[0] || errors?.acceptTerms?.[0] || errors?.acceptPrivacy?.[0] ? <p className="text-xs text-red-600">Debes completar todas las declaraciones.</p> : null}
      </fieldset>

      <button type="submit" disabled={isPending} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-secondary px-5 py-2 text-sm font-medium text-white hover:bg-secondary/90 disabled:opacity-50">
        {isPending ? "Guardando…" : "Completar cuenta"}
      </button>
    </form>
  );
}
