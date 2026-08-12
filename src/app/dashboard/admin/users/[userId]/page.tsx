import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AdminPageHeader,
  secondaryActionClass,
} from "@/modules/dashboard/components/admin/AdminPageHeader";
import { AdminUserDetailView } from "@/modules/users/components/admin/AdminUserDetailView";
import { getAdminUserDetail } from "@/server/users/admin-user-detail-queries";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = await getAdminUserDetail(userId);

  if (!user) notFound();

  const userHref = `/dashboard/admin/users/${encodeURIComponent(user.id)}`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-4">
      <AdminPageHeader
        title={user.name}
        description="Resumen administrativo de la cuenta, su actividad y relaciones principales."
        breadcrumbs={[
          { label: "Panel", href: "/dashboard/admin" },
          { label: "Usuarios", href: "/dashboard/admin/users" },
          { label: user.name },
        ]}
        actions={
          <>
            <Link href="/dashboard/admin/users" className={secondaryActionClass}>
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Volver a usuarios
            </Link>
            <Link href={`${userHref}/edit`} className={secondaryActionClass}>
              <Pencil aria-hidden="true" className="h-4 w-4" />
              Editar usuario
            </Link>
          </>
        }
      />

      <AdminUserDetailView user={user} />
    </div>
  );
}
