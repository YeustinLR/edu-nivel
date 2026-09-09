"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AuthFormMessage from "@/modules/auth/components/AuthFormMessage";
import OtpInput from "@/modules/auth/components/OtpInput";
import { getAuthErrorMessage, getAuthRetryAfter } from "@/modules/auth/lib/auth-error-messages";
import { getSafeRedirect } from "@/modules/auth/lib/get-safe-redirect";
import { AUTH_VALIDATION_MESSAGES } from "@/modules/auth/lib/messages";
import {
  AUTH_OTP_RESEND_COOLDOWN_SECONDS,
  AUTH_OTP_SUCCESS_REDIRECT_DELAY_MS,
} from "@/modules/auth/lib/otp";
import { AUTH_SESSION_STORAGE_KEYS } from "@/modules/auth/lib/session-storage-keys";
import { useCountdown } from "@/modules/auth/lib/use-countdown";
import { useOtpInput } from "@/modules/auth/lib/use-otp-input";
import { verifyEmailSchema } from "@/modules/auth/schemas/verify-email.schema";
import { authClient } from "@/modules/auth/services/auth-client";
import type { AuthFormState } from "@/modules/auth/types/auth-form-state";

const VERIFIED_SUCCESS_MESSAGE =
  "Correo verificado correctamente. Tu cuenta ya esta activa. Seras redirigido al inicio de sesion.";

const initialState: AuthFormState = { status: "idle" };

export default function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = getSafeRedirect(searchParams.get("redirect"));
  // El correo llega via sessionStorage desde el registro o el login. Se lee en el
  // inicializador perezoso: este formulario se renderiza solo en cliente (la pagina
  // lo envuelve en Suspense por `useSearchParams`), asi que no hay riesgo de
  // desajuste de hidratacion.
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.sessionStorage.getItem(
      AUTH_SESSION_STORAGE_KEYS.emailVerification,
    ) ?? "";
  });
  const [formState, setFormState] = useState<AuthFormState>(initialState);
  const resendCooldown = useCountdown(0, AUTH_SESSION_STORAGE_KEYS.emailVerificationResend);
  const attemptCooldown = useCountdown(0, AUTH_SESSION_STORAGE_KEYS.emailVerificationAttempts);
  const otpInput = useOtpInput();

  const isBusy = formState.status === "loading" || formState.status === "success";

  useEffect(() => {
    if (formState.status !== "done") {
      return;
    }

    const timer = window.setTimeout(() => {
      window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEYS.emailVerification);
      const loginUrl = redirectUrl === "/dashboard"
        ? "/login"
        : `/login?redirect=${encodeURIComponent(redirectUrl)}`;
      router.replace(loginUrl);
    }, AUTH_OTP_SUCCESS_REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [formState.status, redirectUrl, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = verifyEmailSchema.safeParse({ email, otp: otpInput.otp });

    if (!parsed.success) {
      setFormState({
        status: "error",
        message: parsed.error.issues[0]?.message ?? AUTH_VALIDATION_MESSAGES.defaultFormError,
      });
      return;
    }

    setFormState({ status: "loading" });

    const { error } = await authClient.emailOtp.verifyEmail({
      email: parsed.data.email,
      otp: parsed.data.otp,
    });

    if (error) {
      const retryAfter = getAuthRetryAfter(error);
      if (retryAfter) attemptCooldown.start(retryAfter);
      setFormState({
        status: "error",
        message: getAuthErrorMessage(error, "No se pudo verificar el codigo."),
      });
      return;
    }

    setFormState({ status: "done", message: VERIFIED_SUCCESS_MESSAGE });
  }

  async function handleResend() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || isBusy || resendCooldown.isActive) {
      return;
    }

    setFormState({ status: "loading" });

    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: normalizedEmail,
      type: "email-verification",
    });

    if (error) {
      const retryAfter = getAuthRetryAfter(error);
      if (retryAfter) resendCooldown.start(retryAfter);
      setFormState({
        status: "error",
        message: getAuthErrorMessage(error, "No se pudo reenviar el codigo."),
      });
      return;
    }

    otpInput.reset();
    resendCooldown.start(AUTH_OTP_RESEND_COOLDOWN_SECONDS);
    setFormState({
      status: "success",
      message: "Enviamos un codigo nuevo. El codigo anterior dejo de ser valido.",
    });

    window.setTimeout(() => {
      setFormState((current) => (
        current.status === "success" ? initialState : current
      ));
    }, 2500);
  }

  if (formState.status === "done") {
    return (
      <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-center">
        <p className="text-small font-semibold text-success">{formState.message}</p>
      </div>
    );
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
          value={email}
          disabled={isBusy}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-body text-foreground outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-70"
          placeholder="tu@correo.com"
        />
      </div>

      <div className="space-y-3">
        <label className="text-small font-semibold text-foreground">
          Codigo de verificacion
        </label>
        <OtpInput
          digits={otpInput.digits}
          inputRefs={otpInput.inputRefs}
          disabled={isBusy}
          onDigitChange={otpInput.handleDigitChange}
          onKeyDown={otpInput.handleKeyDown}
          onPaste={otpInput.handlePaste}
        />
      </div>

      <AuthFormMessage state={formState} />

      <button
        type="submit"
        disabled={isBusy || attemptCooldown.isActive}
        className="btn-primary w-full rounded-lg px-5 py-3 text-small disabled:cursor-not-allowed disabled:opacity-70"
      >
        {formState.status === "loading"
          ? "Verificando..."
          : attemptCooldown.isActive
            ? `Intentar de nuevo en ${attemptCooldown.secondsLeft}s`
            : "Verificar correo"}
      </button>

      <button
        type="button"
        disabled={isBusy || resendCooldown.isActive || !email.trim()}
        onClick={handleResend}
        className="w-full rounded-lg border border-border px-5 py-3 text-small font-semibold text-foreground transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {resendCooldown.isActive
          ? `Reenviar codigo en ${resendCooldown.secondsLeft}s`
          : "Reenviar codigo"}
      </button>
    </form>
  );
}
