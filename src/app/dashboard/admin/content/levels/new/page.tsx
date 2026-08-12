import { Layers3 } from "lucide-react";

import { ContentFormSurface } from "@/modules/content/components/admin/ContentFormSurface";
import { adminCatalogBreadcrumbs, ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { CreateLevelForm } from "@/modules/content/components/admin/creation/CreateLevelForm";

const catalogHref = "/dashboard/admin/content/catalog";

export default function CreateAdminLevelPage() {
  return (
    <div className="space-y-6">
      <ContentPageHeader
        eyebrow="Crear contenido"
        title="Nuevo nivel"
        description="Define el nivel académico que contendrá materias, módulos y recursos."
        breadcrumbs={[
          ...adminCatalogBreadcrumbs,
          { label: "Nuevo nivel" },
        ]}
      />
      <ContentFormSurface
        aside={
          <div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <Layers3 aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold text-foreground">Antes de continuar</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Los números de nivel son únicos. Después podrás añadir sus materias desde la página del nivel.
            </p>
          </div>
        }
      >
        <CreateLevelForm closeHref={catalogHref} />
      </ContentFormSurface>
    </div>
  );
}
