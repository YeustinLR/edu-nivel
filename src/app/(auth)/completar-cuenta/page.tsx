import type { Metadata } from "next";

import AuthCard from "@/modules/auth/components/AuthCard";
import { CompleteAdminCreatedAccountForm } from "@/modules/users/components/onboarding/CompleteAdminCreatedAccountForm";
import { requireAccountSetupUser } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Completar cuenta" };

export default async function CompleteAccountPage() {
  const { user } = await requireAccountSetupUser();

  return (
    <AuthCard
      title="Completa tu cuenta"
      subtitle="Antes de acceder, protege tus credenciales y confirma las condiciones de uso."
      className="mx-auto w-full max-w-2xl"
    >
      <CompleteAdminCreatedAccountForm
        passwordChangeRequired={user.passwordChangeRequired}
      />
    </AuthCard>
  );
}
