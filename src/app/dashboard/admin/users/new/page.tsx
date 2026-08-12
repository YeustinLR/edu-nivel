import { AdminPageHeader } from "@/modules/dashboard/components/admin/AdminPageHeader";
import { CreateAdminUserForm } from "@/modules/users/components/admin/CreateAdminUserForm";
import { getAdminUserInvitationOptions } from "@/server/users/admin-user-editor-queries";

export default async function CreateAdminUserPage() {
  const levels = await getAdminUserInvitationOptions();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-4">
      <AdminPageHeader
        title="Crear usuario"
        description="Crea una cuenta verificada con una contraseña temporal y acceso inicial controlado."
        breadcrumbs={[
          { label: "Panel", href: "/dashboard/admin" },
          { label: "Usuarios", href: "/dashboard/admin/users" },
          { label: "Crear" },
        ]}
      />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mx-auto w-full max-w-2xl">
          <CreateAdminUserForm levels={levels} />
        </div>
      </section>
    </div>
  );
}
