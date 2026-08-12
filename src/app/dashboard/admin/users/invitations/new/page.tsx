import { AdminPageHeader } from "@/modules/dashboard/components/admin/AdminPageHeader";
import { CreateUserInvitationForm } from "@/modules/users/components/admin/CreateUserInvitationForm";
import { getAdminUserInvitationOptions } from "@/server/users/admin-user-editor-queries";

export default async function InviteAdminUserPage() {
  const levels = await getAdminUserInvitationOptions();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-4">
      <AdminPageHeader
        title="Invitar usuario"
        description="La persona definirá sus credenciales y condiciones legales desde un enlace seguro."
        breadcrumbs={[
          { label: "Panel", href: "/dashboard/admin" },
          { label: "Usuarios", href: "/dashboard/admin/users" },
          { label: "Invitar" },
        ]}
      />
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mx-auto w-full max-w-2xl">
          <CreateUserInvitationForm levels={levels} />
        </div>
      </section>
    </div>
  );
}
