# Notificaciones internas de EduNivel — v1

## Alcance

Canal **exclusivamente interno y unidireccional**. No utiliza Resend ni envía
correos, push, respuestas, comentarios, hilos, campañas o tareas programadas.
Solo un ADMIN habilitado puede enviar alertas generales, avisos importantes y
recordatorios manuales de renovación. Todos los roles pueden recibirlos.

Rutas:

| Ruta | Función |
| --- | --- |
| `/dashboard/notifications` | Bandeja propia, filtros, lectura individual/todas y renovación |
| `/dashboard/admin/notifications` | Historial administrativo por tipo y emisor |
| `/dashboard/admin/notifications/new` | Aviso a usuarios seleccionados, todos o roles |
| `/dashboard/admin/notifications/renewals` | Selección de suscripciones elegibles |
| `/dashboard/admin/notifications/[id]` | Destinatarios, lectura, historial y reenvío |
| `/api/dashboard/notifications/unread-count` | Contador privado del usuario autenticado |
| `/api/dashboard/notifications/preview` | Seis entregas recientes y contador privado para la campana |

La ficha administrativa del usuario permite preseleccionar una cuenta o
suscripción. El historial de una renovación puede abrirse directamente en su
destinatario mediante `recipientId`, siempre restringido al envío consultado.

## Datos y compatibilidad

La migración `20260907000000_add_internal_notifications` agrega:

- `NotificationType` y `NotificationAudienceMode`.
- `notification`: contenido inmutable, emisor, fecha, alcance, roles,
  identificador de solicitud, hash del payload y origen de un reenvío.
- `notification_recipient`: destinatario, fecha de entrega, primera lectura,
  suscripción y snapshots del vencimiento y número de nivel cuando corresponda.
- Índices para bandeja/contador por usuario, fechas, tipo, emisor y período.
- Restricciones únicas por solicitud, destino dentro del envío, primer aviso
  del período y sucesor de cada recordatorio.
- La migración complementaria
  `20260909000000_require_notification_audience_roles` alinea la nulabilidad de
  `audienceRoles` con el contrato obligatorio de Prisma.
- Check que exige los snapshots junto a la suscripción; claves foráneas
  `Restrict` para preservar trazabilidad.

No reescribe datos existentes ni necesita un backfill. El borrado lógico y la
anonimización existentes de usuarios conservan entregas y auditoría sin copiar
correos o nombres a los nuevos registros. Una futura eliminación física deberá
definir expresamente la retención de este historial.

## Destinatarios y renovaciones

Una cuenta habilitada debe existir, no estar eliminada, tener el correo
verificado, no tener suspensión vigente y haber completado la configuración
obligatoria si fue creada por un administrador. Una suspensión vencida no
excluye al usuario. Estas reglas siguen los guards actuales del dashboard.

“Todos” y “Roles” se resuelven en la transacción de envío, incluyen al emisor si
corresponde y no incorporan cuentas creadas después. En selección explícita, si
alguna cuenta deja de ser elegible, falla todo el envío para revisar la selección.
La previsualización no sustituye la validación transaccional final.

Para recordatorios se exige:

- Período vencido o que vence en los siguientes siete días, inclusive.
- Producto compatible con el rol actual STUDENT/TEACHER.
- Nivel activo que requiere suscripción y al menos un pago `SUCCEEDED` aplicado.
- Estado ACTIVE, EXPIRED o CANCELED; se excluye REFUNDED. CANCELED es admisible
  en este flujo manual porque no representa una baja de cobro recurrente.
- Ningún pago INITIALIZING, PROCESSING o REQUIRES_REVIEW para el usuario/nivel,
  aunque ese pago aún no tenga `subscriptionId`.

El backend compara el vencimiento seleccionado con el actual. Cada período
admite un primer recordatorio. Reenviar crea otro envío y otra entrega sin leer,
conservando la lectura anterior; cada entrega permite un único sucesor. El
historial enlaza el sucesor para volver a reenviar de forma deliberada.

La bandeja no ofrece renovar un período cambiado, una suscripción reembolsada,
un producto incompatible o un nivel inactivo/gratuito. La acción vuelve a
comprobar propietario y vigencia. Si existe un pago pendiente, abre ese pago;
en caso contrario abre el flujo de renovación ya existente. No crea pagos ni
marca automáticamente el recordatorio como leído. Al renovar un período,
sus recordatorios anteriores permanecen como historial no accionable.

## Permisos, atomicidad e idempotencia

Todas las lecturas administrativas y Server Actions administrativas requieren
`requireRole(ADMIN)`. El servicio vuelve a comprobar al ADMIN contra User dentro
de la transacción, incluso para devolver un resultado idempotente. Las lecturas
y acciones personales derivan el propietario de `requireUser`, nunca del cliente.
El contador devuelve 401/403 sin sesión/cuenta habilitada y `private, no-store`.

