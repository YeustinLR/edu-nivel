import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pagos y renovaciones",
};

export default function PaymentsAndRenewalsPage() {
  return (
    <section className="mx-auto max-w-3xl px-5 pb-24 pt-28">
      <h1 className="mb-8 text-3xl font-bold">Pagos y renovaciones</h1>
      <section className="space-y-6 text-foreground-secondary text-small leading-relaxed">
        <p>
          EduNivel ofrece períodos de acceso prepagados por nivel. El período
          contratado comienza cuando el pago es confirmado y aplicado a la
          cuenta correspondiente.
        </p>
        <h2 className="pt-4 text-xl font-bold text-foreground">Renovación manual</h2>
        <p>
          Los períodos no se renuevan automáticamente. Cuando el período se
          acerque a su fecha de finalización, la persona usuaria puede iniciar
          una nueva compra desde su panel y confirmar otro pago mediante SINPE
          Móvil.
        </p>
        <h2 className="pt-4 text-xl font-bold text-foreground">Incidencias de facturación</h2>
        <p>
          Si observas un monto, una confirmación o un período que no coincide,
          conserva el comprobante y el identificador del pago. Reporta la
          incidencia al equipo de EduNivel para que pueda revisarla con el
          proveedor de pagos.
        </p>
        <p>
          Canal de contacto: <a href="mailto:ericv@gmail.com" className="text-accent-text hover:underline">ericv@gmail.com</a>.
        </p>
        <p className="pt-6 text-xs text-muted">
          Esta página describe el funcionamiento técnico actual de pagos y
          renovaciones. El contenido legal definitivo debe ser revisado por un
          profesional en derecho costarricense.
        </p>
      </section>
    </section>
  );
}
