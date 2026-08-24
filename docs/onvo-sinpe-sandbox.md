# ONVO SINPE Móvil

## Alcance y estado

EduNivel implementa pagos únicos por SINPE Móvil para crear o renovar acceso a
un nivel. No usa ONVO Subscriptions, Checkout hospedado, tarjetas ni SINPE PIN.
Cada renovación mensual o anual requiere un nuevo pago.

El repositorio demuestra:

- creación, confirmación y consulta de intenciones ONVO;
- creación del método `mobile_number`;
- pagos históricos y suscripciones por nivel en PostgreSQL;
- webhook autenticado;
- conciliación manual y programada;
- pruebas unitarias, de integración y una prueba E2E manual opcional.

El repositorio no demuestra que una cuenta ONVO, webhook, llaves Sandbox o Live,
dominio público o despliegue de Vercel estén configurados actualmente. Tampoco
demuestra una prueba real en producción. Esos pasos requieren el Dashboard y
credenciales externas.

## Variables

Ejemplo de Sandbox:

```dotenv
ONVO_ENV="test"
ONVO_LIVE_ENABLED="false"
ONVO_SECRET_KEY="onvo_test_secret_key_reemplaza_con_tu_llave"
ONVO_WEBHOOK_SECRET="webhook_secret_reemplaza_con_el_valor_real"
ONVO_SINPE_DESTINATION_NUMBER="+50670196686"
CRON_SECRET="reemplaza-con-un-secreto-aleatorio-largo"
```

Reglas implementadas en `src/config/env.ts`:

- `ONVO_ENV` acepta `test` o `live`;
- `ONVO_ENV` y `ONVO_SECRET_KEY` deben aparecer juntas;
- una llave de prueba debe comenzar con `onvo_test_secret_key_`;
- una llave en vivo debe comenzar con `onvo_live_secret_key_`;
- Live exige además `ONVO_LIVE_ENABLED=true` y `VERCEL_ENV=production`, por lo
  que una llave Live no puede activarse accidentalmente en localhost o Preview;
- el secreto del webhook debe comenzar con `webhook_secret_`;
- cuando ONVO está habilitado, webhook, número destino y `CRON_SECRET` son
  obligatorios;
- `CRON_SECRET` debe tener al menos 16 caracteres.

Las llaves son exclusivamente server-side y nunca deben utilizar
`NEXT_PUBLIC_`.

El número destino predeterminado de ONVO está tanto en la configuración como en
la pantalla de estado. Si ONVO asigna al comercio un número personalizado, se
debe configurar `ONVO_SINPE_DESTINATION_NUMBER`.

## Catálogo vigente

Los montos internos se guardan en la unidad menor de CRC:

| Plan | Rol | Duración | Monto mostrado |
| --- | --- | ---: | ---: |
| `STUDENT_MONTHLY` | `STUDENT` | 1 mes | ₡3 500 |
| `STUDENT_YEARLY` | `STUDENT` | 12 meses | ₡33 600 |
| `TEACHER_MONTHLY` | `TEACHER` | 1 mes | ₡6 500 |
| `TEACHER_YEARLY` | `TEACHER` | 12 meses | ₡62 400 |

El servidor obtiene el precio desde
`src/modules/subscriptions/config/plan-catalog.ts`; no confía en un monto
enviado por el navegador.

## Flujo del usuario

1. Un estudiante o docente abre `/dashboard/subscription`.
2. Elige un nivel activo y un plan permitido para su rol.
3. Ingresa el teléfono SINPE del pagador, tipo de identificación e
   identificación asociada a la cuenta desde la que transferirá.
4. La Server Action valida y normaliza los datos.
5. EduNivel crea un `Payment` local con el monto, rol, producto, intervalo y
   `levelId` como instantánea histórica.
6. El servidor crea una intención de pago en ONVO.
7. El servidor crea un método `mobile_number`.
8. El servidor confirma la intención con ese método.
9. El usuario llega a
   `/dashboard/subscription/payments/{paymentId}`.
10. En modo Live, la página muestra el monto exacto y el número destino al que
    debe hacer el SINPE. En Sandbox indica que no debe enviar dinero real.
11. El acceso solo se activa después de volver a consultar ONVO y verificar una
    intención exitosa.

Por tanto, el botón inicial no “verifica una transferencia ya realizada” con
una sola petición. Prepara el pago mediante varias solicitudes servidor a ONVO
antes de que ONVO pueda asociar la transferencia.

La identificación debe corresponder a la cuenta bancaria emisora. La
documentación oficial indica que ONVO intenta asociar primero por
identificación; una identificación distinta puede impedir la asociación
automática.

## Validación del checkout

El servidor comprueba:

