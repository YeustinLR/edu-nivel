import { redirect } from "next/navigation";

import { AdminPaymentsOverview } from "@/modules/payments/components/AdminPaymentsOverview";
import {
  buildAdminPaymentsHref,
  parseAdminPaymentsSearchParams,
  type AdminPaymentsSearchParams,
} from "@/modules/payments/schemas/admin-payments.schema";
import { getAdminPaymentsSummary } from "@/server/payments/admin-payment-queries";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<AdminPaymentsSearchParams>;
}) {
  const filters = parseAdminPaymentsSearchParams(await searchParams);
  const summary = await getAdminPaymentsSummary(filters);

  if (filters.page > summary.history.totalPages) {
    redirect(buildAdminPaymentsHref(filters, 1));
  }

  return <AdminPaymentsOverview summary={summary} filters={filters} />;
}
