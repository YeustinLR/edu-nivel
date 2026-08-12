# EduNivel

Plataforma educativa costarricense para primaria y secundaria, alineada al
currículo del MEP.

[![CI](https://github.com/YeustinLR/edu-nivel/actions/workflows/ci.yml/badge.svg)](https://github.com/YeustinLR/edu-nivel/actions/workflows/ci.yml)

## ✨ Características

- Contenidos organizados por nivel, materia, módulo y recurso.
- Recursos educativos, ejercicios y evaluaciones con corrección automática.
- Dashboards diferenciados para estudiantes, docentes, colaboradores y administradores.
- Seguimiento de progreso personal para estudiantes y docentes.
- Flujo editorial con borradores, revisión, publicación y despublicación.
- Registro, inicio de sesión, verificación de correo y recuperación mediante Email OTP.
- Suscripciones mensuales y anuales para estudiantes y docentes.
- Pagos en colones costarricenses mediante SINPE Móvil con ONVO.
- Almacenamiento privado de PDF e imágenes mediante Cloudflare R2.
- Tema claro y oscuro.

## 🔄 Cómo funciona

1. Los estudiantes y docentes se registran y verifican su correo mediante un código OTP.
2. Según el rol, cada usuario accede a su dashboard correspondiente.
3. El contenido se organiza como `Nivel → Materia → Módulo → Recurso`.
4. Los colaboradores crean contenido y lo envían a revisión.
5. Los administradores revisan, publican y administran el catálogo educativo.
6. Los usuarios pueden adquirir acceso premium por nivel mediante una suscripción.
7. ONVO procesa el pago por SINPE Móvil y su webhook actualiza el estado de la suscripción.
8. Los archivos privados se cargan y descargan mediante URLs temporales de Cloudflare R2 cuando esta integración está habilitada.

> El proyecto continúa en desarrollo. La autenticación, los dashboards, el catálogo
> educativo y el flujo editorial están implementados. Resend, ONVO y R2 requieren
> configuración de sus respectivas cuentas y credenciales.

## 🛠️ Tecnologías

| Tecnología | Versión / uso |
| --- | --- |
| [Next.js](https://nextjs.org/) | 16.2.6, App Router y servidor |
| [React](https://react.dev/) | 19.2.4 |
| [TypeScript](https://www.typescriptlang.org/) | 5.9.3 |
| [Tailwind CSS](https://tailwindcss.com/) | 4.3.0 |
| [Better Auth](https://www.better-auth.com/) | 1.6.22, autenticación y sesiones |
| [Prisma](https://www.prisma.io/) | 7.8.0, ORM y migraciones |
| PostgreSQL / Neon | Base de datos |
| Resend | Correos transaccionales |
| ONVO | Pagos por SINPE Móvil |
| Cloudflare R2 | Archivos privados |
| Vitest | 4.1.10, pruebas |
| pnpm | 11.3.0 |

## 📦 Instalación

### Requisitos

- Node.js 22.
- pnpm 11.3.0.
- PostgreSQL local o una base de datos de desarrollo en Neon.

### Desarrollo

```bash
# Clonar el repositorio
git clone https://github.com/YeustinLR/edu-nivel.git
cd edu-nivel

# Crear la configuración local
cp .env.example .env
```

Antes de instalar las dependencias, configura al menos estas variables en `.env`:

```dotenv
DATABASE_URL="postgresql://usuario:clave@host-pooler/base"
BETTER_AUTH_SECRET="una-clave-segura-de-al-menos-32-caracteres"
BETTER_AUTH_URL="http://localhost:3000"
```

Después ejecuta:

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

`pnpm db:migrate` utiliza `prisma migrate dev`, por lo que debe ejecutarse
únicamente contra una base de datos de desarrollo. La referencia completa de
variables está en [`.env.example`](.env.example).

### Producción

```bash
pnpm db:migrate:deploy
pnpm build
pnpm start
```

## 💳 Planes de suscripción

| Plan | Mensual | Anual | Descripción |
| --- | ---: | ---: | --- |
| **Estudiante** | ₡3 500 | ₡33 600 | Contenidos y evaluaciones del nivel educativo |
| **Docente** | ₡6 500 | ₡62 400 | Materiales, pruebas y planeamientos alineados al MEP |

El acceso premium se asigna por nivel educativo y se registra en el sistema
después de la confirmación del pago.

## 🖼️ Capturas de pantalla

Las capturas de la aplicación se almacenarán en [`docs/screenshots/`](docs/screenshots/).

Actualmente están pendientes de agregar:

- Landing page.
- Dashboard de estudiante.
- Dashboard de docente.
- Panel de colaborador.
- Panel de administración.
- Flujo de suscripción y pago.

## 📁 Estructura del proyecto

```text
edu-nivel/
├── docs/                    # Documentación técnica y capturas
├── prisma/                  # Esquema y migraciones de PostgreSQL
├── public/                  # Archivos estáticos
├── scripts/                 # Operaciones administrativas
├── src/
│   ├── app/                 # Páginas, layouts y API
│   ├── config/              # Validación de variables de entorno
│   ├── generated/           # Cliente de Prisma generado
│   ├── modules/             # Dominios de autenticación, contenido y pagos
│   ├── server/              # Servicios server-side
│   └── proxy.ts             # Filtro temprano de rutas privadas
├── .env.example
├── package.json
├── prisma.config.ts
└── README.md
```

## 📚 Documentación

- [Flujo de autenticación](docs/auth-flow.md)
- [Arquitectura del dashboard](docs/dashboard-architecture.md)
- [Modelo de datos y ERD](docs/erd.md)
- [Neon, Prisma y R2](docs/neon-r2-deployment.md)
- [ONVO y SINPE Móvil](docs/onvo-sinpe-sandbox.md)

## 🧪 Scripts disponibles

| Comando | Función |
| --- | --- |
| `pnpm dev` | Iniciar el entorno de desarrollo |
| `pnpm build` | Compilar el proyecto |
| `pnpm start` | Iniciar la compilación de producción |
| `pnpm lint` | Ejecutar ESLint |
| `pnpm test` | Ejecutar pruebas unitarias |
| `pnpm test:integration` | Ejecutar pruebas con PostgreSQL |
| `pnpm check` | Ejecutar lint, TypeScript y pruebas unitarias |
| `pnpm db:migrate` | Crear y aplicar migraciones de desarrollo |
| `pnpm db:migrate:deploy` | Aplicar migraciones versionadas |
| `pnpm db:studio` | Abrir Prisma Studio |
| `pnpm admin:promote -- --email=admin@ejemplo.com` | Promover una cuenta verificada a administrador |

## 👥 Autores

- **YeustinLR** — [GitHub](https://github.com/YeustinLR)
- **Eric.V**

El repositorio no contiene actualmente un archivo de licencia. No debe asumirse
permiso de uso, modificación o redistribución hasta que se publique una licencia
explícita.
