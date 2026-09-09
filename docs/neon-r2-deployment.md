# Neon, Prisma y Cloudflare R2

## Estado verificable

El repositorio demuestra:

- Prisma configurado para PostgreSQL;
- migraciones versionadas;
- conexión pooled para la aplicación;
- conexión directa opcional para Prisma CLI;
- integración R2 para carga directa, confirmación, descarga protegida y
  limpieza;
- dos cron jobs diarios declarados en `vercel.json`;
- validación de las variables necesarias.

El repositorio no puede demostrar por sí solo:

- que exista una rama concreta de Neon;
- que las migraciones se hayan aplicado a una base externa;
- que existan buckets de R2 o políticas CORS;
- que Vercel tenga cargadas las variables;
- que un despliegue de producción esté activo.

Por tanto, estos puntos se presentan como pasos de configuración externa y no
como producción confirmada.

## Inventario de variables

`src/config/env.ts` valida estas variables server-side:

| Variable | Requisito actual |
| --- | --- |
| `NODE_ENV` | `development`, `test` o `production`; predeterminado `development` |
| `DATABASE_URL` | Obligatoria y con formato URL |
| `BETTER_AUTH_SECRET` | Obligatoria, mínimo 32 caracteres y sin el placeholder en producción |
| `BETTER_AUTH_URL` | Obligatoria y con formato URL |
| `RESEND_API_KEY` | Opcional en desarrollo/pruebas; obligatoria en producción |
| `EMAIL_FROM` | Opcional en desarrollo/pruebas; obligatoria en producción |
| `CONTACT_WHATSAPP_NUMBER` | Solo dígitos con código de país; tiene un valor predeterminado |
| `ONVO_ENV` | Opcional; `test` o `live` |
| `ONVO_SECRET_KEY` | Opcional, pero obligatoria si existe `ONVO_ENV`, y viceversa |
| `ONVO_WEBHOOK_SECRET` | Opcional; debe usar el prefijo validado |
| `ONVO_SINPE_DESTINATION_NUMBER` | Requerido cuando ONVO está configurado; la interfaz no usa destinos predeterminados |
| `CRON_SECRET` | Opcional en general, mínimo 16 caracteres; obligatorio al habilitar R2 |
| `VERCEL_ENV` | Opcional; `development`, `preview` o `production` |
| `R2_UPLOADS_ENABLED` | `true` o `false`; predeterminado `false` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Obligatorias cuando R2 está habilitado |

`DATABASE_URL_UNPOOLED` figura en `.env.example` y se lee directamente desde
`prisma.config.ts` y `scripts/promote-admin.ts`; no forma parte del objeto
exportado por `src/config/env.ts`.

`VERCEL_ENV` normalmente lo proporciona Vercel. `NODE_ENV` y `VERCEL_ENV` no
representan lo mismo: el primero describe el modo de Node/Next y el segundo el
tipo de entorno de despliegue de Vercel.

## Neon y Prisma

### Conexiones

| Variable | Uso real |
| --- | --- |
| `DATABASE_URL` | Conexión pooled utilizada por `src/server/db/prisma.ts` durante la ejecución |
| `DATABASE_URL_UNPOOLED` | Conexión directa opcional que `prisma.config.ts` prioriza para Prisma CLI |

Si `DATABASE_URL_UNPOOLED` no existe, `prisma.config.ts` usa `DATABASE_URL` como
respaldo. `src/config/env.ts` valida `DATABASE_URL`, pero no consume
`DATABASE_URL_UNPOOLED`; esta última pertenece al proceso de Prisma CLI y al
script administrativo.

Ejemplo sin credenciales reales:

```dotenv
DATABASE_URL="postgresql://usuario:clave@host-pooler/base?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://usuario:clave@host/base?sslmode=require"
```

