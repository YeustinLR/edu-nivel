import "server-only";

import { env } from "@/config/env";
import { userRoleLabels } from "@/modules/users/domain/user-role";
import { getEmailFrom, getResendClient } from "@/server/mail/resend";
import { UserInvitationEmail } from "@/server/mail/templates/user-invitation-email";

export async function sendUserInvitation({
  email,
  name,
  role,
  inviterName,
  token,
}: {
  email: string;
  name: string;
  role: keyof typeof userRoleLabels;
  inviterName: string;
  token: string;
}) {
  const invitationUrl = new URL(
    `/invitacion/${encodeURIComponent(token)}`,
    env.BETTER_AUTH_URL,
  ).toString();
  const { error } = await getResendClient().emails.send({
    from: getEmailFrom(),
    to: email,
    subject: "Te invitaron a EduNivel",
    react: UserInvitationEmail({
      name,
      inviterName,
      roleLabel: userRoleLabels[role],
      invitationUrl,
    }),
  });

  if (error) {
    throw new Error(error.message || "No se pudo enviar la invitación.");
  }
}
