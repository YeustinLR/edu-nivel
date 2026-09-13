/**
 * Responsabilidad del archivo:
 * - Implementar el inicio de sesion desde el cliente usando Better Auth.
 *
 * Papel en la arquitectura:
 * - Valida la entrada del usuario en el navegador.
 * - Envia las credenciales a `/api/auth/sign-in/email` mediante `authClient`.
 * - Si el login es exitoso, navega hacia la ruta segura indicada por el flujo de auth.
 *
 * Cuando participa:
 * - Cuando el proxy detecta que una ruta protegida no tiene sesion y redirige a `/login`.
 */
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import AuthFormMessage from "@/modules/auth/components/AuthFormMessage";
import PasswordField from "@/modules/auth/components/PasswordField";
import { getAuthErrorMessage } from "@/modules/auth/lib/auth-error-messages";
import { getPostLoginDestination } from "@/modules/auth/lib/dashboard-path";
import { getSafeRedirect } from "@/modules/auth/lib/get-safe-redirect";
import { AUTH_VALIDATION_MESSAGES } from "@/modules/auth/lib/messages";
import { AUTH_SESSION_STORAGE_KEYS } from "@/modules/auth/lib/session-storage-keys";
import { loginSchema } from "@/modules/auth/schemas/login.schema";
import { authClient } from "@/modules/auth/services/auth-client";
import type { AuthFormState } from "@/modules/auth/types/auth-form-state";

const initialState: AuthFormState = { status: "idle" };

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // La URL original queda preservada en `?redirect=...` por el proxy. Antes de usarla,
  // la saneamos para impedir redirecciones a dominios externos.
  const redirectUrl = getSafeRedirect(searchParams.get("redirect"));
  const [formState, setFormState] = useState<AuthFormState>(initialState);
  const [password, setPassword] = useState("");
  const [invalidFields, setInvalidFields] = useState<Set<"email" | "password">>(
    new Set(),
  );
  const hasError = formState.status === "error";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState({ status: "loading" });

    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      setInvalidFields(new Set(
        parsed.error.issues
          .map((issue) => issue.path[0])
          .filter((field): field is "email" | "password" => field === "email" || field === "password"),
      ));
      setFormState({
        status: "error",
        message: parsed.error.issues[0]?.message ?? AUTH_VALIDATION_MESSAGES.defaultFormError,
      });
      return;
    }

    setInvalidFields(new Set());

    const { data, error } = await authClient.signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) {
      const code = error.code ?? "";

      if (code.includes("EMAIL_NOT_VERIFIED")) {
        window.sessionStorage.setItem(
          AUTH_SESSION_STORAGE_KEYS.emailVerification,
          parsed.data.email,
        );
        router.replace(`/verify-email?redirect=${encodeURIComponent(redirectUrl)}`);
        return;
      }

      setFormState({
        status: "error",
        message: getAuthErrorMessage(error, "Correo o contraseña incorrectos."),
      });
      return;
    }

    // Para la entrada generica navegamos directamente al panel canonico del rol y evitamos
    // el render adicional producido por la redireccion server-side de `/dashboard`.
    // Los destinos especificos conservados por el proxy siguen teniendo prioridad.
    router.replace(
      getPostLoginDestination(redirectUrl, data?.user.role),
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-describedby={hasError ? "auth-form-message" : undefined}>
      <div className="space-y-2">
        <label htmlFor="email" className="text-small font-semibold text-foreground">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={invalidFields.has("email")}
          aria-describedby={hasError ? "auth-form-message" : undefined}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-body text-foreground outline-none transition focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          placeholder="tu@correo.com"
        />
      </div>

      <PasswordField
        id="password"
        name="password"
        label="Contraseña"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        placeholder="Tu contraseña"
        invalid={invalidFields.has("password")}
        describedBy={hasError ? "auth-form-message" : undefined}
      />

      <AuthFormMessage state={formState} />

      <button
        type="submit"
        disabled={formState.status === "loading"}
        className="btn-primary w-full rounded-lg px-5 py-3 text-small disabled:cursor-not-allowed disabled:opacity-70"
      >
        {formState.status === "loading" ? "Ingresando..." : "Iniciar sesión"}
      </button>

      <p className="text-center text-small">
        <Link href="/recuperar-contrasena" className="rounded-sm font-semibold text-foreground hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>

      <p className="text-center text-small text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="rounded-sm font-semibold text-foreground hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary">
          Regístrate
        </Link>
      </p>
    </form>
  );
}
