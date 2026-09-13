/**
 * Responsabilidad del archivo:
 * - Registrar usuarios desde el cliente con el flujo de Better Auth.
 *
 * Papel en la arquitectura:
 * - Valida los datos basicos antes de enviar la solicitud.
 * - Delegua a Better Auth la creacion del usuario, hash de password y apertura de sesion.
 * - Redirige a verificacion de correo despues del registro exitoso.
 */
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { BookOpen, Check, GraduationCap } from "lucide-react";

import { MAXIMUM_SIGN_UP_AGE, MINIMUM_SIGN_UP_AGE } from "@/modules/auth/lib/age";
import { getAuthErrorMessage } from "@/modules/auth/lib/auth-error-messages";
import { getSafeRedirect } from "@/modules/auth/lib/get-safe-redirect";
import { AUTH_VALIDATION_MESSAGES } from "@/modules/auth/lib/messages";
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_MIN_LENGTH_PLACEHOLDER,
} from "@/modules/auth/lib/password";
import {
  REGISTRATION_ROLE_OPTIONS,
  registrationRoleSchema,
  type RegistrationRole,
} from "@/modules/auth/lib/registration-role";
import { AUTH_SESSION_STORAGE_KEYS } from "@/modules/auth/lib/session-storage-keys";
import { storeCountdownDeadline } from "@/modules/auth/lib/use-countdown";
import AuthFormMessage from "@/modules/auth/components/AuthFormMessage";
import PasswordField from "@/modules/auth/components/PasswordField";
import PasswordStrengthMeter from "@/modules/auth/components/PasswordStrengthMeter";
import { registerSchema } from "@/modules/auth/schemas/register.schema";
import { authClient } from "@/modules/auth/services/auth-client";
import type { AuthFormState } from "@/modules/auth/types/auth-form-state";

const initialState: AuthFormState = { status: "idle" };
const AGE_OPTIONS = Array.from(
  { length: MAXIMUM_SIGN_UP_AGE - MINIMUM_SIGN_UP_AGE + 1 },
  (_, index) => MINIMUM_SIGN_UP_AGE + index,
);

type FieldErrors = Partial<Record<
  | "role"
  | "name"
  | "email"
  | "ageDeclared"
  | "password"
  | "confirmPassword"
  | "legal",
  string
>>;

