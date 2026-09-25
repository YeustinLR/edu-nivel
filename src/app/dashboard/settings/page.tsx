import { Role } from "@/generated/prisma/enums";
import { AccountSettings } from "@/modules/account/components/AccountSettings";
import { AdminPageHeader } from "@/modules/dashboard/components/admin/AdminPageHeader";
import { LearnerPageHeader } from "@/modules/dashboard/components/learner/LearnerPageHeader";
import { getAccountSettingsData } from "@/server/account/account-settings-queries";

export default async function SettingsPage() {
  const data = await getAccountSettingsData();
  const usesLearnerShell = data.user.role === Role.STUDENT || data.user.role === Role.TEACHER;

  return (
    <div className="space-y-7">
      {usesLearnerShell ? (
        <LearnerPageHeader
          eyebrow="Tu cuenta"
          title="Configuración"
          description="Administra tu información, seguridad, sesiones y apariencia."
        />
      ) : (
        <AdminPageHeader
          eyebrow="Tu cuenta"
          title="Configuración"
          description="Administra tu información, seguridad, sesiones y apariencia."
        />
      )}

      <AccountSettings
        user={data.user}
        initialSessionAccess={data.sessionAccess}
        initialCurrentSessionToken={data.currentSessionToken}
      />
    </div>
  );
}
