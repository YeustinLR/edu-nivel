import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reembolsos",
};

export default function ReembolsosPage() {
  return (
    <section className="max-w-3xl mx-auto px-5 pt-28 pb-24">
      <h1 className="text-3xl font-bold mb-8">Política de Reembolsos</h1>

      <section className="space-y-6 text-foreground-secondary text-small leading-relaxed">
        <p>
          Con el objetivo de ofrecer transparencia a nuestros estudiantes, EduNivel establece la siguiente política de reembolso para los cursos, membresías y servicios ofrecidos en la plataforma.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">Plazo de solicitud</h2>
        <p>
          El usuario podrá solicitar la devolución del importe abonado en un plazo máximo de <strong>7 días naturales</strong> desde la fecha de la compra.
        </p>
        <p>
          Importante: Este plazo aplica únicamente a compras realizadas directamente a través de EduNivel.
        </p>
        <p>No se procesarán reembolsos para:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Compras que incumplan las condiciones establecidas en esta política.</li>
        </ul>

        <h2 className="text-xl font-bold text-foreground pt-4">Condiciones para el reembolso</h2>
        <p>No se concederán reembolsos si:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>El estudiante ha adquirido o completado más del 50% de cualquier grado adquirido.</li>
          <li>Se detecta un uso abusivo de la política de devoluciones.</li>
          <li>Se ha obtenido acceso sustancial al contenido formativo y recursos asociados.</li>
        </ul>
        <p>
          EduNivel se reserva el derecho de revisar cada solicitud individualmente.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">Procedimiento de solicitud</h2>
        <p>
          La solicitud deberá realizarse por escrito a:<br />
          <a href="mailto:ericv@gmail.com" className="text-accent hover:underline">ericv@gmail.com</a>
        </p>
        <p>Indicando:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Correo electrónico utilizado en la compra.</li>
          <li>Fecha de compra.</li>
          <li>Comprobante o referencia de pago.</li>
          <li>Motivo de la solicitud.</li>
        </ul>
        <p>
          Si el reembolso es aprobado, EduNivel gestionará manualmente un reembolso total desde ONVO y conciliará su resultado antes de actualizar el acceso. En esta versión no se procesan reembolsos parciales.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">Renovación del acceso</h2>
        <p>
          Los planes de EduNivel son periodos prepagados de 1 o 12 meses y no se renuevan automáticamente mediante ONVO.
        </p>
        <p>
          Cada renovación requiere un nuevo pago. Dejar vencer el periodo no implica el reembolso de pagos ya realizados.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">Excepciones</h2>
        <p>Se reembolsará el importe íntegro cuando exista:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Cobro duplicado.</li>
          <li>Error técnico comprobado.</li>
          <li>Cobro no autorizado verificable.</li>
        </ul>
        <p>
          Las compras realizadas mediante plataformas o terceros estarán sujetas además a las condiciones particulares de dichos proveedores.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">Contacto</h2>
        <p>
          Para cualquier consulta relacionada con reembolsos puedes escribir a:<br />
          Eric V.<br />
          <a href="mailto:ericv@gmail.com" className="text-accent hover:underline">ericv@gmail.com</a><br />
          Costa Rica
        </p>

        <p className="text-muted pt-6 text-xs">
          Última actualización: Agosto 2026 · San José, Costa Rica
        </p>
      </section>
    </section>
  );
}
