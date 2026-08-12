import type { ReactNode } from "react";

import { AdminContentNavigation } from "@/modules/content/components/admin/AdminContentNavigation";

export default function AdminContentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <AdminContentNavigation />
      {children}
    </div>
  );
}
