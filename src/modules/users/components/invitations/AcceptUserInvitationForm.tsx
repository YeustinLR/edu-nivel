"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import AuthFormMessage from "@/modules/auth/components/AuthFormMessage";
import PasswordField from "@/modules/auth/components/PasswordField";
import PasswordStrengthMeter from "@/modules/auth/components/PasswordStrengthMeter";
import { getAuthErrorMessage } from "@/modules/auth/lib/auth-error-messages";
import {
  MINIMUM_SIGN_UP_AGE,
  MAXIMUM_SIGN_UP_AGE,
} from "@/modules/auth/lib/age";
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_MIN_LENGTH_PLACEHOLDER,
} from "@/modules/auth/lib/password";
import { AUTH_SESSION_STORAGE_KEYS } from "@/modules/auth/lib/session-storage-keys";
import { authClient } from "@/modules/auth/services/auth-client";
import type { AuthFormState } from "@/modules/auth/types/auth-form-state";
import { userRoleLabels } from "@/modules/users/domain/user-role";
import { acceptUserInvitationSchema } from "@/modules/users/schemas/accept-user-invitation.schema";
import type { UserInvitationAcceptanceData } from "@/server/users/user-invitation-queries";

type FieldErrors = Partial<
  Record<
    | "name"
    | "ageDeclared"
    | "password"
    | "confirmPassword"
    | "legal",
    string
  >
>;

export function AcceptUserInvitationForm({
  invitation,
  token,
}: {
  invitation: UserInvitationAcceptanceData;
  token: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formState, setFormState] = useState<AuthFormState>({ status: "idle" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const isBusy = formState.status === "loading";
  const ages = Array.from(
    { length: MAXIMUM_SIGN_UP_AGE - MINIMUM_SIGN_UP_AGE + 1 },
    (_, index) => MINIMUM_SIGN_UP_AGE + index,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = acceptUserInvitationSchema.safeParse({
      invitationToken: token,
      name: formData.get("name"),
      email: invitation.email,
      role: invitation.role,
      ageDeclared: formData.get("ageDeclared"),
      password,
      confirmPassword,
      acceptTerms: formData.get("acceptTerms") === "on",
      acceptPrivacy: formData.get("acceptPrivacy") === "on",
      adultDeclaration: formData.get("adultDeclaration") === "on",
    });

    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (
          field === "name" ||
          field === "ageDeclared" ||
          field === "password" ||
          field === "confirmPassword"
        ) {
          nextErrors[field] ??= issue.message;
        } else {
          nextErrors.legal ??= issue.message;
        }
      }
      setFieldErrors(nextErrors);
      setFormState({ status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos." });
      return;
    }

    setFieldErrors({});
    setFormState({ status: "loading" });

    const { error } = await authClient.signUp.email({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      ageDeclared: parsed.data.ageDeclared,
      role: parsed.data.role,
      invitationToken: parsed.data.invitationToken,
    });

    if (error) {
      setFormState({
        status: "error",
        message: getAuthErrorMessage(
          error,
          "No se pudo completar la invitación. Solicita un enlace nuevo.",
        ),
      });
      return;
    }

    window.sessionStorage.setItem(
      AUTH_SESSION_STORAGE_KEYS.emailVerification,
      parsed.data.email,
    );
    router.replace("/verify-email");
  }

  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 rounded-lg border border-border bg-background/60 p-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Correo</p>
          <p className="mt-1 truncate text-sm font-medium text-foreground">{invitation.email}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Acceso</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {userRoleLabels[invitation.role]}
            {invitation.levelNumber ? ` · Nivel ${invitation.levelNumber}` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-small font-semibold text-foreground">Nombre</label>
          <input
            id="name"
            name="name"
            required
            maxLength={100}
            defaultValue={invitation.name}
            disabled={isBusy}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-body text-foreground outline-none focus:border-accent"
          />
          {fieldErrors.name ? <p className="text-small text-red-500">{fieldErrors.name}</p> : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ageDeclared" className="text-small font-semibold text-foreground">Edad</label>
          <select
            id="ageDeclared"
            name="ageDeclared"
            required
            defaultValue=""
            disabled={isBusy}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-body text-foreground outline-none focus:border-accent"
          >
            <option value="" disabled>Selecciona tu edad</option>
            {ages.map((age) => <option key={age} value={age}>{age}</option>)}
          </select>
          {fieldErrors.ageDeclared ? <p className="text-small text-red-500">{fieldErrors.ageDeclared}</p> : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PasswordField
          id="password"
          name="password"
          label="Contraseña"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          onChange={setPassword}
          disabled={isBusy}
          error={fieldErrors.password}
          placeholder={PASSWORD_MIN_LENGTH_PLACEHOLDER}
          compact
        />
        <div className="space-y-1.5">
          <PasswordField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirmar contraseña"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={isBusy}
            error={fieldErrors.confirmPassword}
            placeholder="Repite tu contraseña"
            compact
          />
          {passwordsMatch ? (
            <p className="flex items-center gap-1.5 text-small text-success"><Check size={14} />Coinciden</p>
          ) : null}
        </div>
      </div>

      <PasswordStrengthMeter password={password} />

      <div className="space-y-2 rounded-lg border border-border bg-background/60 p-3 text-small text-muted">
        <label className="flex gap-2">
          <input name="adultDeclaration" type="checkbox" required className="mt-0.5 h-4 w-4 accent-current" />
          <span>Declaro que tengo 18 años o más.</span>
        </label>
        <label className="flex gap-2">
          <input name="acceptTerms" type="checkbox" required className="mt-0.5 h-4 w-4 accent-current" />
          <span>Acepto los <Link href="/terminos-legales" target="_blank" className="font-semibold text-foreground underline">términos legales</Link>.</span>
        </label>
        <label className="flex gap-2">
          <input name="acceptPrivacy" type="checkbox" required className="mt-0.5 h-4 w-4 accent-current" />
          <span>Acepto la <Link href="/privacidad" target="_blank" className="font-semibold text-foreground underline">política de privacidad</Link>.</span>
        </label>
        {fieldErrors.legal ? <p className="text-red-500">{fieldErrors.legal}</p> : null}
      </div>

      <AuthFormMessage state={formState} />

      <button
        type="submit"
        disabled={isBusy}
        className="btn-primary w-full rounded-lg px-5 py-3 text-small disabled:opacity-60"
      >
        {isBusy ? "Creando cuenta…" : "Aceptar invitación y crear cuenta"}
      </button>
    </form>
  );
}