Un envío admite como máximo 10.000 entregas. La transacción Serializable escribe
el envío, entregas y un `AdminAuditLog` por destinatario en lotes de 500. No hay
confirmación parcial. Acciones de auditoría: `NOTIFICATION_SENT` y
`NOTIFICATION_RENEWAL_RESENT`; incluyen IDs de envío, entrega, suscripción,
período y origen, sin duplicar contenido ni información de contacto.

El cliente genera un UUID al confirmar y lo conserva al reintentar. El servidor
calcula SHA-256 del payload normalizado (sin UUID, IDs/roles deduplicados y
ordenados). Misma solicitud/ADMIN/payload devuelve el envío existente; un payload
o emisor distinto se rechaza. Hay hasta tres intentos para conflictos, con
transacciones de hasta 30 segundos y un presupuesto de reintentos de 45 segundos
dentro de rutas administrativas de 60 segundos.

Tras una respuesta de red incierta, se conserva la solicitud y se bloquea la
edición del payload para evitar un nuevo envío accidental. Se puede reintentar
o revisar el historial. Esto no deduplica avisos generales creados deliberadamente
en dos pestañas con UUID diferentes. Los recordatorios sí tienen además las
restricciones de período/origen compartidas entre pestañas.

El texto es plano y React lo escapa. No se admiten HTML, adjuntos ni URLs
arbitrarias de acción. No se modificó la autenticación, revocación de sesiones,
Prisma/Neon, la integración de pagos o Resend.

## Interfaz y consultas

Listados paginados de 20 elementos con orden estable por fecha/ID; el buscador
administrativo filtra nombre/correo y rol sin descargar todos los usuarios.
La selección persiste entre páginas y permite seleccionar la página o limpiar.
Los parámetros de búsqueda se normalizan también en servidor.

La bandeja muestra estados vacíos, tipo, fecha en America/Costa_Rica, lectura y
período original. Contadores, preview y listados solo incluyen entregas cuya
fecha ya ocurrió. Marcar como leído conserva el primer `readAt`; marcar todas
solo actualiza entregas propias visibles con fecha no posterior a la acción.
Filtros y paginación no cambian la lectura. Hay loading/error boundaries,
controles etiquetados, estados anunciados, foco en confirmación y objetivos
táctiles de al menos 44px.

La campana usa la misma implementación en los cuatro dashboards. Abre un popover
en escritorio y un diálogo inferior modal en móvil; si el viewport cruza el
breakpoint mientras está abierto, el panel se cierra de forma segura y restaura
el foco. El bloqueo de scroll móvil conserva el valor previo de la página.
Obtiene el contador después de montar, al navegar o volver al foco (intervalo
mínimo de 30 segundos) y tras cambios de lectura/envío. El preview de seis
entregas se solicita bajo demanda al abrir. No hay polling periódico ni
conexiones persistentes. Su carga no bloquea el Server Component del dashboard.
Ante error conserva el último dato e indica que puede estar desactualizado; sin
dato no presenta un cero ficticio. No es un sistema en tiempo real.

## Verificación automatizada

```bash
pnpm exec prisma generate
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm test:notifications:integration
pnpm build
```

La integración está desactivada en `pnpm test`. El comando dedicado necesita
acceso PostgreSQL y permisos para crear/eliminar **su esquema temporal**.
Preferir `NOTIFICATION_TEST_DATABASE_URL` con una base de pruebas. Si no se
define, usa DATABASE_URL, pero nunca el cliente de la aplicación: genera un
esquema `notification_test_<UUID>`, aplica allí las migraciones, inyecta ese
cliente en los servicios y elimina exclusivamente ese esquema al terminar.
No ejecutar contra producción; una interrupción abrupta puede requerir retirar
manualmente el esquema temporal identificado, nunca las tablas de `public`.

Cobertura: validación y elegibilidad, cuatro roles, permisos en cada frontera,
propietario del contador/lectura, paginación y entradas malformadas, idempotencia
y concurrencia, snapshots, períodos renovados, reenvíos, pagos pendientes sin
suscripción vinculada, usuarios eliminados/suspendidos, rollback por auditoría
y límite de 10.000 entregas.

Resultado observado tras la revisión del 9 de septiembre de 2026: 627 pruebas
ordinarias y 24 de integración aprobadas; lint, TypeScript y build correctos.
Las pruebas ordinarias incluyen validación del payload del preview y selección
explícita del modo responsive. En PostgreSQL remoto,
10.000 entregas más 10.000 auditorías tardaron aproximadamente **8,0 segundos**
en el servicio. Es una muestra de prueba, no una garantía de latencia en Vercel.
La prueba exige menos de 30 segundos y comprueba el rechazo de 10.001 destinos.
Se verificó por HTTP en el build local: las rutas personales/administrativas
redirigen a login sin cookie y el contador responde 401 sin caché.