- sesión y correo verificado;
- rol `STUDENT` o `TEACHER`;
- plan compatible con el rol;
- nivel existente, activo y premium;
- teléfono costarricense de ocho dígitos, normalizado a `+506...`;
- tipo de identificación permitido por el esquema;
- identificación con el formato exacto documentado para su tipo (`0`, `1`,
  `2`, `3`, `4`, `5` o `9`);
- UUID de idempotencia `checkoutRequestId`.

Si se repite el mismo `checkoutRequestId`, se devuelve el pago existente del
mismo usuario. Un ID perteneciente a otra persona se rechaza.

Solo se conservan los últimos cuatro caracteres del teléfono y de la
identificación en `Payment`; no se persisten completos en esos campos.

## Aplicación del pago

Antes de conceder acceso,
`reconcileOnvoPaymentIntent()` recupera directamente la intención desde ONVO y
compara contra el pago local:

- ID y modo del proveedor;
- monto esperado/recibido;
- moneda;
- referencias y metadata;
- estado;
- instantánea del plan, producto, duración y rol;
- correo verificado y rol actual del usuario.

Una intención `succeeded` se aplica en una transacción serializable. La
suscripción se crea o actualiza con identidad `userId + levelId`, y el periodo
se amplía según la duración comprada. `Payment.appliedAt` impide aplicar dos
veces el mismo pago.

Resultados locales:

| Estado ONVO | Resultado local |
| --- | --- |
| `processing` | `PROCESSING` |
| `succeeded` y verificaciones válidas | `SUCCEEDED` y suscripción aplicada |
| `canceled` | `CANCELED` |
| `requires_payment_method` | `FAILED` |
| `failed` | `FAILED` |
| `refunded` | crea alerta administrativa hasta registrar el `refundId` |
| `partially_refunded` | conserva acceso y exige seguimiento administrativo |
| estado o datos inesperados | `REQUIRES_REVIEW` |

`Payment.levelId`, no `User.selectedLevelId`, determina el nivel desbloqueado.

## Webhook

Endpoint:

```text
POST /api/webhooks/onvo
X-Webhook-Secret: {ONVO_WEBHOOK_SECRET}
```

Eventos que disparan conciliación:

- `payment-intent.succeeded`;
- `payment-intent.failed`;
- `payment-intent.deferred`.

Otros eventos válidos se registran como ignorados. El endpoint:

1. exige que el secreto esté configurado;
2. compara `X-Webhook-Secret` sin una comparación de texto directa;
3. valida JSON y estructura;
4. toma el ID de la intención;
5. vuelve a consultar ONVO;
6. registra un `WebhookReceipt` con hash y resultado;
7. aplica el pago de manera idempotente.

El cuerpo del webhook no se usa por sí solo como prueba de pago exitoso.

### Exposición local

Para recibir webhooks durante una prueba local se necesita una URL HTTPS pública,
por ejemplo un túnel:

```bash
ngrok http 3000
```

Luego se registra en el Dashboard de ONVO:

```text
https://subdominio-temporal.example/api/webhooks/onvo
```

Se debe copiar el secreto real generado por ONVO a
`ONVO_WEBHOOK_SECRET` y reiniciar Next.js. El repositorio no puede confirmar que
esta configuración externa se haya realizado.

## Conciliación manual

La página de estado ofrece `Consultar estado en ONVO`. La Server Action:

- exige el usuario autenticado;
- busca el pago por `paymentId + userId`;
- espera al menos cinco segundos desde la última actualización;
- consulta ONVO y vuelve a la página del pago.

El navegador también refresca la vista cada cinco segundos mientras el pago está
pendiente y todavía no se considera estancado. El refresco visual no llama por
sí mismo a ONVO.

Después de 30 minutos en procesamiento, la interfaz marca el intento como
demorado y deja de refrescar automáticamente. El usuario puede pedir una
cancelación: EduNivel consulta primero ONVO, cancela la intención únicamente si
sigue pendiente y vuelve a conciliar. Si el intent llegó a éxito durante la
carrera, se aplica en vez de descartarse.

Si la respuesta de creación se perdió antes de guardar el ID externo, la
conciliación busca intenciones ONVO por ventana temporal y por la metadata
completa del pago. Solo enlaza una coincidencia única. Una búsqueda completa
sin resultados libera el intento local después de 30 minutos; resultados
múltiples o una búsqueda incompleta requieren revisión.

## Conciliación programada

`vercel.json` configura:

```text
0 2 * * *  -> GET /api/cron/onvo-reconcile
```

El horario es UTC. Vercel envía:

```text
Authorization: Bearer {CRON_SECRET}
```

La ruta:

- devuelve `{ enabled: false }` si `CRON_SECRET` no existe;
- devuelve 401 si el token no coincide;
- procesa como máximo 20 pagos por ejecución;
- selecciona pagos `INITIALIZING` o `PROCESSING` con intención externa y también
  intentos huérfanos sin ID externo para recuperación;
