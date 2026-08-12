# Arquitectura del dashboard

## Resumen

EduNivel mantiene un único árbol privado bajo `/dashboard` y presenta áreas
diferentes para estudiante, docente, colaborador y administrador. El shell
visual es compartido, pero cada subárbol tiene un layout que exige el rol exacto
en el servidor.

El login exitoso navega directamente al dashboard canónico del rol. La ruta
`/dashboard` continúa como respaldo y despachador server-side; no es un paso
obligatorio del flujo normal.

## Rutas implementadas

| Ruta | Rol o condición | Estado |
| --- | --- | --- |
| `/dashboard` | Cualquier sesión válida | Redirige al dashboard canónico |
| `/dashboard/student` | `STUDENT` | Implementada; métricas aún son valores iniciales |
| `/dashboard/student/content` | `STUDENT` | Catálogo filtrado para estudiantes |
| `/dashboard/teacher` | `TEACHER` | Implementada; métricas aún son valores iniciales |
| `/dashboard/teacher/content` | `TEACHER` | Catálogo filtrado para docentes |
| `/dashboard/collaborator` | `COLLABORATOR` | Resumen de contenido propio |
| `/dashboard/collaborator/content` | `COLLABORATOR` | Gestión editorial de contenido propio |
| `/dashboard/admin` | `ADMIN` | Métricas globales de usuarios, contenido y suscripciones |
| `/dashboard/admin/content` | `ADMIN` | Resumen operativo del contenido |
| `/dashboard/admin/content/catalog` | `ADMIN` | Catálogo por niveles |
| `/dashboard/admin/content/levels/*` | `ADMIN` | Gestión de niveles |
| `/dashboard/admin/content/subjects/*` | `ADMIN` | Gestión de materias |
| `/dashboard/admin/content/modules/*` | `ADMIN` | Gestión de módulos y sus recursos |
| `/dashboard/admin/content/resources/*` | `ADMIN` | Consulta y edición de recursos |
| `/dashboard/admin/content/reviews/*` | `ADMIN` | Bandeja y páginas de revisión editorial |
| `/dashboard/subscription` | `STUDENT` o `TEACHER` | Compra de acceso por nivel |
| `/dashboard/subscription/payments/[paymentId]` | Dueño del pago | Estado e instrucciones del pago |
| `/dashboard/premium-test` | Sesión válida; acceso evaluado en servidor | Página diagnóstica de autorización premium |

Las rutas de suscripción no tienen un layout propio por rol. Sus páginas
comprueban el usuario y redirigen a roles no elegibles. La página de un pago
busca el registro por `paymentId` y `userId`, por lo que otro usuario recibe
404.

## Archivos principales

### Entrada y autorización

- `src/proxy.ts`: filtro temprano de rutas públicas y privadas.
- `src/app/dashboard/layout.tsx`: exige usuario real y monta el shell.
- `src/app/dashboard/page.tsx`: respaldo que redirige según el rol.
- `src/server/auth/guards.ts`: sesión, usuario, roles y suscripción.
- `src/modules/auth/lib/dashboard-path.ts`: mapa canónico de roles.
- `src/app/dashboard/*/layout.tsx`: guard de rol exacto.

### Interfaz compartida

- `src/modules/dashboard/components/layout/DashboardShell.tsx`
- `src/modules/dashboard/components/layout/DashboardHeader.tsx`
- `src/modules/dashboard/components/shared/StatsCard.tsx`
- `src/modules/dashboard/config/navigation.ts`

### Contenido y suscripciones

- `src/modules/content/components/LearnerContent.tsx`
- `src/modules/content/actions/content-actions.ts`
- `src/modules/content/components/UploadResourceForm.tsx`
- `src/modules/payments/actions/start-sinpe-payment.ts`
- `src/modules/payments/actions/reconcile-sinpe-payment.ts`
- `src/app/api/resources/[resourceId]/file/route.ts`

## Flujo de entrada

