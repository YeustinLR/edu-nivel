# Gate 1 — ONVO Sandbox local

Este procedimiento certifica la lógica crítica con `localhost + ngrok + Neon
de desarrollo + ONVO Sandbox`. No habilita Live ni requiere Vercel.

## Límites y criterio de aprobación

- Se usan exclusivamente `ONVO_ENV=test` y llaves con prefijo
  `onvo_test_secret_key_`.
- Cada escenario crítico usa un Student verificado diferente para conservar
  trazabilidad. No se crea ni modifica manualmente una `Subscription`.
- Una prueba aprueba únicamente cuando coinciden UI, ONVO, `Payment`,
  `Subscription` y autorización del recurso.
- Una intención `processing`, una transferencia parcial o un HTTP 200 del
  navegador nunca cuentan como pago.
- Gate 1 continúa en **NO-GO** hasta completar esta matriz con evidencia real.

## Configuración

En `.env` local:

```dotenv
ONVO_ENV="test"
ONVO_LIVE_ENABLED="false"
ONVO_SECRET_KEY="onvo_test_secret_key_..."
ONVO_WEBHOOK_SECRET="webhook_secret_..."
CRON_SECRET="un-secreto-aleatorio-de-al-menos-16-caracteres"
```

Iniciar la aplicación y el túnel en terminales distintas:

```bash
pnpm dev
ngrok http 3000
```

Registrar en ONVO Sandbox la URL real:

```text
https://<dominio-ngrok>/api/webhooks/onvo
```

Reiniciar Next.js después de cambiar variables. Verificaciones iniciales:

```bash
curl -i https://<dominio-ngrok>/api/webhooks/onvo
curl -i http://localhost:3000/api/cron/onvo-reconcile
curl -i -H 'Authorization: Bearer <CRON_SECRET>' http://localhost:3000/api/cron/onvo-reconcile
```

El webhook solo acepta `POST`; el cron sin autenticación debe responder `401`
cuando está configurado. Nunca copies secretos a evidencias o capturas.

## Preparación de usuarios y datos

Crear por la UI un Student distinto para cada escenario: `success`, `delayed`,
`missing`, `partial`, `concurrency`, `renewal` y `isolation`. Todos deben tener
correo verificado. Elegir un Level activo y premium real; para autorización
final debe contener al menos un recurso `PUBLISHED`, activo y de audiencia
`STUDENT` o `BOTH`, creado mediante el flujo editorial.

Antes de cada prueba ejecutar la auditoría de solo lectura:

```bash
pnpm onvo:audit -- --email=student-success@dominio.test --level=1
```

Precondición de compra inicial: `payments: []` y `subscription: null` para ese
usuario/nivel. El script nunca muestra llaves, teléfono completo ni
identificación completa.

## Datos SINPE oficiales de Sandbox

| Resultado | Número | Comportamiento esperado |
| --- | --- | --- |
| Éxito | `+50688888888` | `succeeded` aproximadamente 15 segundos después |
| Éxito retrasado | `+50688884444` | `succeeded` aproximadamente 6 minutos después |
| Sin transferencia | `+50688889521` | permanece pendiente |
| Parcial | `+50688883333` | recibe 50 % y luego completa el restante |

Usar la identificación oficial documentada para Sandbox `01-1393-1919`, con
tipo `0`. No corresponde a una cédula que deba sustituirse por datos personales
reales y nunca se debe enviar dinero durante estas pruebas.

## A — Compra exitosa

1. Iniciar sesión, abrir `/dashboard/student/explore`, elegir Primer año y
   pulsar `Desbloquear nivel`.
2. Elegir plan y SINPE, usar `+50688888888` y confirmar una sola vez.
3. Registrar tiempos T0–T10: inicio, `Payment` local, intent, método,
   confirmación, `processing`, simulación, webhook, aplicación, suscripción y
   acceso.
4. Confirmar en la página de estado que no muestra éxito antes del webhook.
5. Ejecutar nuevamente `pnpm onvo:audit ...`.
6. Debe existir exactamente un pago `SUCCEEDED` con `appliedAt`, un intent ONVO
   y una suscripción `userId + levelId` vigente.
7. Regresar a Explorar, entrar al nivel y abrir materia, módulo y recurso.

## B — Éxito retrasado

Usar `+50688884444`. Durante los primeros minutos refrescar, cerrar/reabrir la
pestaña, volver a Explorar e intentar las rutas de contenido. Debe seguir
bloqueado. Solo después de `payment-intent.succeeded` debe aparecer
`appliedAt` y habilitarse el acceso, una vez.

## C — Sin transferencia y recuperación

Usar `+50688889521`. La intención puede permanecer `processing`; no debe crear
acceso. Tras 30 minutos, la UI permite `Cancelar intento y volver a intentar`.
La acción vuelve a consultar ONVO, cancela únicamente si aún está pendiente y
reconcilia el resultado. Un pago que cambió a `succeeded` durante la carrera se
aplica en lugar de cancelarse silenciosamente.

## D — Pago parcial

