import { Suspense } from "react";
import { MailPlus, UserPlus } from "lucide-react";
import Link from "next/link";

import {
  AdminPageHeader,
  primaryActionClass,
} from "@/modules/dashboard/components/admin/AdminPageHeader";
import { AdminUrlSearchField } from "@/modules/dashboard/components/admin/AdminUrlSearchField";
import { AdminUrlSelectFilter } from "@/modules/dashboard/components/admin/AdminUrlSelectFilter";
import {
  AdminPendingInvitations,
  AdminPendingInvitationsSkeleton,
} from "@/modules/users/components/admin/AdminPendingInvitations";
import {
  AdminUsersList,
  AdminUsersListSkeleton,
} from "@/modules/users/components/admin/AdminUsersList";
import { adminUserRoleOptions } from "@/modules/users/domain/user-role";
import {
  type AdminUsersSearchParams,
  parseAdminUsersSearchParams,
} from "@/modules/users/schemas/admin-users.schema";

const verificationOptions = [
  { value: "verified", label: "Verificados" },
  { value: "unverified", label: "Sin verificar" },
] as const;

const sortOptions = [
  { value: "oldest", label: "Más antiguos" },
  { value: "name", label: "Nombre A–Z" },
] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<AdminUsersSearchParams>;
}) {
  const rawSearchParams = await searchParams;
  const filters = parseAdminUsersSearchParams(rawSearchParams);
  const resultsKey = [
    filters.query,
    filters.role ?? "all",
    filters.verification ?? "all",
    filters.sort,
    filters.page,
  ].join(":");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-4">
      <AdminPageHeader
        title="Usuarios"
        description="Consulta las cuentas registradas y encuentra rápidamente a cada persona por nombre, correo, rol o verificación."
        breadcrumbs={[
          { label: "Panel", href: "/dashboard/admin" },
          { label: "Usuarios" },
        ]}
        actions={<>
          <Link href="/dashboard/admin/users/invitations/new" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated">
            <MailPlus aria-hidden="true" className="h-4 w-4" />
            Invitar usuario
          </Link>
          <Link href="/dashboard/admin/users/new" className={primaryActionClass}>
            <UserPlus aria-hidden="true" className="h-4 w-4" />
            Crear usuario
          </Link>
        </>}
      />

      {rawSearchParams.deleted === "1" ? (
        <p role="status" className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          El usuario fue eliminado y sus datos personales se anonimizaron.
        </p>
      ) : null}

      <Suspense fallback={<AdminPendingInvitationsSkeleton />}>
        <AdminPendingInvitations />
      </Suspense>

      <section
        aria-label="Filtros de usuarios"
        className="rounded-xl border border-border bg-card p-4 sm:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminUrlSearchField
            parameter="q"
            initialValue={filters.query}
            label="Buscar"
            placeholder="Nombre o correo"
          />
          <AdminUrlSelectFilter
            parameter="role"
            value={filters.role}
            label="Rol"
            allLabel="Todos los roles"
            options={adminUserRoleOptions}
          />
          <AdminUrlSelectFilter
            parameter="verification"
            value={filters.verification}
            label="Verificación"
            allLabel="Todos"
            options={verificationOptions}
          />
          <AdminUrlSelectFilter
            parameter="sort"
            value={filters.sort === "newest" ? undefined : filters.sort}
            label="Ordenar"
            allLabel="Más recientes"
            options={sortOptions}
          />
        </div>
      </section>

      <Suspense key={resultsKey} fallback={<AdminUsersListSkeleton />}>
        <AdminUsersList filters={filters} />
      </Suspense>
    </div>
  );
}
