import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
};

export default function TerminosLegalesPage() {
  return (
    <section className="max-w-3xl mx-auto px-5 pt-28 pb-24">
      <h1 className="text-3xl font-bold mb-8">Términos y Condiciones de Uso</h1>

      <section className="space-y-6 text-foreground-secondary text-small leading-relaxed">

        <h2 className="text-xl font-bold text-foreground pt-4">1. Objeto</h2>
        <p>
          Los presentes Términos y Condiciones regulan el acceso y uso de la plataforma EduNivel, propiedad de Eric V., con residencia en Costa Rica.
        </p>
        <p>
          Al registrarte y utilizar la plataforma aceptas íntegramente estas condiciones.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">2. Acceso a la plataforma</h2>
        <p>
          El acceso a los cursos requiere registro mediante correo electrónico y credenciales de usuario.
        </p>
        <p>
          El usuario se compromete a mantener la confidencialidad de sus claves de acceso y a no compartirlas con terceros.
        </p>
        <p>
          EduNivel se reserva el derecho de suspender o cancelar cuentas en caso de uso indebido, fraude o incumplimiento de estas condiciones.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">3. Uso correcto de los contenidos</h2>
        <p>
          Los contenidos de EduNivel están destinados únicamente a uso personal y educativo.
        </p>
        <p>No está permitido:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Reproducir, distribuir o comercializar los cursos sin autorización expresa.</li>
          <li>Ceder el acceso a terceros.</li>
          <li>Utilizar la plataforma con fines ilícitos o que puedan dañar la imagen de EduNivel.</li>
        </ul>

        <h2 className="text-xl font-bold text-foreground pt-4">4. Propiedad intelectual</h2>
        <p>
          Todos los contenidos (textos, vídeos, material didáctico, imágenes, recursos descargables, código fuente y diseño) son titularidad de Eric V. o de sus colaboradores, quedando protegidos por la normativa aplicable de propiedad intelectual.
        </p>
        <p>
          El usuario adquiere únicamente un derecho de uso personal, limitado y no exclusivo sobre dichos contenidos.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">5. Responsabilidad de la plataforma</h2>
        <p>
          EduNivel trabaja para que los contenidos estén siempre accesibles y actualizados, pero no garantiza la disponibilidad ininterrumpida del servicio.
        </p>
        <p>
          No se hace responsable de daños derivados de interrupciones técnicas, fallos ajenos o uso indebido de la plataforma por parte del usuario.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">6. Responsabilidad del usuario</h2>
        <p>El usuario se compromete a:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Usar la plataforma conforme a la legislación vigente.</li>
          <li>Facilitar información veraz en el registro.</li>
          <li>Respetar los derechos de propiedad intelectual de EduNivel.</li>
        </ul>

        <h2 className="text-xl font-bold text-foreground pt-4">7. Privacidad y protección de datos</h2>
        <p>
          El tratamiento de los datos personales se regula en nuestra Política de Privacidad.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">8. Cancelación de cuenta</h2>
        <p>
          El usuario puede solicitar en cualquier momento la baja y eliminación de sus datos escribiendo a ericv@gmail.com.
        </p>
        <p>
          EduNivel podrá dar de baja cuentas que incumplan estos Términos y Condiciones.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">9. Legislación aplicable</h2>
        <p>
          Estas condiciones se rigen por la legislación de Costa Rica y, en caso de conflicto, las partes se someten a los tribunales competentes de Costa Rica, salvo que la normativa aplicable disponga otra cosa.
        </p>

      </section>
    </section>
  );
}
