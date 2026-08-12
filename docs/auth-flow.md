# Arquitectura de autenticación

## Estado actual

EduNivel utiliza Better Auth `1.6.22` con correo y contraseña, el complemento
Email OTP, Prisma `7.8.0` y PostgreSQL. La autenticación identifica una sesión;
la autorización se vuelve a resolver en el servidor con el usuario persistido
en PostgreSQL.

El código implementa actualmente:

- registro público exclusivo para `STUDENT` y `TEACHER`;
- verificación del correo mediante OTP antes de permitir el inicio de sesión;
- rechazo anticipado de correos ya registrados;
- recuperación y restablecimiento de contraseña mediante OTP;
- navegación posterior al login hacia el dashboard canónico del rol;
- autorización por rol y por suscripción en el servidor;
- cierre de sesión y revocación de sesiones tras restablecer la contraseña;
- limitación de solicitudes de autenticación persistida en PostgreSQL.

El envío real de correos depende de configurar Resend. El repositorio demuestra
la integración y las plantillas, pero no demuestra que las credenciales, el
dominio remitente o el servicio estén configurados en un entorno externo.

## Archivos principales

### Configuración y persistencia

- `src/server/auth/auth.ts`: configuración central de Better Auth.
- `src/server/db/prisma.ts`: Prisma Client de ejecución, conectado mediante
  `DATABASE_URL`.
- `src/config/env.ts`: validación de variables de entorno.
- `prisma/schema.prisma`: modelos `User`, `Session`, `Account`,
  `Verification` y `RateLimit`.
- `src/server/mail/send-verification-otp.ts`: envío de OTP con Resend.
- `src/server/mail/templates/`: plantillas de correo creadas con React Email.

### Rutas y cliente

- `src/app/api/auth/[...all]/route.ts`: expone los handlers de Better Auth.
- `src/app/(auth)/registro/page.tsx` y
  `src/modules/auth/components/RegisterForm.tsx`: registro.
- `src/app/(auth)/verify-email/page.tsx` y
  `src/modules/auth/components/VerifyEmailForm.tsx`: verificación.
- `src/app/(auth)/login/page.tsx` y
  `src/modules/auth/components/LoginForm.tsx`: login.
- `src/app/(auth)/recuperar-contrasena/page.tsx` y
  `src/modules/auth/components/ForgotPasswordForm.tsx`: solicitud de
  recuperación.
- `src/app/(auth)/restablecer-contrasena/page.tsx` y
  `src/modules/auth/components/ResetPasswordForm.tsx`: cambio de contraseña.
- `src/modules/auth/services/auth-client.ts`: cliente de Better Auth.
- `src/modules/auth/lib/dashboard-path.ts`: rutas canónicas por rol y destino
  posterior al login.
- `src/modules/auth/lib/get-safe-redirect.ts`: validación de destinos internos.

### Protección del servidor

- `src/proxy.ts`: filtro temprano de rutas privadas basado en la presencia de
  una cookie de sesión.
- `src/server/auth/guards.ts`: sesión real, usuario de dominio y autorización.
- `src/server/auth/redirect-authenticated-user.ts`: evita mostrar páginas
  públicas de autenticación a una sesión válida.
- `src/app/dashboard/layout.tsx`: protección base del árbol privado.
- layouts de `student`, `teacher`, `collaborator` y `admin`: rol exacto.

## Datos persistidos

### `User`

Contiene identidad y datos de dominio:

- `id`, `name`, `email`, `emailVerified`, `image`;
- `role`;
- `birthDate`, `ageDeclared`, `termsAcceptedAt`, `privacyAcceptedAt` y
  `ageVerifiedAt`;
- `selectedLevelId`, usado para navegación educativa, no para decidir qué nivel
  compró el usuario;
- fechas de creación y actualización.

El correo es único en PostgreSQL. El rol por defecto del esquema es `STUDENT`,
pero el registro público exige que el cliente envíe explícitamente
`STUDENT` o `TEACHER`.

### `Session`

Guarda el token único, vencimiento, usuario, dirección IP y agente de usuario
cuando Better Auth los proporciona. La configuración actual usa:

- vigencia de 30 días;
- renovación incremental cada 24 horas;
- caché de cookie de 5 minutos.

### `Account`

