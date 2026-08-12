import type { Metadata } from "next";
import Link from "next/link";

import AuthCard from "@/modules/auth/components/AuthCard";
import { AcceptUserInvitationForm } from "@/modules/users/components/invitations/AcceptUserInvitationForm";
import { redirectAuthenticatedUser } from "@/server/auth/redirect-authenticated-user";
import { getUserInvitationAcceptanceData } from "@/server/users/user-invitation-queries";

export const metadata: Metadata = { title: "Aceptar invitación" };

export default async function UserInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await redirectAuthenticatedUser();
  const { token } = await params;
  const invitation = await getUserInvitationAcceptanceData(token);

  if (invitation.status !== "pending") {
    const description =
      invitation.status === "expired"
        ? "Esta invitación expiró. Solicita al administrador que envíe una nueva."
        : invitation.status === "used"
          ? "Esta invitación ya fue utilizada. Puedes iniciar sesión con tu cuenta."
          : "Esta invitación no es válida o fue cancelada.";

    return (
      <AuthCard title="Invitación no disponible" subtitle={description}>
        <Link href="/login" className="btn-primary block w-full rounded-lg px-5 py-3 text-center text-small">
          Ir al inicio de sesión
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Completa tu cuenta"
      subtitle="Define tus credenciales para aceptar la invitación."
      className="mx-auto w-full max-w-xl"
      compact
    >
      <AcceptUserInvitationForm invitation={invitation} token={token} />
    </AuthCard>
  );
}