## Despliegue y aceptación pendiente en Preview

### Estado de desarrollo verificado — 8 de septiembre de 2026

Con autorización del responsable del proyecto, se aplicó
`20260907000000_add_internal_notifications` a la base de desarrollo configurada
y se regeneró el cliente Prisma. El 9 de septiembre también se aplicó allí
`20260909000000_require_notification_audience_roles`; los demás entornos deben
aplicarla junto con sus migraciones pendientes. No se publicó ningún despliegue
en Vercel.

Se repitieron las 24 pruebas de PostgreSQL aisladas y pasaron. Además,
`scripts/notifications-http-smoke.ts` verificó contra el build local:

- Login email/password real de Better Auth para ADMIN, STUDENT, TEACHER y
  COLLABORATOR, con cookies emitidas por la aplicación, no sesiones simuladas.
- Contadores privados vacíos, páginas administrativas y las cuatro bandejas.
- Envío mediante Server Action por HTTP y reintento con la misma solicitud:
  cuatro entregas y cuatro auditorías, sin duplicados.
- Lectura individual/todas, rechazo de lectura de otro propietario y
  conservación del primer `readAt`.
- Rechazo de envíos por no ADMIN y bloqueo del contador para una cuenta
  suspendida incluso conservando su cookie anterior.

El script crea exclusivamente cuentas temporales con UUID y correo
`notifications.invalid`, sin enviar correos. Elimina sus propias cuentas,
sesiones, avisos y auditorías al terminar; no altera cuentas existentes.
Respeta `Retry-After` del límite de login, sin desactivar esa protección.

Para repetirlo **solo en desarrollo**, iniciar el build local en una terminal:

```bash
BETTER_AUTH_URL=http://127.0.0.1:3100 pnpm start --hostname 127.0.0.1 --port 3100
```

Y ejecutar en otra terminal con las mismas variables de base de datos:

```bash
RUN_NOTIFICATION_HTTP_SMOKE=1 pnpm exec tsx scripts/notifications-http-smoke.ts
```

Requiere un build de notificaciones vigente en `.next`, la migración aplicada y
una base de desarrollo, nunca de producción. Si se interrumpe abruptamente,
revisar exclusivamente los fixtures `notification-smoke-<UUID>-<ROL>` de esa
ejecución. Esta comprobación HTTP no sustituye la revisión visual/interactiva
en navegador de la campana, los formularios y la navegación móvil.

### Pasos para otro entorno / publicación

1. Revisar la migración y ejecutar las pruebas contra una base de Preview.
2. Antes de publicar el código que consulta las tablas nuevas, ejecutar todas
   las migraciones pendientes, incluida
   `20260909000000_require_notification_audience_roles`, mediante
   `pnpm exec prisma migrate deploy` con las variables del entorno correcto.
   No usar `migrate dev` en Vercel. La implementación no aplica automáticamente
   la migración a la base de la aplicación.
3. Generar Prisma y construir/publicar la aplicación; no se requieren nuevas
   dependencias ni variables de correo. Verificar que el despliegue admite los
   60 segundos declarados para las rutas administrativas.
4. Completar en navegador, con cuentas de prueba, esta aceptación:
   - ADMIN envía a una cuenta, varias, todos y cada filtro de rol.
   - Cada rol recibe solo sus entregas y puede marcar una/todas como leídas.
   - Campana, navegación móvil/escritorio, foco/teclado y estados vacíos/error.
   - Doble confirmación y pérdida de respuesta no crean entregas duplicadas.
   - Reenvío deja una nueva entrega sin leer y conserva la anterior.
   - Renovación cambia el período, inutiliza el CTA antiguo y rechaza reenvío.
   - Pago pendiente abre su página; suspensión/borrado impide nuevos envíos.
   - No ADMIN no puede consultar destinatarios ni enviar manipulando una acción.
5. Observar duración, conflictos y errores `notification_send_failed` en Preview.
   El fallo de auditoría provocado por el test debe aparecer como error esperado.

No se ejecutó una aceptación visual/interactiva en navegador en este entorno.
Esa comprobación y la migración de cualquier otro entorno destino quedan como
gates de publicación; el estado verificado arriba corresponde solo a desarrollo,
no a producción.

Rollback: volver al código anterior conservando las tablas nuevas y su historial;
no eliminar registros ni revertir destructivamente la migración para desactivar
la interfaz. No se añadieron trabajos que continúen enviando después del rollback.

Riesgos a observar: crecimiento de la auditoría por destinatario, latencia de
transacciones grandes, paginación por offset en historiales muy extensos y el
coste de consultar pares usuario/nivel con pagos pendientes. Si el volumen
supera el límite acordado, reevaluar el diseño antes de introducir colas o envíos
parciales. No se agregaron esas infraestructuras en esta versión.
