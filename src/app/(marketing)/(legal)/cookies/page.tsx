import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookies",
};

export default function CookiesPage() {
  return (
    <section className="max-w-3xl mx-auto px-5 pt-28 pb-24">
      <h1 className="text-3xl font-bold mb-8">Política de Cookies</h1>

      <section className="space-y-6 text-foreground-secondary text-small leading-relaxed">
        <p>
          En EduNivel usamos únicamente cookies y almacenamiento local necesarios para que la plataforma funcione correctamente y recuerde tus preferencias. No utilizamos cookies de terceros para publicidad o seguimiento comercial.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">Qué son las cookies</h2>
        <p>
          Las cookies son pequeños archivos que el navegador guarda en tu dispositivo cuando visitas una web. Permiten recordar información técnica, como si has iniciado sesión o qué preferencias has elegido.
        </p>
        <p>
          También podemos utilizar almacenamiento local del navegador (localStorage) para guardar preferencias similares. A efectos prácticos, en esta página explicamos ambos mecanismos porque cumplen una función parecida: recordar ajustes para mejorar la experiencia de uso.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">Qué cookies y datos locales usamos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left font-semibold text-foreground py-2 pr-4">Nombre o tipo</th>
                <th className="text-left font-semibold text-foreground py-2 pr-4">Finalidad</th>
                <th className="text-left font-semibold text-foreground py-2">Duración aproximada</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4 align-top">Cookies de sesión</td>
                <td className="py-2 pr-4 align-top">Mantener tu sesión iniciada y proteger el acceso a tu cuenta.</td>
                <td className="py-2 align-top">Mientras dure la sesión o según la configuración de autenticación.</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4 align-top">Preferencias del usuario</td>
                <td className="py-2 pr-4 align-top">Recordar idioma, tema visual, configuraciones de la plataforma y progreso.</td>
                <td className="py-2 align-top">Hasta que el usuario las modifique o elimine.</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4 align-top">Estado de la interfaz</td>
                <td className="py-2 pr-4 align-top">Recordar configuraciones como paneles abiertos o cerrados y preferencias de navegación.</td>
                <td className="py-2 align-top">Hasta 1 año.</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4 align-top">Avisos informativos</td>
                <td className="py-2 pr-4 align-top">Evitar mostrar repetidamente avisos que ya hayas cerrado.</td>
                <td className="py-2 align-top">Variable según el aviso.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 align-top">Datos almacenados en localStorage</td>
                <td className="py-2 pr-4 align-top">Guardar preferencias de experiencia de usuario y progreso dentro de la plataforma.</td>
                <td className="py-2 align-top">Hasta que el usuario elimine los datos del navegador.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-xl font-bold text-foreground pt-4">No usamos cookies de analítica ni publicidad</h2>
        <p>
          EduNivel no instala cookies de publicidad ni herramientas destinadas a crear perfiles comerciales de los usuarios.
        </p>
        <p>
          Si en el futuro incorporamos herramientas que requieran consentimiento, actualizaremos esta política y solicitaremos autorización cuando corresponda.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">Por qué no mostramos un banner de cookies</h2>
        <p>
          Actualmente utilizamos únicamente cookies técnicas y funcionales necesarias para el correcto funcionamiento de la plataforma, la autenticación de usuarios y la conservación de preferencias.
        </p>

        <h2 className="text-xl font-bold text-foreground pt-4">Cómo puedes borrar o bloquear cookies</h2>
        <p>
          Puedes eliminar cookies y datos locales desde la configuración de tu navegador. También puedes bloquearlas, aunque algunas funcionalidades podrían dejar de funcionar correctamente.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies y otros datos de sitios.</li>
          <li><strong>Firefox:</strong> Ajustes → Privacidad y seguridad.</li>
          <li><strong>Safari:</strong> Ajustes → Privacidad.</li>
          <li><strong>Edge:</strong> Configuración → Cookies y permisos del sitio.</li>
        </ul>

        <h2 className="text-xl font-bold text-foreground pt-4">Contacto</h2>
        <p>
          Si tienes dudas sobre esta política o sobre el uso de cookies en EduNivel, puedes escribirnos a:<br />
          <a href="mailto:ericv@gmail.com" className="text-accent hover:underline">ericv@gmail.com</a>
        </p>

        <p className="text-muted pt-6 text-xs">
          Última actualización: [Fecha de publicación]
        </p>
      </section>
    </section>
  );
}
