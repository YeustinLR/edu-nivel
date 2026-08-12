import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/modules/dashboard/components/admin/AdminPageHeader";
import { EditAdminUserForm } from "@/modules/users/components/admin/EditAdminUserForm";
import { getAdminUserEditorContext } from "@/server/users/admin-user-editor-queries";

export default async function EditAdminUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { user, levels } = await getAdminUserEditorContext(userId);

  if (!user) notFound();

  const userHref = `/dashboard/admin/users/${encodeURIComponent(user.id)}`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-4">
      <AdminPageHeader
        title={`Editar ${user.name}`}
        description="Actualiza el perfil administrativo y sus permisos de acceso."
        breadcrumbs={[
          { label: "Panel", href: "/dashboard/admin" },
          { label: "Usuarios", href: "/dashboard/admin/users" },
          { label: user.name, href: userHref },
          { label: "Editar" },
        ]}
      />

      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mx-auto w-full max-w-2xl">
          <EditAdminUserForm
            user={{ ...user, updatedAt: user.updatedAt.toISOString() }}
            levels={levels}
          />
        </div>
      </section>
    </div>
  );
}