Relaciona la cuenta Better Auth con el usuario y contiene el hash de la
contraseña para el proveedor de correo y contraseña. La aplicación no almacena
la contraseña en texto plano.

### `Verification`

Better Auth la utiliza para los códigos OTP. La configuración actual genera
códigos de seis dígitos, con cinco minutos de vigencia, tres intentos permitidos
y almacenamiento con hash.

### `RateLimit`

Better Auth persiste aquí los contadores de limitación de solicitudes. Existe
un límite general de 100 solicitudes por minuto y límites específicos:

| Operación | Máximo por minuto |
| --- | ---: |
| Registro | 5 |
| Envío de OTP | 3 |
| Verificación de OTP | 5 |
| Solicitud de recuperación | 3 |
| Restablecimiento de contraseña | 5 |

Estos límites son una defensa adicional; no sustituyen monitoreo, controles del
proveedor de correo ni protecciones de infraestructura.

## Registro

### Preselección del rol

Los botones de planes pueden enlazar a:

```text
/registro?role=STUDENT
/registro?role=TEACHER
```

La página acepta esa preselección únicamente si el valor pertenece al conjunto
permitido. El usuario puede cambiarlo en el formulario antes de registrarse.

### Validación del cliente y del servidor

El formulario solicita nombre, correo, contraseña, confirmación, edad declarada,
rol, declaración de mayoría de edad y aceptación conjunta de términos y
privacidad. Los enlaces abren las páginas legales independientes en otra
pestaña. El servidor registra las marcas temporales de aceptación y verificación
de edad al crear la cuenta.

La validación del navegador mejora la experiencia, pero Better Auth vuelve a
validar en el servidor:

- edad declarada dentro del rango permitido y al menos 18 años;
- contraseña con la longitud y complejidad configuradas;
- contraseña que no contenga el correo cuando este está disponible;
- rol público limitado a `STUDENT` o `TEACHER`;
- imposibilidad de cambiar el rol mediante `update-user`.

`ADMIN` y `COLLABORATOR` no se pueden crear ni elegir desde el registro
público.

### Correo duplicado

Antes de crear la cuenta, el hook de registro normaliza el correo con
`trim().toLowerCase()` y consulta PostgreSQL. Si ya existe, responde con estado
422 y el código `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`. El formulario permanece
en registro y muestra que ya existe una cuenta con ese correo; no continúa a la
verificación.

La restricción única de `User.email` sigue siendo la garantía definitiva frente
a solicitudes concurrentes.

### Creación y verificación

El flujo real es:

```text
RegisterForm
  -> POST /api/auth/sign-up/email
  -> Better Auth + hooks
  -> Prisma/PostgreSQL crea User y Account
  -> envío de OTP
  -> /verify-email
  -> POST /api/auth/email-otp/verify-email
  -> emailVerified = true
  -> /login
```

El registro no debe documentarse como un login automático. Con
`requireEmailVerification: true`, la persona debe validar el OTP y después
iniciar sesión. La pantalla de verificación conserva temporalmente el correo en
`sessionStorage`; esto es una ayuda de interfaz y no una credencial.

## Inicio de sesión

`LoginForm` envía el correo y la contraseña a Better Auth. Si el correo todavía
no está verificado, dirige al flujo de OTP. Si las credenciales son válidas,
Better Auth crea la sesión y su cookie.

El resultado de login incluye el rol del propio usuario porque el campo está
configurado con `returned: true`. El cliente lo usa exclusivamente para elegir
el destino:

| Rol | Destino canónico |
| --- | --- |
| `STUDENT` | `/dashboard/student` |
| `TEACHER` | `/dashboard/teacher` |
| `COLLABORATOR` | `/dashboard/collaborator` |
| `ADMIN` | `/dashboard/admin` |

Si existe un parámetro `redirect` interno y seguro hacia una ruta privada
específica, se conserva. Cuando el destino es solamente `/dashboard`, se
reemplaza por el dashboard canónico del rol. Un rol desconocido cae en
`/dashboard`.

El rol recibido por el navegador no concede permisos. Un cliente modificado
podría cambiar la URL, pero los layouts y guards vuelven a consultar el rol
persistido en PostgreSQL.

## `/dashboard` como respaldo

`/dashboard` permanece implementado como entrada de respaldo:

1. exige usuario autenticado;
2. lee su rol real;
3. redirige a la ruta canónica correspondiente.

