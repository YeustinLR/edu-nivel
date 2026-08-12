import type { AdminBreadcrumb } from "@/modules/dashboard/components/admin/AdminPageHeader";

export {
  AdminPageHeader as ContentPageHeader,
  primaryActionClass,
  secondaryActionClass,
} from "@/modules/dashboard/components/admin/AdminPageHeader";
export type { AdminBreadcrumb as ContentBreadcrumb } from "@/modules/dashboard/components/admin/AdminPageHeader";

export const adminContentBreadcrumb = {
  label: "Contenido",
  href: "/dashboard/admin/content",
} satisfies AdminBreadcrumb;

export const adminCatalogBreadcrumbs = [
  adminContentBreadcrumb,
  { label: "Catálogo", href: "/dashboard/admin/content/catalog" },
] satisfies AdminBreadcrumb[];
