"use client";

import { Laptop, LogOut, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";

import {
  AccountFeedback,
  type AccountFeedbackState,
} from "@/modules/account/components/AccountFeedback";
import { describeSession } from "@/modules/account/domain/session-presentation";
import { useAutoDismissFeedback } from "@/modules/account/hooks/use-auto-dismiss-feedback";
import type {
  AccountSession,
  AccountSessionAccess,
} from "@/modules/account/types/account-session";
import PasswordField from "@/modules/auth/components/PasswordField";
import { getAuthErrorMessage } from "@/modules/auth/lib/auth-error-messages";
import { authClient } from "@/modules/auth/services/auth-client";

const initialFeedback: AccountFeedbackState = { status: "idle" };

function normalizeSession(session: {
  id: string;
  token: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  expiresAt: Date | string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): AccountSession {
  return {
    id: session.id,
    token: session.token,
    createdAt: new Date(session.createdAt).toISOString(),
    updatedAt: new Date(session.updatedAt).toISOString(),
    expiresAt: new Date(session.expiresAt).toISOString(),
    ipAddress: session.ipAddress ?? null,
    userAgent: session.userAgent ?? null,
  };
}

function sessionDate(value: string) {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isMobileSession(userAgent: string | null) {
  return Boolean(userAgent && /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent));
}

export function SessionManager({
  email,
  initialAccess,
  currentSessionToken,
  onCurrentSessionChanged,
  refreshVersion,
}: {
  email: string;
  initialAccess: AccountSessionAccess;
  currentSessionToken: string | null;
  onCurrentSessionChanged: (token: string) => void;
  refreshVersion: number;
}) {
  const router = useRouter();
  const [accessStatus, setAccessStatus] = useState(initialAccess.status);
  const [sessions, setSessions] = useState<AccountSession[]>(initialAccess.sessions);
  const [reauthPassword, setReauthPassword] = useState("");
  const [busyAction, setBusyAction] = useState<string>();
  const [feedback, setFeedback] = useState<AccountFeedbackState>(initialFeedback);
  const feedbackId = useId();
  useAutoDismissFeedback(feedback, setFeedback);

  useEffect(() => {
    if (refreshVersion === 0) return;

    let active = true;
    void authClient.listSessions().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        if (error.code === "SESSION_NOT_FRESH") {
          setAccessStatus("reauth-required");
          setSessions([]);
          return;
        }
        setFeedback({ status: "error", message: "La contraseña cambió, pero no se pudo actualizar la lista de sesiones." });
        return;
      }
      setAccessStatus("ready");
      setSessions((data ?? []).map(normalizeSession));
    });

    return () => {
      active = false;
    };
  }, [refreshVersion]);

  async function reauthenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reauthPassword) {
      setFeedback({ status: "error", message: "Ingresa tu contraseña actual." });
      return;
    }

    setBusyAction("reauth");
    setFeedback({ status: "loading" });
    const previousToken = currentSessionToken;
    const { data, error } = await authClient.signIn.email({
      email,
      password: reauthPassword,
    });

    if (error || !data?.token) {
      setBusyAction(undefined);
      setFeedback({
        status: "error",
        message: getAuthErrorMessage(
          error,
          "No se pudo confirmar tu identidad.",
        ),
      });
      return;
    }

    const freshToken = data.token;
    onCurrentSessionChanged(freshToken);
    if (previousToken && previousToken !== freshToken) {
      await authClient.revokeSession({ token: previousToken });
    }

    const listed = await authClient.listSessions();
    setBusyAction(undefined);
    if (listed.error) {
      setFeedback({
        status: "error",
        message: "Tu identidad fue confirmada, pero no pudimos cargar las sesiones.",
      });
      return;
    }

    setReauthPassword("");
    setSessions((listed.data ?? []).map(normalizeSession));
    setAccessStatus("ready");
    setFeedback({ status: "success", message: "Identidad confirmada correctamente." });
  }

  const sortedSessions = [...sessions].sort((left, right) => {
    const leftCurrent = left.token === currentSessionToken ? 1 : 0;
    const rightCurrent = right.token === currentSessionToken ? 1 : 0;
    return rightCurrent - leftCurrent || Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  });
  const otherSessions = sessions.filter((session) => session.token !== currentSessionToken);

  async function closeSession(session: AccountSession) {
    const isCurrent = session.token === currentSessionToken;
    setBusyAction(session.token);
    setFeedback({ status: "loading" });

    if (isCurrent) {
      const { error } = await authClient.signOut();
      if (error) {
        setBusyAction(undefined);
        setFeedback({ status: "error", message: "No se pudo cerrar la sesión actual." });
        return;
      }
      router.replace("/login");
      router.refresh();
      return;
    }

    const { error } = await authClient.revokeSession({ token: session.token });
    setBusyAction(undefined);
    if (error) {
      setFeedback({ status: "error", message: "No se pudo cerrar esa sesión." });
      return;
    }

    setSessions((current) => current.filter((item) => item.token !== session.token));
    setFeedback({ status: "success", message: "Sesión cerrada correctamente." });
  }

  async function closeOtherSessions() {
    setBusyAction("others");
    setFeedback({ status: "loading" });
    const { error } = await authClient.revokeOtherSessions();
    setBusyAction(undefined);

    if (error) {
      setFeedback({ status: "error", message: "No se pudieron cerrar las demás sesiones." });
      return;
    }

    setSessions((current) => current.filter((session) => session.token === currentSessionToken));
    setFeedback({ status: "success", message: "Las demás sesiones fueron cerradas." });
  }

  return (
    <div className="space-y-4">
      {accessStatus === "reauth-required" ? (
        <form
          onSubmit={reauthenticate}
          className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
        >
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Confirma tu identidad
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              Por seguridad, vuelve a ingresar tu contraseña para consultar y cerrar sesiones.
            </p>
          </div>
          <PasswordField
            id="session-reauth-password"
            name="sessionReauthPassword"
            label="Contraseña actual"
            autoComplete="current-password"
            value={reauthPassword}
            disabled={busyAction === "reauth"}
            onChange={setReauthPassword}
            compact
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <AccountFeedback state={feedback} id={feedbackId} />
            <button
              type="submit"
              disabled={busyAction === "reauth"}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-semibold text-white transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:ml-auto"
            >
              {busyAction === "reauth" ? "Confirmando…" : "Confirmar identidad"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="space-y-3" aria-label="Sesiones activas">
            {sortedSessions.length === 0 ? (
              <p className="rounded-lg border border-border bg-surface/60 p-4 text-sm text-muted">
                No se pudieron identificar sesiones activas.
              </p>
            ) : (
              sortedSessions.map((session) => {
                const isCurrent = session.token === currentSessionToken;
                const DeviceIcon = isMobileSession(session.userAgent)
                  ? Smartphone
                  : Laptop;
                return (
                  <article
                    key={session.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-surface/45 p-4 sm:flex-row sm:items-center"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                      <DeviceIcon aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {describeSession(session.userAgent)}
                        </h3>
                        {isCurrent ? (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                            Sesión actual
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        Última actividad:{" "}
                        <time dateTime={session.updatedAt}>
                          {sessionDate(session.updatedAt)}
                        </time>
                        {" · "}Vence:{" "}
                        <time dateTime={session.expiresAt}>
                          {sessionDate(session.expiresAt)}
                        </time>
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={() => void closeSession(session)}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-foreground transition hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <LogOut aria-hidden="true" className="size-4" />
                      {busyAction === session.token
                        ? "Cerrando…"
                        : isCurrent
                          ? "Cerrar sesión"
                          : "Cerrar"}
                    </button>
                  </article>
                );
              })
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <AccountFeedback state={feedback} id={feedbackId} />
            <button
              type="button"
              disabled={Boolean(busyAction) || otherSessions.length === 0}
              onClick={() => void closeOtherSessions()}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-red-500/30 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300 sm:ml-auto"
            >
              {busyAction === "others"
                ? "Cerrando…"
                : "Cerrar las demás sesiones"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
