import { CheckCircle2, Eye, SearchX, UserRound, XCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import { AdminPagination } from "@/modules/dashboard/components/admin/AdminPagination";
import { userRoleLabels } from "@/modules/users/domain/user-role";
import { isUserCurrentlySuspended } from "@/modules/users/domain/user-suspension";
import {
  ADMIN_USERS_PAGE_SIZE,
  type ParsedAdminUsersSearchParams,
  buildAdminUsersHref,
} from "@/modules/users/schemas/admin-users.schema";
import { getAdminUsersPage } from "@/server/users/admin-user-list-queries";

const dateFormatter = new Intl.DateTimeFormat("es-CR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function roleBadgeClass(role: Role) {
  if (role === Role.ADMIN) {
    return "bg-amber-500/10 text-amber-800 dark:text-amber-200";
  }
  if (role === Role.COLLABORATOR) {
    return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
  }
  return "bg-secondary/10 text-secondary";
}

function VerificationBadge({
  verified,
  adminCreatedAt,
}: {
  verified: boolean;
  adminCreatedAt?: Date | null;
}) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
      <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
      {adminCreatedAt ? "Por administrador" : "Verificado"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
      <XCircle aria-hidden="true" className="h-3.5 w-3.5" />
      Sin verificar
    </span>
  );
}

export function AdminUsersListSkeleton() {
  return (
    <section
      aria-label="Cargando usuarios"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <span className="sr-only">Cargando usuarios</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-[72px] animate-pulse border-b border-border bg-surface/60 last:border-0"
        />
      ))}
    </section>
  );
}

export async function AdminUsersList({
  filters,
}: {
  filters: ParsedAdminUsersSearchParams;
}) {
  const result = await getAdminUsersPage({
    ...filters,
    pageSize: ADMIN_USERS_PAGE_SIZE,
  });

  if (filters.page > result.totalPages) {
    redirect(buildAdminUsersHref(filters, 1));
  }

  if (result.items.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-card px-5 py-14 text-center">
        <SearchX aria-hidden="true" className="mx-auto h-10 w-10 text-muted" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          No encontramos usuarios
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Ajusta la búsqueda o los filtros para consultar otros registros.
        </p>
      </section>
    );
  }

  const firstItem = (filters.page - 1) * ADMIN_USERS_PAGE_SIZE + 1;
  const lastItem = Math.min(
    filters.page * ADMIN_USERS_PAGE_SIZE,
    result.totalItems,
  );

  return (
    <section
      aria-labelledby="users-list-heading"
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <h2 id="users-list-heading" className="font-semibold text-foreground">
          Usuarios registrados
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Mostrando {firstItem}–{lastItem} de {result.totalItems}
        </p>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-surface/70 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">Usuario</th>
              <th scope="col" className="px-4 py-3 font-medium">Rol</th>
              <th scope="col" className="px-4 py-3 font-medium">Verificación</th>
              <th scope="col" className="px-4 py-3 font-medium">Nivel</th>
              <th scope="col" className="px-4 py-3 font-medium">Registro</th>
              <th scope="col" className="w-14 px-4 py-3 font-medium">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.items.map((user) => (
              <tr key={user.id} className="hover:bg-surface/50">
                <td className="px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-sm font-semibold text-secondary">
                      {user.name.charAt(0).toLocaleUpperCase("es-CR")}
                    </span>
                    <span className="min-w-0">
                      <Link
                        href={`/dashboard/admin/users/${encodeURIComponent(user.id)}`}
                        className="block truncate font-medium text-foreground hover:text-secondary hover:underline"
                      >
                        {user.name}
                      </Link>
                      <span className="block truncate text-xs text-muted">
                        {user.email}
                      </span>
                      {isUserCurrentlySuspended(user) ? (
                        <span className="mt-1 inline-flex rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:text-red-300">
                          Suspendido
                        </span>
                      ) : null}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass(user.role)}`}>
                    {userRoleLabels[user.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <VerificationBadge verified={user.emailVerified} adminCreatedAt={user.adminCreatedAt} />
                    {user.setupPending ? <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">Configuración pendiente</span> : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">
                  {user.selectedLevelNumber
                    ? `Nivel ${user.selectedLevelNumber}`
                    : "Sin seleccionar"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  {dateFormatter.format(user.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/admin/users/${encodeURIComponent(user.id)}`}
                    aria-label={`Ver detalle de ${user.name}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                  >
                    <Eye aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {result.items.map((user) => (
          <li key={user.id}>
            <Link
              href={`/dashboard/admin/users/${encodeURIComponent(user.id)}`}
              aria-label={`Ver detalle de ${user.name}`}
              className="block space-y-3 p-4 transition-colors hover:bg-surface/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                  <UserRound aria-hidden="true" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{user.name}</p>
                  <p className="truncate text-sm text-muted">{user.email}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass(user.role)}`}>
                  {userRoleLabels[user.role]}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <VerificationBadge verified={user.emailVerified} adminCreatedAt={user.adminCreatedAt} />
                {user.setupPending ? (
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-800 dark:text-amber-200">Configuración pendiente</span>
                ) : null}
                {isUserCurrentlySuspended(user) ? (
                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 font-medium text-red-700 dark:text-red-300">
                    Suspendido
                  </span>
                ) : null}
                <span>
                  {user.selectedLevelNumber
                    ? `Nivel ${user.selectedLevelNumber}`
                    : "Sin nivel"}
                </span>
                <span aria-hidden="true">·</span>
                <span>{dateFormatter.format(user.createdAt)}</span>
                <Eye aria-hidden="true" className="ml-auto h-4 w-4" />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {result.totalPages > 1 ? (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm text-muted">
            {result.totalItems} usuarios en esta vista
          </p>
          <AdminPagination
            page={filters.page}
            totalPages={result.totalPages}
            previousHref={
              filters.page > 1
                ? buildAdminUsersHref(filters, filters.page - 1)
                : undefined
            }
            nextHref={
              filters.page < result.totalPages
                ? buildAdminUsersHref(filters, filters.page + 1)
                : undefined
            }
            ariaLabel="Paginación de usuarios"
          />
        </div>
      ) : null}
    </section>
  );
}
