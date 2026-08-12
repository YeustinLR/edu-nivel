/**
 * Responsabilidad del archivo:
 * - Mostrar una recuperacion generica ante errores inesperados del arbol protegido.
 *
 * Papel en la arquitectura:
 * - Es el ultimo contenedor de errores no controlados para los flujos de auth y dashboard.
 *
 * Cuando participa:
 * - Cuando un Server Component encuentra un fallo de infraestructura o programacion.
 *
 * Importante:
 * - Los errores esperados se resuelven en servidor mediante redirects o resultados tipados.
 * - No inspecciona propiedades personalizadas: Next puede sanitizarlas en produccion.
 */
"use client";

interface AuthErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuthErrorBoundary({ reset }: AuthErrorBoundaryProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <h2 className="mb-2 text-xl font-semibold text-foreground">Ocurrio un problema</h2>
      <p className="mb-6 text-small text-muted">No fue posible cargar esta seccion.</p>
      <button
        type="button"
        onClick={reset}
        className="btn-primary rounded-lg px-5 py-3 text-small disabled:cursor-not-allowed disabled:opacity-70"
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