Usar `+50688883333`. En el primer 50 %, `receivedAmountMinor` puede avanzar,
pero `Payment.appliedAt` y `Subscription` deben permanecer ausentes. El acceso
se concede únicamente cuando ONVO devuelve el intent definitivo `succeeded`
con el monto completo.

## E — Webhook duplicado

Después de A, reenviar el evento desde las herramientas de ONVO o repetir la
entrega autenticada conservando exactamente el `paymentIntentId`. El segundo
procesamiento debe resultar `ALREADY_APPLIED`; `currentPeriodEnd` no cambia.
La segunda entrega debe responder como duplicada sin crear otro
`WebhookReceipt`; `currentPeriodEnd` no cambia.

## F — Concurrencia

Probar doble clic, dos pestañas y dos solicitudes con el mismo
`checkoutRequestId`. Luego probar dos IDs distintos casi simultáneos para el
mismo usuario/nivel. La restricción parcial de PostgreSQL debe dejar un solo
pago abierto. Si ya hay una intención abierta, ambas pantallas deben converger
al mismo `Payment`.

## G — Webhook perdido y conciliación manual

1. Iniciar un pago exitoso y deshabilitar temporalmente la entrega Sandbox del
   webhook, sin alterar la base de datos.
2. Esperar a que ONVO muestre `succeeded`; el pago local debe seguir pendiente y
   sin acceso.
3. Invocar la ruta real:

```bash
curl -i -H 'Authorization: Bearer <CRON_SECRET>' http://localhost:3000/api/cron/onvo-reconcile
```

4. Repetirla. La primera debe aplicar el pago y la segunda no debe extender el
   período otra vez. Reactivar el webhook y reenviarlo; tampoco debe duplicar.

## H — Seguridad del webhook

Enviar el mismo sobre sin cabecera, con secreto incorrecto y con JSON
manipulado. Deben resultar `401`, `401` y rechazo/revisión sin acceso. Un
`mobile-transfer.received` se registra pero no concede acceso. El servidor
siempre recupera el intent directamente desde ONVO antes de decidir.

## I — Manipulación y aislamiento

Alterar `levelId`, plan, monto, `userId`, `paymentId` y URL desde DevTools. El
precio y producto deben seguir saliendo del catálogo del servidor. Un usuario B
no debe consultar el pago de A. Comprar Primer año no debe habilitar Segundo.

## J — Renovación, plan y cancelación vigente

Con un usuario ya pagado, renovar mensual→mensual y mensual→anual. Debe
reutilizar la misma `Subscription`, conservar cada `Payment` histórico y
extender desde `currentPeriodEnd`, incluso si el estado administrativo era
`CANCELED` pero el período pagado seguía vigente. EduNivel no tiene cobro
automático ni una operación de cancelación de renovación: `CANCELED` representa
un estado administrativo, no la cancelación de un mandato recurrente ONVO.

## K — Reembolso total manual

1. Abrir `/dashboard/admin/payments` y preparar el caso del pago Sandbox.
2. Copiar su PaymentIntent y ejecutar únicamente un reembolso total desde el
   Dashboard de ONVO.
3. Copiar el `refundId` devuelto por ONVO y registrarlo en EduNivel.
4. Si ONVO responde `pending`, el Payment continúa exitoso y el acceso no cambia.
5. Al llegar a `succeeded`, el Payment pasa a `REFUNDED`, el refund conserva su
   ID y `appliedAt`, y la suscripción se reconstruye con los demás pagos.
6. Repetir la conciliación y el cron: las fechas no deben cambiar otra vez.
7. Probar un ID ajeno, monto parcial y modo incorrecto: todos quedan rechazados
   o en revisión sin recalcular automáticamente el acceso.

## Evidencia y matriz

Guardar por prueba: hora, acción, estado UI, `paymentId`, intent ID, estado
ONVO, `WebhookReceipt`, `Subscription` y decisión de acceso. No guardar
secretos ni payload bancario completo.

| ID | Escenario | Resultado requerido | Estado |
| --- | --- | --- | --- |
| A | Éxito | Un pago, un derecho | PENDIENTE E2E |
| B | Retrasado | Sin acceso temprano | PENDIENTE E2E |
| C | Sin transferencia | Nunca desbloquea; permite recuperación | PENDIENTE E2E |
| D | Parcial | Espera monto completo | PENDIENTE E2E |
| E | Webhook duplicado | Idempotente | PENDIENTE E2E |
| F | Concurrencia | Un solo intento abierto | PENDIENTE E2E |
| G | Webhook perdido | Cron manual recupera una vez | PENDIENTE E2E |
| H | Firma/secreto inválido | Rechazado | PENDIENTE E2E |
| I | Manipulación/aislamiento | Inocuo y separado | PENDIENTE E2E |
| J | Renovación/cambio | Mismo derecho, tiempo conservado | PENDIENTE E2E |
| K | Reembolso total | Acceso recalculado | PENDIENTE E2E |

No cambiar esta tabla a PASS sin conservar la evidencia correspondiente.