- espera al menos cinco minutos desde su última actualización;
- marca `staleAt` después de 30 minutos, sin cerrar el pago;
- continúa procesando el lote aunque una conciliación individual falle;
- vuelve a consultar reembolsos registrados que continúan `PENDING`;
- responde 500 cuando el resumen contiene fallos.

## Reembolsos manuales

EduNivel no invoca `POST /v1/refunds`. El administrador abre **Cobros**,
prepara el caso local, ejecuta un reembolso total en el Dashboard de ONVO y
registra el `refundId`. El servidor consulta `GET /v1/refunds/{id}` y verifica
PaymentIntent, modo, moneda y monto completo.

- `pending`: no modifica el acceso y queda disponible para cron/consulta.
- `failed`: conserva el acceso y registra el fallo.
- `succeeded` total: marca el Payment `REFUNDED` y reconstruye el periodo con
  los demás pagos válidos.
- parcial o inconsistente: `REQUIRES_REVIEW`, sin ajuste automático.

Cada aplicación usa una transacción serializable y `PaymentRefund.appliedAt`.
Repetir la consulta no resta meses nuevamente. La API pública de ONVO exige
conocer el ID para consultar el objeto; por eso copiarlo al caso local es un
paso obligatorio del procedimiento.

La frecuencia diaria es compatible con Vercel Hobby. En ese plan la invocación
puede ocurrir en cualquier momento dentro de la hora programada. El webhook y la
consulta manual son las vías más oportunas; el cron es una recuperación tardía.

Vercel no garantiza reintentos automáticos del cron, por lo que sus logs deben
monitorizarse.

## Números oficiales de Sandbox

Estos números aparecen en la documentación oficial actual de ONVO y solo deben
usarse con llaves `onvo_test_`:

| Escenario | Teléfono | Comportamiento documentado |
| --- | --- | --- |
| Exitoso | `+50688888888` | Transferencia correcta aproximadamente 15 segundos después |
| Exitoso con retraso | `+50688884444` | Transferencia correcta aproximadamente 6 minutos después |
| Fallido/sin transferencia | `+50688889521` | No simula transferencia; la intención permanece pendiente |
| Parcial | `+50688883333` | Simula 50 % y luego el 50 % restante |

No se debe transferir dinero real durante estas pruebas. ONVO documenta para
Sandbox la identificación `01-1393-1919` con tipo `0`; no debe sustituirse por
la cédula real de una persona.

Como los escenarios pertenecen a un servicio externo y pueden cambiar, deben
verificarse en la documentación oficial de ONVO antes de una campaña de
pruebas.

## Pruebas del repositorio

### Pruebas normales

`pnpm test` cubre, entre otros puntos:

- esquema de entrada;
- respuestas ONVO esperadas;
- ciclo de estados;
- conciliación;
- idempotencia;
- webhook;
- cron.

`pnpm test:integration` ejecuta pruebas con PostgreSQL, incluyendo la aplicación
transaccional de pagos. En CI se usa un servicio PostgreSQL 16.

### Prueba E2E manual de Sandbox

La certificación vigente se ejecuta con la guía:

```text
docs/onvo-gate-1-local.md
```

Incluye éxito, demora, ausencia, parcial, duplicados, concurrencia, webhook
perdido, conciliación manual, aislamiento, renovación y reembolso. El comando
`pnpm onvo:audit -- --email=... --level=1` produce una instantánea de evidencia
de solo lectura y sin datos completos del pagador.

## Paso a modo Live

Antes de usar `ONVO_ENV=live`:

- completar onboarding y habilitación con ONVO;
- obtener una llave `onvo_live_secret_key_...`;
- configurar conscientemente `ONVO_LIVE_ENABLED=true` solo en Production;
- registrar y probar el webhook del dominio definitivo;
- confirmar el número SINPE destino asignado;
- ejecutar pruebas extremo a extremo controladas;
- comprobar montos, metadata, idempotencia y acceso por nivel;
- configurar `CRON_SECRET` y revisar cron/logs en Vercel;
- definir monitoreo y un procedimiento para `REQUIRES_REVIEW`;
- no mezclar llaves ni datos de Sandbox y Live.

Nada en el repositorio confirma que estos pasos de producción ya se hayan
completado.

## Referencias oficiales

- [SINPE Móvil en ONVO](https://docs.onvopay.com/payments/sinpe-mobile)
- [Métodos de prueba de ONVO](https://docs.onvopay.com/payments/testing)
- [Webhooks de ONVO](https://docs.onvopay.com/webhooks)
- [Reembolsos de ONVO](https://docs.onvopay.com/payments/refunds)
- [Cron Jobs de Vercel](https://vercel.com/docs/cron-jobs)
- [Límites de Cron Jobs](https://vercel.com/docs/cron-jobs/usage-and-pricing)
