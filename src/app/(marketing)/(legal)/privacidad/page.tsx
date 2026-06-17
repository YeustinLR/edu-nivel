import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad",
};

export default function PrivacidadPage() {
  return (
    <section className="max-w-3xl mx-auto px-5 pt-28 pb-24">
      <h1 className="text-3xl font-bold mb-8">Política de Privacidad</h1>

      <section className="space-y-6 text-foreground-secondary text-small leading-relaxed">
        <p>
          En EduNivel nos tomamos muy en serio la protección de tus datos personales. En esta página te explicamos de manera clara y sencilla cómo tratamos tu información de acuerdo con la legislación aplicable en Costa Rica.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">1. Responsable del tratamiento</h2>
        <p>
          Nombre: Eric V.<br />
          Correo electrónico: ericv@gmail.com<br />
          País: Costa Rica
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">2. Datos que recopilamos</h2>
        <p>
          En EduNivel únicamente recopilamos los datos imprescindibles para que puedas acceder y utilizar nuestros cursos:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Dirección de correo electrónico.</li>
          <li>Datos de registro de usuario (nombre y credenciales de acceso).</li>
          <li>Información técnica mínima de uso para garantizar el acceso a los contenidos.</li>
        </ul>
        <p>
          No utilizamos formularios de contacto ni recopilamos datos adicionales sin tu consentimiento.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">3. Finalidad del tratamiento</h2>
        <p>Tratamos tus datos personales con las siguientes finalidades:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Gestionar tu registro en la plataforma.</li>
          <li>Garantizar tu acceso a los cursos disponibles.</li>
          <li>Recordar tu progreso dentro de la plataforma.</li>
          <li>Mejorar la experiencia de uso mediante cookies técnicas.</li>
        </ul>

        <h2 className="text-xl font-bold text-foreground pt-4">4. Base legal</h2>
        <p>La base legal para el tratamiento de tus datos es:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>La prestación del servicio de acceso a cursos online.</li>
          <li>El consentimiento que prestas al registrarte y utilizar la plataforma.</li>
        </ul>

        <h2 className="text-xl font-bold text-foreground pt-4">5. Uso de cookies</h2>
        <p>
          En EduNivel utilizamos únicamente cookies técnicas y necesarias, por ejemplo:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Recordar que has iniciado sesión y tienes acceso a los contenidos.</li>
          <li>Conservar tu progreso en los cursos.</li>
        </ul>
        <p>
          No utilizamos cookies de publicidad de terceros.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">6. Conservación de los datos</h2>
        <p>
          Tus datos personales se conservarán mientras mantengas tu cuenta activa en la plataforma.
        </p>
        <p>
          En cualquier momento puedes solicitar la baja y la eliminación de tus datos escribiéndonos a ericv@gmail.com.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">7. Derechos de los usuarios</h2>
        <p>Como usuario tienes derecho a:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Acceder a tus datos personales.</li>
          <li>Solicitar la rectificación de los datos inexactos.</li>
          <li>Solicitar la supresión de tus datos cuando ya no sean necesarios.</li>
          <li>Limitar u oponerte al tratamiento de tus datos.</li>
          <li>Solicitar la portabilidad de tus datos cuando resulte aplicable.</li>
        </ul>
        <p>
          Para ejercer tus derechos puedes enviarnos un correo a ericv@gmail.com.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">8. Seguridad de los datos</h2>
        <p>
          En EduNivel aplicamos medidas de seguridad técnicas y organizativas para proteger tus datos, incluyendo cifrado SSL en las comunicaciones y sistemas de control de acceso.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">9. Menores de edad</h2>
        <p>
          Los contenidos de EduNivel pueden ser utilizados por menores de edad bajo la supervisión de sus padres o tutores legales.
        </p>
        <p>
          Si eres menor de edad, deberás contar con la autorización de tus padres o representantes legales para registrarte y utilizar la plataforma.
        </p>
      </section>
    </section>
  );
}
