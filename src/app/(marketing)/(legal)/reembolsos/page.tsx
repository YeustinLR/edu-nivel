import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reembolsos",
};

export default function ReembolsosPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 pt-28 pb-24">
      <h1 className="text-3xl font-bold mb-8">Política de Reembolsos</h1>

      <section className="space-y-6 text-foreground-secondary text-small leading-relaxed">
        <p>
          En EduNivel queremos que estés satisfecho con tu suscripción. A continuación, detallamos
          nuestra política de reembolsos, diseñada de acuerdo con la legislación costarricense.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">1. Suscripciones Mensuales</h2>
        <p>
          Podés cancelar tu suscripción mensual en cualquier momento desde tu panel de usuario.
          No se realizan reembolsos parciales por días no utilizados del mes en curso. El acceso
          se mantendrá hasta el final del período facturado.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">2. Suscripciones Anuales</h2>
        <p>
          Si cancelás tu suscripción anual, el acceso se mantendrá hasta la fecha de vencimiento
          del período contratado. No se realizan reembolsos por cancelación anticipada de planes anuales.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">3. Periodo de Prueba Gratuito</h2>
        <p>
          Todos los nuevos usuarios tienen acceso a 14 días de prueba gratuita sin necesidad de
          ingresar datos de pago. Durante este periodo podés explorar la plataforma sin compromiso.
          Al finalizar el periodo, podés elegir el plan que mejor se adapte a tus necesidades.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">4. Excepciones</h2>
        <p>
          En caso de errores técnicos comprobados que impidan el uso de la plataforma durante un
          periodo prolongado, evaluaremos cada caso de forma individual. Contactanos a través de
          los canales de soporte para gestionar tu solicitud.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">5. Proceso de Solicitud</h2>
        <p>
          Para cualquier consulta sobre reembolsos, comunicate con nuestro equipo de soporte desde
          la sección de contacto en la plataforma. Procesaremos tu solicitud en un plazo máximo de
          15 días hábiles.
        </p>

        <p className="text-muted pt-6 text-xs">
          Última actualización: Junio 2026 · San José, Costa Rica
        </p>
      </section>
    </main>
  );
}