### Login normal

```text
LoginForm
  -> Better Auth valida credenciales y crea sesión
  -> el cliente recibe su propio rol
  -> getPostLoginDestination(...)
  -> /dashboard/{rol}
  -> layout común exige usuario
  -> layout del rol exige coincidencia exacta
```

El rol retornado por Better Auth solo evita una redirección intermedia. La
autorización definitiva vuelve a consultar PostgreSQL.

### Entrada manual a `/dashboard`

```text
/dashboard
  -> src/proxy.ts comprueba cookie candidata
  -> DashboardLayout llama requireUser()
  -> DashboardPage consulta el rol
  -> getDashboardPathForRole()
  -> redirect(...)
```

### Ruta ajena al rol

Si un estudiante abre `/dashboard/admin`, el layout administrativo llama a
`requireExactRoleOrRedirect(Role.ADMIN)`. Como no coincide, el servidor lo
redirige a `/dashboard/student`. La aplicación no depende de la navegación visible para
impedir el acceso.

### Usuario sin sesión

`src/proxy.ts` puede redirigirlo tempranamente a `/login`. Si una cookie
inexistente, vencida o manipulada supera ese filtro superficial, `requireUser()`
resuelve la sesión real y vuelve a redirigir a `/login`.

## Shell compartido

`DashboardLayout` obtiene al usuario mediante `requireUser()` y entrega al
shell únicamente nombre, correo, rol e imagen. El shell se ocupa de:

- estructura general;
- encabezado superior persistente;
- navegación horizontal responsive por rol;
- contenido principal;
- cierre de sesión desde la interfaz.

No decide permisos, no consulta la base de datos y no concede acceso premium.

`navigation.ts` selecciona los enlaces visibles según el rol. Esta configuración
es de presentación. Toda operación sensible debe conservar una validación
server-side independiente.

## Dashboards por rol

### Estudiante

El dashboard muestra nivel seleccionado y tarjetas de módulos, completados y
progreso. En el código actual esas tres métricas están inicializadas en cero;
no debe describirse todavía como un cálculo real de progreso.

`/dashboard/student/content` usa `LearnerContent` con rol `STUDENT`.

### Docente

Tiene una página separada y un catálogo distinto por audiencia. Sus métricas
visuales también son valores iniciales en el código actual.

`/dashboard/teacher/content` usa `LearnerContent` con rol `TEACHER`.

### Colaborador

El resumen cuenta sus módulos, módulos publicados y recursos. En contenido:

- puede crear módulos dentro de materias activas;
- solo consulta y administra módulos y recursos creados por él;
- puede editar estados `DRAFT`, `CHANGES_REQUESTED` y `UNPUBLISHED`;
- puede enviar contenido a revisión y retirar una revisión;
- no puede editar mientras está `IN_REVIEW`;
- no puede editar directamente contenido `PUBLISHED`;
- no puede publicar ni aprobar su propio contenido;
- puede activar o desactivar contenido propio dentro de las reglas del servidor.

El colaborador no crea niveles ni materias.

### Administrador

El resumen consulta cantidades reales de usuarios, colaboradores, módulos
activos y suscripciones activas. En contenido puede:

- crear y actualizar niveles;
- crear y actualizar materias;
- crear y actualizar módulos;
- cargar y actualizar recursos;
- activar o desactivar contenido;
- publicar;
- solicitar cambios con una observación opcional;
- despublicar contenido.

La publicación y revisión registran los campos de auditoría definidos en
Prisma.

## Catálogo para estudiante y docente

La jerarquía es:

```text
Level -> Subject -> Module -> Resource
```

`LearnerContent` permite seleccionar un nivel activo y actualiza
`User.selectedLevelId`. Este campo representa la selección de navegación; no es
la fuente de verdad del nivel comprado.

Para mostrar contenido se aplican, entre otros, estos filtros:

