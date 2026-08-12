"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import AuthFormMessage from "@/modules/auth/components/AuthFormMessage";
import { getAuthErrorMessage } from "@/modules/auth/lib/auth-error-messages";
import { AUTH_VALIDATION_MESSAGES } from "@/modules/auth/lib/messages";
import { AUTH_SESSION_STORAGE_KEYS } from "@/modules/auth/lib/session-storage-keys";
import { forgotPasswordSchema } from "@/modules/auth/schemas/forgot-password.schema";
import { authClient } from "@/modules/auth/services/auth-client";
import type { AuthFormState } from "@/modules/auth/types/auth-form-state";

const initialState: AuthFormState = { status: "idle" };

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [formState, setFormState] = useState<AuthFormState>(initialState);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState({ status: "loading" });

    const formData = new FormData(event.currentTarget);
    const parsed = forgotPasswordSchema.safeParse({
      email: formData.get("email"),
    });

    if (!parsed.success) {
      setFormState({
        status: "error",
        message: parsed.error.issues[0]?.message ?? AUTH_VALIDATION_MESSAGES.defaultFormError,
      });
      return;
    }

    const { error } = await authClient.emailOtp.requestPasswordReset({
      email: parsed.data.email,
    });

    if (error) {
      setFormState({
        status: "error",
        message: getAuthErrorMessage(error, "No se pudo enviar el codigo."),
      });
      return;
    }

    window.sessionStorage.setItem(
      AUTH_SESSION_STORAGE_KEYS.passwordReset,
      parsed.data.email,
    );
    router.replace("/restablecer-contrasena");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-small font-semibold text-foreground">
          Correo electronico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={formState.status === "loading"}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-body text-foreground outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-70"
          placeholder="tu@correo.com"
        />
      </div>

      <AuthFormMessage state={formState} />

      <button
        type="submit"
        disabled={formState.status === "loading"}
        className="btn-primary w-full rounded-lg px-5 py-3 text-small disabled:cursor-not-allowed disabled:opacity-70"
      >
        {formState.status === "loading" ? "Enviando codigo..." : "Enviar codigo"}
      </button>
    </form>
  );
}
