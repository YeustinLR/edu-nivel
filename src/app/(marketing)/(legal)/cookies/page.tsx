import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookies",
};

export default function CookiesPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 pt-28 pb-24">
      <h1 className="text-3xl font-bold mb-8">Política de Cookies</h1>

      <section className="space-y-6 text-foreground-secondary text-small leading-relaxed">
        <p>
          En EduNivel utilizamos cookies para garantizar el correcto funcionamiento de la plataforma
          y mejorar tu experiencia como usuario.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">1. ¿Qué son las Cookies?</h2>
        <p>
          Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitás
          un sitio web. Permiten que la plataforma recuerde tus preferencias y ofrecerte una experiencia
          personalizada.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">2. Tipos de Cookies que Usamos</h2>
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold">Cookies esenciales</h3>
            <p className="text-muted">Necesarias para el funcionamiento básico de la plataforma. No requieren consentimiento.</p>
          </div>
          <div>
            <h3 className="font-semibold">Cookies de preferencias</h3>
            <p className="text-muted">Recuerdan tus preferencias como el tema (claro/oscuro) y el idioma.</p>
          </div>
          <div>
            <h3 className="font-semibold">Cookies analíticas</h3>
            <p className="text-muted">Nos ayudan a entender cómo los usuarios interactúan con la plataforma para mejorarla.</p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-foreground pt-4">3. Control de Cookies</h2>
        <p>
          Podés gestionar las cookies desde la configuración de tu navegador. La mayoría de navegadores
          te permiten bloquear o eliminar cookies. Tené en cuenta que al deshabilitar cookies esenciales,
          algunas funcionalidades de la plataforma podrían verse afectadas.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">4. Cookies de Terceros</h2>
        <p>
          Utilizamos Vercel Analytics para medir el rendimiento y uso de la plataforma. Estas cookies
          son gestionadas por Vercel y no compartimos datos personales con terceros con fines comerciales.
        </p>

        <p className="text-muted pt-6 text-xs">
          Última actualización: Junio 2026 · San José, Costa Rica
        </p>
      </section>
    </main>
  );
}
