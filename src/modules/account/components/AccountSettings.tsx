"use client";

import { KeyRound, Mail, MonitorCog, Palette, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";

import { ChangePasswordForm } from "@/modules/account/components/ChangePasswordForm";
import { ProfileNameForm } from "@/modules/account/components/ProfileNameForm";
import { SessionManager } from "@/modules/account/components/SessionManager";
import type { AccountSessionAccess } from "@/modules/account/types/account-session";
import { ThemeToggle } from "@/modules/dashboard/components/layout/ThemeToggle";

const roleLabels: Record<string, string> = {
  STUDENT: "Estudiante",
  TEACHER: "Docente",
  COLLABORATOR: "Colaborador",
  ADMIN: "Administrador",
};

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-background p-5 shadow-[0_5px_22px_rgba(15,23,42,0.035)] sm:p-6">
      <div className="flex items-start gap-3 border-b border-border pb-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm leading-5 text-muted">{description}</p>
        </div>
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

export function AccountSettings({
  user,
  initialSessionAccess,
  initialCurrentSessionToken,
}: {
  user: {
    name: string;
    email: string;
    emailVerified: boolean;
    role: string;
    selectedLevelNumber: number | null;
  };
  initialSessionAccess: AccountSessionAccess;
  initialCurrentSessionToken: string | null;
}) {
  const [currentSessionToken, setCurrentSessionToken] = useState(initialCurrentSessionToken);
  const [sessionRefreshVersion, setSessionRefreshVersion] = useState(0);

  function handleSessionsChanged(newCurrentToken?: string | null) {
    if (newCurrentToken) setCurrentSessionToken(newCurrentToken);
    setSessionRefreshVersion((current) => current + 1);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SettingsCard
        icon={UserRound}
        title="Información personal"
        description="Actualiza el nombre que mostramos en EduNivel."
      >
        <div className="space-y-5">
          <ProfileNameForm initialName={user.name} />
          <dl className="grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
            <div className="rounded-lg bg-surface/60 p-3">
              <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                <Mail aria-hidden="true" className="size-3.5" /> Correo
              </dt>
              <dd className="mt-1 break-all text-sm font-semibold text-foreground">{user.email}</dd>
              <dd className="mt-1 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                {user.emailVerified ? "Correo verificado" : "Verificación pendiente"}
              </dd>
            </div>
            <div className="rounded-lg bg-surface/60 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Cuenta</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {roleLabels[user.role] ?? user.role}
              </dd>
              {user.selectedLevelNumber !== null ? (
                <dd className="mt-1 text-xs text-muted">Nivel actual: {user.selectedLevelNumber}</dd>
              ) : null}
            </div>
          </dl>
        </div>
      </SettingsCard>

      <SettingsCard
        icon={KeyRound}
        title="Contraseña"
        description="Usa una contraseña única y cierra accesos que ya no reconozcas."
      >
        <ChangePasswordForm email={user.email} onSessionsChanged={handleSessionsChanged} />
      </SettingsCard>

      <div className="xl:col-span-2">
        <SettingsCard
          icon={MonitorCog}
          title="Dispositivos y sesiones"
          description="Revisa dónde está abierta tu cuenta y cierra cualquier acceso desconocido."
        >
          <SessionManager
            email={user.email}
            initialAccess={initialSessionAccess}
            currentSessionToken={currentSessionToken}
            onCurrentSessionChanged={setCurrentSessionToken}
            refreshVersion={sessionRefreshVersion}
          />
        </SettingsCard>
      </div>

      <div className="xl:col-span-2">
        <SettingsCard
          icon={Palette}
          title="Apariencia"
          description="Elige cómo quieres ver EduNivel en este dispositivo."
        >
          <div className="max-w-sm rounded-lg border border-border bg-surface/60 p-2">
            <ThemeToggle />
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}