- nivel y materia activos;
- módulo activo y `PUBLISHED`;
- audiencia del módulo compatible con `STUDENT`, `TEACHER` o `BOTH`;
- recurso activo y `PUBLISHED`.

La audiencia está en `Module`. Un recurso hereda esa separación porque pertenece
a un módulo.

Si `Level.requiresSubscription` es `false`, el nivel no exige pago. Si es
`true`, el servidor evalúa una suscripción del usuario para ese nivel, el
producto compatible con su rol, vigencia, estado y existencia de un pago
exitoso aplicado. El modelo actual vende acceso al nivel completo; no implementa
recursos gratuitos individuales dentro de un nivel premium.

## Descarga de archivos protegidos

La ruta `GET /api/resources/[resourceId]/file` aplica autorización antes de
generar una URL temporal:

- administrador: cualquier recurso existente;
- colaborador: solo recursos propios o pertenecientes a módulos propios;
- estudiante/docente: contenido activo, publicado, audiencia compatible y
  acceso al nivel;
- recursos PDF, imagen, archivo o audio gestionados por R2.

La URL prefirmada tiene cinco minutos de vigencia. La clave de almacenamiento o
la posesión de una URL no reemplazan estas reglas de autorización.

## Rutas canónicas

El mapa único está en `src/modules/auth/lib/dashboard-path.ts`:

```text
STUDENT      -> /dashboard/student
TEACHER      -> /dashboard/teacher
COLLABORATOR -> /dashboard/collaborator
ADMIN        -> /dashboard/admin
```

Lo consumen el login, `/dashboard` y los guards. Los nuevos destinos por rol
deben añadirse allí, no duplicarse en varios componentes.

## Rendimiento y `cache()`

`getCurrentSession()` y `requireUser()` están envueltos con `cache()` de React.
Durante un mismo render, el layout común, el layout del rol y la página pueden
reutilizar la misma resolución. Esto no garantiza una sola solicitud HTTP del
navegador y no comparte resultados entre usuarios.

En desarrollo, Next.js puede compilar rutas bajo demanda y React puede ejecutar
trabajo adicional de diagnóstico. Los tiempos del servidor de desarrollo no
constituyen una medición de producción.

## Manejo de errores

`src/app/dashboard/error.tsx` es un Error Boundary de cliente para errores de
render no manejados. No sustituye:

- redirecciones por falta de sesión;
- redirecciones por rol incorrecto;
- errores de validación de Server Actions;
- respuestas 401, 403 o 404 de Route Handlers.

## Cómo extender de forma segura

### Nueva subruta de un rol existente

1. Crear la página dentro de `src/app/dashboard/{rol}/`.
2. Reutilizar el layout existente.
3. Añadir el enlace a `navigation.ts` si debe mostrarse.
4. Proteger por separado cualquier Server Action o Route Handler.
5. Añadir pruebas de acceso permitido y denegado.

### Sección compartida

No debe colocarse accidentalmente bajo un layout de rol único. La página o un
layout específico debe llamar a `requireRole([Role.STUDENT, Role.TEACHER])` o
aplicar una regla de negocio equivalente.

### Nuevo rol

1. Añadirlo en Prisma y crear su migración.
2. Decidir explícitamente si puede registrarse públicamente.
3. Crear ruta y layout con guard exacto.
4. Actualizar `dashboard-path.ts` y `navigation.ts`.
5. Ajustar el modelo de Better Auth solo si el rol será escribible en registro.
6. Probar login, redirecciones, acciones y acceso cruzado.

## Reglas que deben conservarse

- `src/proxy.ts` sigue siendo un filtro mínimo, no el lugar para reglas de
  negocio.
- El rol del cliente sirve para navegación, nunca para autorizar.
- Los layouts protegen subárboles; las mutaciones y descargas se protegen además
  en su punto de ejecución.
- `selectedLevelId` no se usa para decidir qué nivel fue pagado.
- La navegación visible no es un control de seguridad.
- `/dashboard` permanece como ruta de respaldo.
