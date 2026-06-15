import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad",
};

export default function PrivacidadPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 pt-28 pb-24">
      <h1 className="text-3xl font-bold mb-8">Política de Privacidad</h1>

      <section className="space-y-6 text-foreground-secondary text-small leading-relaxed">
        <p>
          En EduNivel nos tomamos muy en serio tu privacidad. Esta política describe cómo recopilamos, usamos
          y protegemos tu información personal cuando utilizás nuestra plataforma.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">1. Datos que Recopilamos</h2>
        <p>Podemos recopilar la siguiente información:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Nombre completo, correo electrónico y rol (estudiante, docente)</li>
          <li>Información de pago procesada de forma segura por Tilopay</li>
          <li>Datos de uso: páginas visitadas, interacciones y progreso académico</li>
          <li>Datos técnicos: dirección IP, tipo de navegador y sistema operativo</li>
        </ul>

        <h2 className="text-xl font-bold text-foreground pt-4">2. Uso de la Información</h2>
        <p>Utilizamos tus datos para:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Proveer y mejorar nuestros servicios educativos</li>
          <li>Personalizar tu experiencia en la plataforma</li>
          <li>Procesar pagos y gestionar tu suscripción</li>
          <li>Enviar comunicaciones relacionadas con el servicio</li>
          <li>Cumplir con obligaciones legales en Costa Rica</li>
        </ul>

        <h2 className="text-xl font-bold text-foreground pt-4">3. Protección de Datos</h2>
        <p>
          Implementamos medidas de seguridad técnicas y organizativas para proteger tus datos personales
          contra acceso no autorizado, pérdida o alteración. Los pagos son procesados por Tilopay bajo
          estrictos estándares de seguridad PCI DSS.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">4. Tus Derechos</h2>
        <p>
          De acuerdo con la Ley de Protección de Datos de Costa Rica, tenés derecho a acceder, rectificar,
          cancelar y oponerte al tratamiento de tus datos personales. Para ejercer estos derechos,
          contactanos a través de los canales de la plataforma.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">5. Cookies</h2>
        <p>
          Utilizamos cookies esenciales para el funcionamiento de la plataforma. Podés configurar tu
          navegador para rechazarlas, aunque esto podría afectar la funcionalidad del servicio.
          Consultá nuestra política de cookies para más información.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">6. Cambios a esta Política</h2>
        <p>
          Nos reservamos el derecho de actualizar esta política de privacidad. Te notificaremos sobre
          cambios significativos a través de la plataforma o por correo electrónico.
        </p>

        <p className="text-muted pt-6 text-xs">
          Última actualización: Junio 2026 · San José, Costa Rica
        </p>
      </section>
    </main>
  );
}
