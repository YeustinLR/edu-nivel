import {
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
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navigationByRole: Record<string, NavGroup[]> = {
  STUDENT: [
    {
      title: "Principal",
      items: [
        { label: "Inicio", href: "/dashboard/student", icon: LayoutDashboard },
        { label: "Materias", href: "/dashboard/student/content", icon: BookOpen },
        { label: "Explorar", href: "/dashboard/student/explore", icon: Compass },
        { label: "Guardados", href: "/dashboard/student/saved", icon: Bookmark },
        { label: "Recientes", href: "/dashboard/student/recent", icon: Clock3 },
        { label: "Mi suscripción", href: "/dashboard/subscription", icon: CreditCard },
        { label: "Configuración", href: "/dashboard/student/settings", icon: Settings },
      ],
    },
  ],
  TEACHER: [
    {
      title: "Enseñanza",
      items: [
        { label: "Inicio", href: "/dashboard/teacher", icon: LayoutDashboard },
        { label: "Materias", href: "/dashboard/teacher/content", icon: BookOpen },
        { label: "Explorar", href: "/dashboard/teacher/explore", icon: Compass },
        { label: "Recientes", href: "/dashboard/teacher/recent", icon: Clock3 },
        { label: "Mi suscripción", href: "/dashboard/subscription", icon: CreditCard },
        { label: "Configuración", href: "/dashboard/teacher/settings", icon: Settings },
      ],
    },
  ],
  COLLABORATOR: [
    {
      title: "Contenido",
      items: [
        { label: "Panel", href: "/dashboard/collaborator", icon: LayoutDashboard },
        {
          label: "Mis contenidos",
          href: "/dashboard/collaborator/content",
          icon: FolderOpen,
        },
        // { label: "Niveles", href: "/dashboard/collaborator/levels", icon: Layers },
        // { label: "Recursos", href: "/dashboard/collaborator/resources", icon: FolderOpen },
      ],
    },
  ],
  ADMIN: [
    {
      title: "Administración",
      items: [
        { label: "Panel", href: "/dashboard/admin", icon: LayoutDashboard },
        {
          label: "Contenido",
          href: "/dashboard/admin/content",
          icon: BookOpen,
        },
        { label: "Usuarios", href: "/dashboard/admin/users", icon: Users },
        // { label: "Colaboradores", href: "/dashboard/admin/collaborators", icon: UserPlus },
        // { label: "Módulos", href: "/dashboard/admin/modules", icon: BookOpen },
        // { label: "Analíticas", href: "/dashboard/admin/analytics", icon: BarChart3 },
        // { label: "Configuración", href: "/dashboard/admin/settings", icon: Settings },
      ],
    },
  ],
};
