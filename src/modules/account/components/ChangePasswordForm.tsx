"use client";

import { useId, useState, type FormEvent } from "react";

import {
  AccountFeedback,
  AccountFieldError,
  type AccountFeedbackState,
} from "@/modules/account/components/AccountFeedback";
import { changePasswordSchema } from "@/modules/account/schemas/change-password.schema";
import { useAutoDismissFeedback } from "@/modules/account/hooks/use-auto-dismiss-feedback";
import PasswordField from "@/modules/auth/components/PasswordField";
import PasswordStrengthMeter from "@/modules/auth/components/PasswordStrengthMeter";
import { getAuthErrorMessage } from "@/modules/auth/lib/auth-error-messages";
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_MIN_LENGTH_PLACEHOLDER,
} from "@/modules/auth/lib/password";
import { authClient } from "@/modules/auth/services/auth-client";

type PasswordFieldName = "currentPassword" | "newPassword" | "confirmPassword";
type PasswordErrors = Partial<Record<PasswordFieldName, string>>;

const initialFeedback: AccountFeedbackState = { status: "idle" };

export function ChangePasswordForm({
  email,
  onSessionsChanged,
}: {
  email: string;
  onSessionsChanged: (newCurrentToken?: string | null) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [feedback, setFeedback] = useState<AccountFeedbackState>(initialFeedback);
  const feedbackId = useId();
  const currentErrorId = useId();
  const newErrorId = useId();
  const confirmErrorId = useId();
  const isPending = feedback.status === "loading";
  useAutoDismissFeedback(feedback, setFeedback);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
      email,
      revokeOtherSessions,
    });

    if (!parsed.success) {
      const nextErrors: PasswordErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as PasswordFieldName;
        if (["currentPassword", "newPassword", "confirmPassword"].includes(field)) {
          nextErrors[field] ??= issue.message;
        }
      }
      setErrors(nextErrors);
      setFeedback({ status: "error", message: "Revisa los campos indicados." });
      return;
    }

    setErrors({});
    setFeedback({ status: "loading" });
    const { data, error } = await authClient.changePassword({
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
      revokeOtherSessions: parsed.data.revokeOtherSessions,
    });

    if (error) {
      setFeedback({
        status: "error",
        message: getAuthErrorMessage(error, "No se pudo cambiar la contraseña."),
      });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setFeedback({ status: "success", message: "Contraseña actualizada correctamente." });
    onSessionsChanged(data?.token);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <PasswordField
          id="current-password"
          name="currentPassword"
          label="Contraseña actual"
          autoComplete="current-password"
          value={currentPassword}
          disabled={isPending}
          onChange={(value) => {
            setCurrentPassword(value);
            if (errors.currentPassword) setErrors((current) => ({ ...current, currentPassword: undefined }));
          }}
          invalid={Boolean(errors.currentPassword)}
          describedBy={errors.currentPassword ? currentErrorId : undefined}
          compact
        />
        <AccountFieldError id={currentErrorId} message={errors.currentPassword} />
      </div>

      <div>
        <PasswordField
          id="new-password"
          name="newPassword"
          label="Nueva contraseña"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          value={newPassword}
          disabled={isPending}
          onChange={(value) => {
            setNewPassword(value);
            if (errors.newPassword) setErrors((current) => ({ ...current, newPassword: undefined }));
          }}
          invalid={Boolean(errors.newPassword)}
          describedBy={errors.newPassword ? newErrorId : undefined}
          placeholder={PASSWORD_MIN_LENGTH_PLACEHOLDER}
          compact
        />
        <AccountFieldError id={newErrorId} message={errors.newPassword} />
        <div className="mt-2">
          <PasswordStrengthMeter password={newPassword} />
        </div>
      </div>

      <div>
        <PasswordField
          id="confirm-new-password"
          name="confirmPassword"
          label="Confirmar nueva contraseña"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          value={confirmPassword}
          disabled={isPending}
          onChange={(value) => {
            setConfirmPassword(value);
            if (errors.confirmPassword) setErrors((current) => ({ ...current, confirmPassword: undefined }));
          }}
          invalid={Boolean(errors.confirmPassword)}
          describedBy={errors.confirmPassword ? confirmErrorId : undefined}
          compact
          toggleLabels={{ show: "Mostrar confirmación", hide: "Ocultar confirmación" }}
        />
        <AccountFieldError id={confirmErrorId} message={errors.confirmPassword} />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface/60 p-3 text-sm text-foreground">
        <input
          type="checkbox"
          checked={revokeOtherSessions}
          disabled={isPending}
          onChange={(event) => setRevokeOtherSessions(event.target.checked)}
          className="mt-0.5 size-4 accent-secondary"
        />
        <span>
          <span className="block font-semibold">Cerrar las demás sesiones</span>
          <span className="mt-0.5 block text-xs leading-5 text-muted">
            Recomendado si cambias la contraseña por seguridad.
          </span>
        </span>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AccountFeedback state={feedback} id={feedbackId} />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-semibold text-white transition hover:bg-secondary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-60 sm:ml-auto"
        >
          {isPending ? "Actualizando…" : "Cambiar contraseña"}
        </button>
      </div>
    </form>
  );
}
