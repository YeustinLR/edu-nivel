import { createModuleAction } from "@/modules/content/actions/content-actions";
import { CollaboratorSubmitButton } from "@/modules/content/components/collaborator/CollaboratorSubmitButton";
import type { CollaboratorContentWorkspace } from "@/server/content/collaborator-content-queries";

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm";

export function CollaboratorModuleCreator({
  subjects,
}: {
  subjects: CollaboratorContentWorkspace["subjects"];
}) {
  return (
    <form
      action={createModuleAction}
      className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2"
    >
      <h2 className="font-semibold sm:col-span-2">Crear módulo</h2>
      <label className="space-y-1 text-sm font-medium text-foreground">
        Materia
        <select name="subjectId" required className={`${inputClass} w-full`}>
          <option value="">Selecciona materia</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              Nivel {subject.level.levelNumber} — {subject.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm font-medium text-foreground">
        Título
        <input
          name="title"
          minLength={2}
          maxLength={160}
          required
          className={`${inputClass} w-full`}
        />
      </label>
      <label className="space-y-1 text-sm font-medium text-foreground">
        Descripción <span className="font-normal text-muted">(opcional)</span>
        <input
          name="description"
          maxLength={1_000}
          className={`${inputClass} w-full`}
        />
      </label>
      <label className="space-y-1 text-sm font-medium text-foreground">
        Audiencia
        <select
          name="audience"
          defaultValue="BOTH"
          className={`${inputClass} w-full`}
        >
          <option value="STUDENT">Estudiantes</option>
          <option value="TEACHER">Docentes</option>
          <option value="BOTH">Ambos</option>
        </select>
      </label>
      <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
        <CollaboratorSubmitButton
          label="Guardar borrador"
          pendingLabel="Procesando…"
          name="disposition"
          value="DRAFT"
          className="rounded-lg border border-border bg-background px-4 py-2 text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
        <CollaboratorSubmitButton
          label="Publicar módulo"
          pendingLabel="Procesando…"
          name="disposition"
          value="PUBLISH"
          className="rounded-lg bg-secondary px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    </form>
  );
}