El login exitoso normal ya no necesita pasar primero por esa página. Acceder
manualmente a `/dashboard` o llegar sin un rol reconocido sigue siendo un flujo
válido de recuperación.

## Cookies y resolución de sesión

Better Auth crea y firma la cookie. El navegador la almacena y la vuelve a
enviar en las solicitudes que correspondan. El código cliente no necesita leer
el token.

La protección ocurre en dos niveles:

1. `src/proxy.ts` comprueba tempranamente si hay una cookie candidata al entrar
   a rutas privadas. Es un filtro de experiencia y ahorro de trabajo, no una
   verificación completa.
2. `getCurrentSession()` llama a `auth.api.getSession()` con los encabezados
   reales. `requireUser()` consulta después `User` en PostgreSQL e incluye sus
   suscripciones y el nivel seleccionado.

`requireUser()` redirige a `/login` cuando no hay sesión o usuario y a
`/verify-email` cuando la cuenta no está verificada. Ambas funciones se
memoizan con `cache()` durante el render de una solicitud para evitar consultas
duplicadas dentro de ese mismo árbol; no crean una caché global entre usuarios.

Las páginas `/login` y `/registro` usan `redirectAuthenticatedUser()`. Una
sesión válida se envía a `/dashboard`, que resuelve el rol; una cuenta no
verificada se envía a `/verify-email`. Las páginas de verificación y
recuperación no llaman actualmente a ese helper.

## Autorización por rol

Cada subárbol privado llama a `requireExactRoleOrRedirect()` desde su layout:

- estudiante exige `STUDENT`;
- docente exige `TEACHER`;
- colaborador exige `COLLABORATOR`;
- administrador exige `ADMIN`.

Cuando el rol no coincide, el servidor redirige al dashboard canónico del rol
real. Para acciones donde conviene fallar explícitamente existe
`requireRole()`, que lanza un error de autorización.

Ocultar enlaces en el sidebar no constituye seguridad. Las Server Actions,
Route Handlers, descargas, pagos y consultas sensibles deben aplicar su guard
correspondiente en el servidor.

## Recuperación de contraseña

El flujo implementado es:

```text
/recuperar-contrasena
  -> request-password-reset con Email OTP
  -> correo transaccional mediante Resend
  -> /restablecer-contrasena
  -> validación de OTP y contraseña nueva
  -> revocación de sesiones anteriores
  -> /login
```

La nueva contraseña pasa por las mismas reglas server-side relevantes. No se
documenta que el correo fue entregado hasta que el proveedor externo lo
confirme; el repositorio solo demuestra que existe el código de envío.

## Cierre de sesión

El sidebar invoca `authClient.signOut()`. Better Auth invalida la sesión y el
cliente navega a `/login`. Aunque la navegación del cliente falle, una sesión
invalidada deja de superar `getCurrentSession()`.

## Redirecciones seguras

`getSafeRedirect()` solo acepta rutas internas que comienzan con `/`, rechaza
URLs externas, rutas `//...`, separadores invertidos y destinos públicos de
autenticación. Su valor por defecto es `/dashboard`.

Esta validación evita que `?redirect=` convierta el login en una redirección
abierta.

## Estado de pruebas

El repositorio contiene pruebas unitarias de esquemas, contraseñas, edad,
mensajes, rutas por rol y redirecciones, además de pruebas de integración de
registro y rol que requieren una base PostgreSQL. Los comandos vigentes son:

```bash
pnpm test
pnpm test:integration
pnpm check
```

`pnpm check` ejecuta lint, comprobación de tipos y pruebas unitarias. La
integración con base de datos se ejecuta por separado y también forma parte del
workflow de GitHub Actions.

La presencia de estas pruebas no demuestra por sí sola la configuración de
Resend, Neon o Vercel en producción.

## Reglas de mantenimiento

- No ampliar `registrationRoleSchema` para crear personal interno por registro
  público.
- Mantener las rutas canónicas en
  `src/modules/auth/lib/dashboard-path.ts`.
- No confiar en el rol retornado al cliente para autorización.
- Proteger el subárbol en el layout y las operaciones mutables en el servidor.
- No sustituir `requireUser()` por la comprobación de cookie de `proxy.ts`.
- Añadir cualquier comando documental solamente si existe en `package.json`.
