"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  AccountFeedback,
  AccountFieldError,
  type AccountFeedbackState,
} from "@/modules/account/components/AccountFeedback";
import { profileNameSchema } from "@/modules/account/schemas/profile-name.schema";
import { useAutoDismissFeedback } from "@/modules/account/hooks/use-auto-dismiss-feedback";
import { getAuthErrorMessage } from "@/modules/auth/lib/auth-error-messages";
import { authClient } from "@/modules/auth/services/auth-client";

const initialFeedback: AccountFeedbackState = { status: "idle" };

export function ProfileNameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [nameError, setNameError] = useState<string>();
  const [feedback, setFeedback] = useState<AccountFeedbackState>(initialFeedback);
  const errorId = useId();
  const feedbackId = useId();
  const isPending = feedback.status === "loading";
  useAutoDismissFeedback(feedback, setFeedback);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = profileNameSchema.safeParse(name);

    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message ?? "Revisa tu nombre.");
      setFeedback({ status: "error", message: "Revisa el campo indicado." });
      return;
    }

    setNameError(undefined);
    if (parsed.data === initialName) {
      setName(parsed.data);
      setFeedback({ status: "success", message: "Tu nombre ya está actualizado." });
      return;
    }

    setFeedback({ status: "loading" });
    const { error } = await authClient.updateUser({ name: parsed.data });

    if (error) {
      setFeedback({
        status: "error",
        message: getAuthErrorMessage(error, "No se pudo actualizar tu nombre."),
      });
      return;
    }

    setName(parsed.data);
    setFeedback({ status: "success", message: "Nombre actualizado correctamente." });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="profile-name" className="text-sm font-semibold text-foreground">
          Nombre completo
        </label>
        <input
          id="profile-name"
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={100}
          value={name}
          disabled={isPending}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? errorId : undefined}
          onChange={(event) => {
            setName(event.target.value);
            if (nameError) setNameError(undefined);
          }}
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-foreground outline-none transition focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/25 disabled:cursor-not-allowed disabled:opacity-65"
        />
        <AccountFieldError id={errorId} message={nameError} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AccountFeedback state={feedback} id={feedbackId} />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-semibold text-white transition hover:bg-secondary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-60 sm:ml-auto"
        >
          {isPending ? "Guardando…" : "Guardar nombre"}
        </button>
      </div>
    </form>
  );
}
