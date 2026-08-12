/**
 * Responsabilidad del archivo:
 * - Exponer el cliente de Better Auth para Client Components.
 *
 * Papel en la arquitectura:
 * - Es el puente entre formularios/interacciones del navegador y las rutas HTTP generadas por
 *   Better Auth en `/api/auth/*`.
 *
 * Cuando participa:
 * - Login, registro, logout y cualquier lectura de sesion desde el cliente.
 *
 * Importante:
 * - El cliente no protege rutas por si solo; solo dispara operaciones.
 * - La seguridad real sigue viviendo en proxy, Server Components y PostgreSQL.
 */
import { createAuthClient } from "better-auth/react";
import { emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";

import { DASHBOARD_ROLES } from "@/modules/auth/lib/dashboard-path";

export const authClient = createAuthClient({
  plugins: [
    // Los sellos de consentimiento los estampa el servidor y nunca viajan desde el cliente.
    // El rol puede volver en la respuesta de sesion/login para decidir navegacion; el formulario
    // y el validator server-side siguen limitando el registro publico a STUDENT y TEACHER.
    inferAdditionalFields({
      user: {
        ageDeclared: {
          type: "number",
          required: true,
          returned: false,
        },
        role: {
          type: [...DASHBOARD_ROLES],
          required: true,
          returned: true,
        },
        // Solo viaja en el body del alta y nunca forma parte del usuario devuelto.
        // El hook server-side valida su hash, correo, rol, vigencia y uso único.
        invitationToken: {
          type: "string",
          required: false,
          returned: false,
        },
      },
    }),
    emailOTPClient(),
  ],
});
