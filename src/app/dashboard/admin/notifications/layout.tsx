import { requireRole } from "@/server/auth/guards";
import { Role } from "@/generated/prisma/enums";
export const maxDuration = 60;
export default async function NotificationsAdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(Role.ADMIN);
  return children;
}
