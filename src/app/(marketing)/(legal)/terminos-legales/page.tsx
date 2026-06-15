import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos Legales",
};

export default function TerminosLegalesPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 pt-28 pb-24">
      <h1 className="text-3xl font-bold mb-8">Términos Legales</h1>

      <section className="space-y-6 text-foreground-secondary text-small leading-relaxed">
        <p>
          Estos Términos Legales regulan el uso de la plataforma EduNivel, propiedad de Eric V. Brenes Sánchez.
          Al acceder y utilizar esta plataforma, aceptás cumplir con estos términos. Si no estás de acuerdo,
          no debés utilizar el servicio.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">1. Descripción del Servicio</h2>
        <p>
          EduNivel es una plataforma educativa costarricense que ofrece contenidos alineados al currículo del
          Ministerio de Educación Pública (MEP) para estudiantes de primaria y secundaria, así como herramientas
          de seguimiento académico para docentes.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">2. Suscripciones y Pagos</h2>
        <p>
          Los pagos se procesan a través de Tilopay, una pasarela de pagos costarricense. Aceptamos tarjetas
          Visa, Mastercard y American Express. Los precios se muestran en colones costarricenses (₡) e incluyen
          el IVA correspondiente. No hay contratos de permanencia; podés cancelar tu suscripción en cualquier
          momento desde tu panel de usuario.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">3. Uso de la Plataforma</h2>
        <p>
          El usuario se compromete a utilizar la plataforma de forma lícita y conforme a la ley. No está permitido:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Compartir credenciales de acceso con terceros no autorizados</li>
          <li>Reproducir, distribuir o modificar el contenido sin autorización</li>
          <li>Utilizar la plataforma para fines distintos a los educativos previstos</li>
        </ul>

        <h2 className="text-xl font-bold text-foreground pt-4">4. Propiedad Intelectual</h2>
        <p>
          Todo el contenido publicado en EduNivel —incluyendo materiales educativos, diseño, código y marca—
          es propiedad de Eric V. Brenes Sánchez o cuenta con las licencias correspondientes. No se permite
          su uso comercial sin autorización expresa.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">5. Limitación de Responsabilidad</h2>
        <p>
          EduNivel se esfuerza por mantener la plataforma operativa y el contenido actualizado, pero no garantiza
          disponibilidad continua ni ausencia de errores. No nos hacemos responsables por daños derivados del uso
          o la imposibilidad de uso del servicio.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">6. Modificaciones</h2>
        <p>
          Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios serán notificados
          a través de la plataforma o por correo electrónico. El uso continuado del servicio después de las
          modificaciones constituye aceptación de las mismas.
        </p>

        <p className="text-muted pt-6 text-xs">
          Última actualización: Junio 2026 · San José, Costa Rica
        </p>
      </section>
    </main>
  );
}
