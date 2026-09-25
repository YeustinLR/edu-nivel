import {
  Bell,
  Bookmark,
  BookOpen,
  Clock3,
  Compass,
  CreditCard,
  FolderOpen,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  mobilePlacement?: "primary" | "more";
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export function partitionMobileNavigation(items: readonly NavItem[]) {
  return {
    primary: items.filter((item) => item.mobilePlacement === "primary"),
    more: items.filter((item) => item.mobilePlacement === "more"),
  };
}

export const navigationByRole: Record<string, NavGroup[]> = {
  STUDENT: [
    {
      title: "Principal",
      items: [
        { label: "Inicio", href: "/dashboard/student", icon: LayoutDashboard, mobilePlacement: "primary" },
        { label: "Materias", href: "/dashboard/student/content", icon: BookOpen, mobilePlacement: "primary" },
        { label: "Explorar", href: "/dashboard/student/explore", icon: Compass, mobilePlacement: "primary" },
        { label: "Guardados", href: "/dashboard/student/saved", icon: Bookmark, mobilePlacement: "more" },
        { label: "Recientes", href: "/dashboard/student/recent", icon: Clock3, mobilePlacement: "more" },
        { label: "Mi suscripción", href: "/dashboard/subscription", icon: CreditCard, mobilePlacement: "more" },
        { label: "Configuración", href: "/dashboard/settings", icon: Settings, mobilePlacement: "more" },
      ],
    },
  ],
  TEACHER: [
    {
      title: "Enseñanza",
      items: [
        { label: "Inicio", href: "/dashboard/teacher", icon: LayoutDashboard, mobilePlacement: "primary" },
        { label: "Materias", href: "/dashboard/teacher/content", icon: BookOpen, mobilePlacement: "primary" },
        { label: "Explorar", href: "/dashboard/teacher/explore", icon: Compass, mobilePlacement: "primary" },
        { label: "Recientes", href: "/dashboard/teacher/recent", icon: Clock3, mobilePlacement: "more" },
        { label: "Mi suscripción", href: "/dashboard/subscription", icon: CreditCard, mobilePlacement: "more" },
        { label: "Configuración", href: "/dashboard/settings", icon: Settings, mobilePlacement: "more" },
      ],
    },
  ],
  COLLABORATOR: [
    {
      title: "Contenido",
      items: [
        { label: "Inicio", href: "/dashboard/collaborator", icon: LayoutDashboard },
        {
          label: "Catálogo",
          href: "/dashboard/collaborator/content/catalog",
          icon: BookOpen,
        },
        {
          label: "Mis contenidos",
          href: "/dashboard/collaborator/content",
          icon: FolderOpen,
        },
        { label: "Configuración", href: "/dashboard/settings", icon: Settings },
        // { label: "Niveles", href: "/dashboard/collaborator/levels", icon: Layers },
        // { label: "Recursos", href: "/dashboard/collaborator/resources", icon: FolderOpen },
      ],
    },
  ],
  ADMIN: [
    {
      title: "General",
      items: [
        { label: "Panel principal", href: "/dashboard/admin", icon: LayoutDashboard },
      ],
    },
    {
      title: "Operación",
      items: [
        { label: "Revisiones", href: "/dashboard/admin/content/reviews", icon: Clock3 },
        { label: "Cobros", href: "/dashboard/admin/payments", icon: CreditCard },
      ],
    },
    {
      title: "Gestión",
      items: [
        {
          label: "Contenido",
          href: "/dashboard/admin/content",
          icon: BookOpen,
        },
        { label: "Usuarios", href: "/dashboard/admin/users", icon: Users },
        { label: "Notificaciones", href: "/dashboard/admin/notifications", icon: Bell },
        { label: "Configuración", href: "/dashboard/settings", icon: Settings },
      ],
    },
  ],
};
