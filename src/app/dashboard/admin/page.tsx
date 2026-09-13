import { Suspense } from "react";

import { AdminDashboardOverview } from "@/modules/dashboard/components/admin/AdminDashboardOverview";
import { getAdminDashboardSummary } from "@/server/dashboard/admin-dashboard-queries";

function AdminDashboardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando panel principal"
      className="mx-auto w-full max-w-6xl animate-pulse space-y-7 pb-8"
    >
      <div className="space-y-3">
        <div className="h-3 w-28 rounded-full bg-surface-elevated" />
        <div className="h-8 w-64 rounded-lg bg-surface-elevated" />
        <div className="h-4 max-w-xl rounded bg-surface-elevated" />
      </div>
      <div className="h-48 rounded-2xl border border-border bg-card" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-40 rounded-2xl border border-border bg-card" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="h-72 rounded-2xl border border-border bg-card lg:col-span-8" />
        <div className="h-72 rounded-2xl border border-border bg-card lg:col-span-4" />
      </div>
    </div>
  );
}

async function AdminDashboardData() {
  const summary = await getAdminDashboardSummary();
  return <AdminDashboardOverview summary={summary} />;
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<AdminDashboardSkeleton />}>
      <AdminDashboardData />
    </Suspense>
  );
}