En Neon, la URL que contiene `-pooler` en el host es la conexión pooled. Cuando
Neon proporcione una conexión sin pooler, debe guardarse en
`DATABASE_URL_UNPOOLED`. Si una rama solo muestra la pooled, las herramientas
pueden usar temporalmente `DATABASE_URL`, pero conviene obtener la directa para
migraciones y tareas administrativas.

### Separación de entornos

La convención operativa es usar una rama de Neon independiente para desarrollo
local y otra base o rama para producción. Cada rama tiene datos y migraciones
aplicadas de forma independiente aunque pertenezca al mismo proyecto de Neon.

Esta separación no se puede imponer desde el código: depende de qué URL coloque
cada entorno en sus variables. Antes de ejecutar una migración, se debe
comprobar en Neon que el host y la rama sean los esperados.

No deben copiarse datos personales o pagos reales a una rama de desarrollo sin
un proceso explícito de anonimización.

### Scripts existentes

Todos estos comandos existen en `package.json`:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:migrate:deploy
pnpm db:studio
pnpm admin:promote -- --email=administrador@ejemplo.com
```

- `db:generate`: genera Prisma Client.
- `db:migrate`: ejecuta `prisma migrate dev`; solo para desarrollo.
- `db:migrate:deploy`: aplica migraciones pendientes ya versionadas.
- `db:studio`: abre Prisma Studio contra la conexión configurada.
- `admin:promote`: busca un correo normalizado, exige que exista y esté
  verificado, y cambia su rol a `ADMIN`.

No existe un comando equivalente para promover a `COLLABORATOR`. Ese rol no
puede registrarse públicamente y su aprovisionamiento requiere una operación
administrativa explícita que todavía no está encapsulada en un script del
repositorio.

### Orden de preparación y despliegue

Las variables deben existir antes de ejecutar las migraciones:

```bash
pnpm install --frozen-lockfile
pnpm db:migrate:deploy
pnpm db:generate
pnpm check
pnpm build
```

`postinstall` también ejecuta `prisma generate`, por lo que la llamada explícita
es redundante si la instalación finalizó correctamente, pero resulta útil como
verificación controlada.

`pnpm build` ejecuta solamente `next build`; no aplica migraciones. En
producción o staging se usa `prisma migrate deploy`, nunca `prisma migrate dev`.
Las migraciones deben ejecutarse una vez por un paso controlado antes de
desplegar código que dependa de ellas.

El workflow `.github/workflows/ci.yml` levanta PostgreSQL 16, ejecuta
`prisma migrate deploy`, `pnpm check`, las pruebas de integración y
`pnpm build`. Ese workflow valida el repositorio, pero no migra Neon ni
despliega Vercel.

## Cloudflare R2

### Variables

```dotenv
R2_UPLOADS_ENABLED="true"
R2_ACCOUNT_ID="reemplaza-con-el-account-id"
R2_ACCESS_KEY_ID="reemplaza-con-el-access-key-id"
R2_SECRET_ACCESS_KEY="reemplaza-con-el-secret-access-key"
R2_BUCKET_NAME="edunivel-development"
CRON_SECRET="reemplaza-con-un-secreto-aleatorio-largo"
```

Cuando `R2_UPLOADS_ENABLED=true`, `src/config/env.ts` exige las cuatro variables
R2 y `CRON_SECRET`. El endpoint S3 se construye en el servidor:

```text
https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com
```

No existe `R2_ENDPOINT`. Las credenciales nunca deben usar prefijo
`NEXT_PUBLIC_`.

`isR2UploadEnabled()` deshabilita automáticamente las cargas cuando
`VERCEL_ENV=preview`, incluso si la bandera está en `true`. Para pruebas de
staging conviene usar un origen y un bucket de staging estables, no abrir CORS a
todas las previews.

### Recursos externos requeridos

1. Crear buckets privados separados, como mínimo para desarrollo y producción.
2. Crear credenciales S3 limitadas al bucket y operaciones necesarias.
3. Cargar las variables en el entorno correspondiente.
4. Configurar CORS en cada bucket.
5. Mantener desactivado el acceso público al bucket.

No se deben reutilizar credenciales de producción en desarrollo local.

### CORS

El navegador usa una URL prefirmada `PUT` para subir. La descarga actual responde
con una redirección a una URL prefirmada `GET`. Una política inicial compatible
es:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://tu-dominio-de-produccion.example"
    ],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type", "Range"],
    "ExposeHeaders": [
      "Accept-Ranges",
      "Content-Length",
      "Content-Range",
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

Se deben sustituir los dominios de ejemplo por orígenes exactos. `HEAD`,
`CopyObject` y `DeleteObject` se realizan desde Next.js mediante el SDK y no
necesitan CORS. El visor PDF usa `Range` cuando R2 y el documento lo permiten;
por eso el navegador debe poder enviar ese encabezado y leer los encabezados de
respuesta parciales. Añade `HEAD` solo si la verificación en Network demuestra
que el cliente lo necesita.

En producción no se debe usar `*` en `AllowedOrigins`: conserva únicamente los
orígenes exactos de EduNivel.

CORS no autoriza al usuario. Una URL prefirmada funciona como un token portador
y puede reutilizarse hasta vencer; por eso tiene una vida corta y se entrega
solo después de pasar los guards.

## Flujo de carga implementado

1. Un administrador o colaborador autorizado solicita
   `POST /api/uploads/intents`.
2. El servidor valida rol, propiedad/editabilidad del módulo, tipo, MIME y
   tamaño.
3. Se crea `UploadIntent` con claves opacas bajo `pending/` y `resources/`, un
   `reservedResourceId` y vencimiento.
4. El servidor devuelve una URL `PUT` prefirmada por 10 minutos.
5. El navegador envía los bytes directamente a R2 con el `Content-Type`
   firmado.
6. El navegador llama a `POST /api/uploads/[uploadId]/confirm`.
7. Una actualización condicional reclama el estado `PENDING` como
   `PROCESSING`.
8. El servidor ejecuta `HEAD` y comprueba existencia, tamaño, MIME y ETag.
9. Copia a la clave permanente con `CopySourceIfMatch` sobre el ETag observado.
10. En una transacción crea `Resource` con el UUID reservado y su
    `PdfResource` o `ImageResource`, y conecta `uploadIntentId`.
11. Marca la intención `CONFIRMED` y elimina el temporal. Si esa eliminación
    falla, usa `CLEANUP_PENDING`.

Una confirmación repetida devuelve el mismo recurso. Una solicitud concurrente
que encuentra `PROCESSING` recibe estado HTTP 202.

Formatos actuales:

| Tipo | MIME | Límite |
| --- | --- | ---: |
| PDF | `application/pdf` | 50 MiB |
| Imagen | `image/jpeg`, `image/png`, `image/webp` | 10 MiB |

SVG, audio, documentos Office, ZIP y recursos genéricos no forman parte del
flujo R2 actual.

## Imágenes dentro del contenido escrito

El editor BlockNote también permite imágenes intercaladas entre párrafos,
encabezados, tablas y otros bloques. Este flujo es independiente del adjunto
principal del recurso:

1. El navegador solicita `POST /api/content-images/intents` y sube JPEG, PNG o
   WebP mediante la URL PUT prefirmada.
2. `POST /api/content-images/{imageId}/confirm` verifica tamaño, MIME y ETag y
   copia el objeto a `content-images/`.
3. El documento guarda solamente el `imageId`; nunca persiste una clave R2 ni
   una URL prefirmada.
4. Al crear o editar el recurso, el servidor sincroniza sus referencias en
   `resource_content_image` dentro de la misma transacción.
5. `GET /api/content-images/{imageId}/file` comprueba el acceso a alguno de los
   recursos vinculados antes de redirigir a R2.

Cada recurso admite hasta 50 imágenes embebidas, con un máximo de 10 MiB por
archivo. Las cargas abandonadas y las imágenes retiradas del documento se
conservan durante 24 horas y luego son eliminadas por el cron de limpieza.

La confirmación valida metadatos declarados y ETag, pero no inspecciona magic
bytes ni la estructura interna del archivo. Por tanto, no debe describirse como
un análisis antivirus ni como validación profunda del contenido.

## Flujo de descarga

La aplicación recibe:

```text
GET /api/resources/{resourceId}/file
```

El servidor consulta el recurso y aplica autorización:

- administrador: acceso administrativo;
- colaborador: recurso propio o perteneciente a un módulo propio;
- estudiante/docente: publicación, actividad, audiencia y acceso al nivel.

Solo después genera una URL `GET` prefirmada por cinco minutos y redirige al
navegador. Las respuestas normales no aceptan una clave R2 suministrada por el
cliente como prueba de autorización.

Las claves son UUID opacos y no deben incluir correo, cédula, teléfono, nombre
personal ni nombre original del archivo. La ruta de la clave puede ser visible
dentro de una URL prefirmada temporal; su confidencialidad no es el control de
acceso.

## Limpieza programada

`vercel.json` declara:

```text
0 3 * * *  -> GET /api/cron/cleanup-uploads
```

Vercel interpreta el horario en UTC. En el plan Hobby, una ejecución diaria es
compatible, aunque puede ocurrir en cualquier momento dentro de la hora
programada.

Vercel envía:

```text
Authorization: Bearer {CRON_SECRET}
```

La ruta compara el secreto, trabaja en lotes de 50 y recupera:

- intenciones vencidas;
- confirmaciones `PROCESSING` abandonadas durante al menos 30 minutos;
- limpiezas pendientes;
- fallos que pueden volver a reclamarse.

El proceso intenta eliminar temporales y copias permanentes huérfanas, conserva
el objeto de un recurso ya confirmado y registra fallos sin detener todo el
lote. Las operaciones están diseñadas para tolerar nuevas ejecuciones.

Vercel no garantiza reintentos automáticos ante fallos; se deben revisar los
logs y alertas del cron.

## Lista de comprobación externa

### Neon

- [ ] Confirmar que desarrollo usa una rama distinta de producción.
- [ ] Verificar que `DATABASE_URL` apunta al pooler correcto.
- [ ] Configurar `DATABASE_URL_UNPOOLED` cuando Neon la proporcione.
- [ ] Ejecutar `pnpm db:migrate:deploy` contra la base correcta.
- [ ] Ejecutar autenticación y consultas básicas después de migrar.
- [ ] Promover un administrador únicamente después de verificar su correo.

### R2

- [ ] Crear buckets privados por entorno.
- [ ] Crear credenciales de alcance mínimo.
- [ ] Configurar variables sin exponer secretos al cliente.
- [ ] Aplicar CORS con orígenes exactos.
- [ ] Probar PDF e imágenes válidas y rechazos por MIME/tamaño.
- [ ] Probar concurrencia e idempotencia de confirmación.
- [ ] Probar descarga para propietario, rol incorrecto y nivel premium.
- [ ] Revisar la ejecución y los logs del cron.

### Despliegue

- [ ] Configurar primero todas las variables necesarias.
- [ ] Aplicar migraciones fuera de `next build`.
- [ ] Ejecutar `pnpm check` y `pnpm build`.
- [ ] Verificar Resend, ONVO y R2 por separado en el entorno destino.
- [ ] No declarar producción lista basándose solamente en una compilación
      exitosa.

## Referencias oficiales

- [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate)
- [Conectar Neon con Prisma](https://neon.com/docs/guides/prisma)
- [URLs prefirmadas de Cloudflare R2](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [CORS en Cloudflare R2](https://developers.cloudflare.com/r2/buckets/cors/)
- [Cron Jobs de Vercel](https://vercel.com/docs/cron-jobs)