const roleIcon: Record<RegistrationRole, typeof GraduationCap> = {
  STUDENT: GraduationCap,
  TEACHER: BookOpen,
};

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = getSafeRedirect(searchParams.get("redirect"));
  const requestedRole = registrationRoleSchema.safeParse(
    searchParams.get("role"),
  );
  const defaultRole = requestedRole.success ? requestedRole.data : undefined;
  const [formState, setFormState] = useState<AuthFormState>(initialState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordsMatch = Boolean(confirmPassword) && password === confirmPassword;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState({ status: "loading" });

    const formData = new FormData(event.currentTarget);
    const acceptedLegal = formData.get("acceptTerms") === "on";
    const parsed = registerSchema.safeParse({
      role: formData.get("role"),
      name: formData.get("name"),
      email: formData.get("email"),
      ageDeclared: formData.get("ageDeclared"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      acceptTerms: acceptedLegal,
      acceptPrivacy: acceptedLegal,
      adultDeclaration: formData.get("adultDeclaration") === "on",
    });

    if (!parsed.success) {
      const nextFieldErrors: FieldErrors = {};

      for (const issue of parsed.error.issues) {
        const field = issue.path[0];

        if (
          field === "role" ||
          field === "name" ||
          field === "email" ||
          field === "ageDeclared" ||
          field === "password" ||
          field === "confirmPassword"
        ) {
          nextFieldErrors[field] ??= issue.message;
        } else {
          nextFieldErrors.legal ??= issue.message;
        }
      }

      setFieldErrors(nextFieldErrors);
      setFormState({
        status: "error",
        message: parsed.error.issues[0]?.message ?? AUTH_VALIDATION_MESSAGES.defaultFormError,
      });
      return;
    }

    setFieldErrors({});

    // El servidor valida las declaraciones y estampa sus fechas de forma autoritativa.
    const { error } = await authClient.signUp.email({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      ageDeclared: parsed.data.ageDeclared,
      role: parsed.data.role,
      acceptTerms: parsed.data.acceptTerms,
      acceptPrivacy: parsed.data.acceptPrivacy,
      adultDeclaration: parsed.data.adultDeclaration,
    });

    if (error) {
      setFormState({
        status: "error",
        message: getAuthErrorMessage(error, "No se pudo crear la cuenta."),
      });
      return;
    }

    window.sessionStorage.setItem(
      AUTH_SESSION_STORAGE_KEYS.emailVerification,
      parsed.data.email,
    );
    storeCountdownDeadline(AUTH_SESSION_STORAGE_KEYS.emailVerificationResend, 60);

    const verifyUrl = redirectUrl === "/dashboard"
      ? "/verify-email"
      : `/verify-email?redirect=${encodeURIComponent(redirectUrl)}`;

    router.replace(verifyUrl);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <fieldset className="space-y-1" aria-describedby={fieldErrors.role ? "role-error" : undefined}>
          <legend className="text-small font-semibold text-foreground">
            ¿Cómo usarás EduNivel?
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {REGISTRATION_ROLE_OPTIONS.map((option) => {
              const Icon = roleIcon[option.value];

              return (
                <label key={option.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    required
                    defaultChecked={option.value === defaultRole}
                    aria-describedby={fieldErrors.role ? "role-error" : undefined}
                    className="peer sr-only"
                  />
                  <span className="flex h-full gap-2 rounded-lg border border-border bg-background p-2.5 transition hover:border-accent/60 peer-checked:border-accent peer-checked:bg-accent/10 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-text">
                      <Icon size={15} aria-hidden="true" />
                    </span>
                    <span className="space-y-1">
                      <span className="block text-small font-semibold text-foreground">
                        {option.label}
                      </span>
                      <span className="block text-small text-muted">
                        {option.description}
                      </span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {fieldErrors.role && (
            <p id="role-error" className="text-small text-danger">{fieldErrors.role}</p>
          )}
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-small font-semibold text-foreground">
              Nombre
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "name-error" : undefined}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-body text-foreground outline-none transition focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              placeholder="Tu nombre"
            />
            {fieldErrors.name && (
              <p id="name-error" className="text-small text-danger">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ageDeclared" className="text-small font-semibold text-foreground">
              Edad
            </label>
            <select
              id="ageDeclared"
              name="ageDeclared"
              required
              defaultValue=""
              aria-invalid={Boolean(fieldErrors.ageDeclared)}
              aria-describedby={fieldErrors.ageDeclared ? "age-declared-error" : undefined}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-left text-body text-foreground outline-none transition focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <option value="" disabled>Selecciona tu edad</option>
              {AGE_OPTIONS.map((age) => <option key={age} value={age}>{age}</option>)}
            </select>
            {fieldErrors.ageDeclared && (
              <p id="age-declared-error" className="text-small text-danger">{fieldErrors.ageDeclared}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-small font-semibold text-foreground">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-body text-foreground outline-none transition focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="tu@correo.com"
          />
          {fieldErrors.email && (
            <p id="email-error" className="text-small text-danger">{fieldErrors.email}</p>
          )}
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
              error={fieldErrors.confirmPassword}
              placeholder="Repite tu contraseña"
              toggleLabels={{
                show: "Mostrar confirmación",
                hide: "Ocultar confirmación",
              }}
              compact
            />
            {passwordsMatch && (
              <p className="flex items-center gap-1.5 text-small text-success">
                <Check size={14} />
                Coinciden
              </p>
            )}
          </div>
        </div>

        <PasswordStrengthMeter password={password} />

        <div className="grid gap-1.5 rounded-lg border border-border bg-background/60 p-2 sm:grid-cols-2">
          <label className="flex gap-2 text-small text-muted">
            <input
              name="adultDeclaration"
              type="checkbox"
              required
              aria-invalid={Boolean(fieldErrors.legal)}
              aria-describedby={fieldErrors.legal ? "legal-error" : undefined}
              className="mt-0.5 h-4 w-4 accent-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
            />
            <span>Declaro que tengo 18 años o más.</span>
          </label>
          <label className="flex gap-2 text-small text-muted">
            <input
              name="acceptTerms"
              type="checkbox"
              required
              aria-invalid={Boolean(fieldErrors.legal)}
              aria-describedby={fieldErrors.legal ? "legal-error" : undefined}
              className="mt-0.5 h-4 w-4 accent-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
            />
            <span>
              Acepto los{" "}
              <Link
                href="/terminos-legales"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm font-semibold text-foreground underline-offset-4 hover:text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                términos</Link>
              {" "}y la{" "}
              <Link
                href="/privacidad"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm font-semibold text-foreground underline-offset-4 hover:text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                privacidad
              </Link>
              .
            </span>
          </label>
          {fieldErrors.legal && (
            <p id="legal-error" className="text-small text-danger sm:col-span-2">{fieldErrors.legal}</p>
          )}
        </div>

        <AuthFormMessage state={formState} />

        <button
          type="submit"
          disabled={formState.status === "loading"}
          className="btn-primary w-full rounded-lg px-5 py-2.5 text-small disabled:cursor-not-allowed disabled:opacity-70"
        >
          {formState.status === "loading" ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <p className="text-center text-small text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="rounded-sm font-semibold text-foreground hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary">
            Inicia sesión
          </Link>
        </p>
      </form>
    </>
  );
}
