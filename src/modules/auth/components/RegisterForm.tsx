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
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Check, ChevronDown, GraduationCap } from "lucide-react";

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
  const [ageDropdownOpen, setAgeDropdownOpen] = useState(false);
  const [selectedAge, setSelectedAge] = useState<string>("");
  const ageDropdownRef = useRef<HTMLDivElement>(null);

  const closeAgeDropdown = useCallback(() => setAgeDropdownOpen(false), []);

  useEffect(() => {
    if (!ageDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (ageDropdownRef.current && !ageDropdownRef.current.contains(e.target as Node)) {
        closeAgeDropdown();
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [ageDropdownOpen, closeAgeDropdown]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (ageDropdownOpen && e.key === "Escape") closeAgeDropdown();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [ageDropdownOpen, closeAgeDropdown]);

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

    // Los sellos de consentimiento (terminos, privacidad, verificacion de edad) los
    // estampa el servidor en el hook de creacion del usuario; no se envian desde aqui.
    const { error } = await authClient.signUp.email({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      ageDeclared: parsed.data.ageDeclared,
      role: parsed.data.role,
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

    const verifyUrl = redirectUrl === "/dashboard"
      ? "/verify-email"
      : `/verify-email?redirect=${encodeURIComponent(redirectUrl)}`;

    router.replace(verifyUrl);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <fieldset className="space-y-1">
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
                    className="peer sr-only"
                  />
                  <span className="flex h-full gap-2 rounded-lg border border-border bg-background p-2.5 transition hover:border-accent/60 peer-checked:border-accent peer-checked:bg-accent/10 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
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
            <p className="text-small text-red-500">{fieldErrors.role}</p>
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
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-body text-foreground outline-none transition focus:border-accent"
              placeholder="Tu nombre"
            />
            {fieldErrors.name && (
              <p className="text-small text-red-500">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ageDeclared" className="text-small font-semibold text-foreground">
              Edad
            </label>
            <div ref={ageDropdownRef} className="relative">
              <input type="hidden" name="ageDeclared" value={selectedAge} />
              <button
                type="button"
                onClick={() => setAgeDropdownOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-body text-left outline-none transition focus:border-accent"
              >
                <span className={selectedAge ? "text-foreground" : "text-muted"}>
                  {selectedAge || "Selecciona tu edad"}
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-muted transition-transform ${ageDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {ageDropdownOpen && (
                <ul className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
                  {AGE_OPTIONS.map((age) => (
                    <li key={age}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAge(String(age));
                          setAgeDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-body transition hover:bg-accent/10 ${
                          String(age) === selectedAge ? "bg-accent/15 font-semibold text-accent" : "text-foreground"
                        }`}
                      >
                        {age}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {fieldErrors.ageDeclared && (
              <p className="text-small text-red-500">{fieldErrors.ageDeclared}</p>
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
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-body text-foreground outline-none transition focus:border-accent"
            placeholder="tu@correo.com"
          />
          {fieldErrors.email && (
            <p className="text-small text-red-500">{fieldErrors.email}</p>
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
            <input name="adultDeclaration" type="checkbox" required className="mt-0.5 h-4 w-4 accent-current" />
            <span>Declaro que tengo 18 años o más.</span>
          </label>
          <label className="flex gap-2 text-small text-muted">
            <input
              name="acceptTerms"
              type="checkbox"
              required
              className="mt-0.5 h-4 w-4 accent-current"
            />
            <span>
              Acepto los{" "}
              <Link
                href="/terminos-legales"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground underline-offset-4 hover:text-accent hover:underline"
              >
                terminos</Link>
              {" "}y la{" "}
              <Link
                href="/privacidad"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground underline-offset-4 hover:text-accent hover:underline"
              >
                privacidad
              </Link>
              .
            </span>
          </label>
          {fieldErrors.legal && (
            <p className="text-small text-red-500 sm:col-span-2">{fieldErrors.legal}</p>
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
          <Link href="/login" className="font-semibold text-foreground hover:text-accent">
            Inicia sesión
          </Link>
        </p>
      </form>
    </>
  );
}
