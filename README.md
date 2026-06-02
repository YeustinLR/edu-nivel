# EduNivel

> Plataforma educativa costarricense para primaria y secundaria, alineada al currículo del MEP.

## ✨ Características

- Contenidos organizados por nivel educativo (1° a 6° primaria, 7° a 11° secundaria)
- Ejercicios interactivos y evaluaciones con corrección automática
- Dashboard de seguimiento para docentes
- Modelo de suscripción flexible (estudiante, docente e institución)
- Pago en colones costarricenses vía Tilopay
- Tema oscuro y claro

## 🛠️ Tecnologías

| Tecnología | Versión |
|------------|---------|
| [Next.js](https://nextjs.org/) | 16.2.6 |
| [React](https://react.dev/) | 19.2.4 |
| [TypeScript](https://www.typescriptlang.org/) | ^5 |
| [Tailwind CSS](https://tailwindcss.com/) | ^4 |
| [Lucide React](https://lucide.dev/) | ^1.16 |
| [next-themes](https://github.com/pacocoursey/next-themes) | ^0.4 |
| [pnpm](https://pnpm.io/) | — |

## 📦 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/edu-nivel.git
cd edu-nivel

# Instalar dependencias
pnpm install

# Iniciar en desarrollo
pnpm dev

# Construir para producción
pnpm build

# Iniciar servidor de producción
pnpm start

# Linter
pnpm lint
```

## 💳 Planes de suscripción

| Plan | Mensual | Anual | Descripción |
|------|---------|-------|-------------|
| **Estudiante** | ₡3 500 | ₡33 600 | Contenidos y ejercicios del nivel |
| **Docente** | ₡6 500 | ₡62 400 | Todo lo de Estudiante + dashboard grupal (hasta 40 estudiantes) |
| **Institución** | A consultar | A consultar | Usuarios ilimitados, panel centralizado, integración |

Prueba gratuita de 14 días — sin tarjeta requerida.

## 📁 Estructura del proyecto

```
edu-nivel/
├── public/                  # Archivos estáticos (SVGs, imágenes)
├── src/
│   ├── app/                 # Páginas y layout principal
│   │   ├── globals.css      # Estilos globales Tailwind
│   │   ├── layout.tsx       # Layout raíz (fuentes, theme)
│   │   └── page.tsx         # Página principal (landing)
│   ├── components/
│   │   └── landing/
│   │       ├── faq/         # Preguntas frecuentes
│   │       ├── hero/        # Sección hero principal
│   │       ├── layout/      # Navbar, Footer, ThemeToggle
│   │       ├── pricing/     # Tarjetas de precios
│   │       ├── sections/    # Features, Levels, Testimonials, FinalCTA
│   │       └── shared/      # GlassCard, SectionTitle
│   ├── constants/           # Links de navegación
│   ├── data/                # Contenido estático (hero, planes, FAQs)
│   ├── hooks/               # Custom hooks (useFAQ, useScrolled)
│   ├── lib/                 # Utilidades (formatCRC)
│   ├── styles/              # Estilos adicionales
│   └── types/               # Tipos TypeScript
├── .gitignore
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
└── tsconfig.json
```

## 🖼️ Capturas de pantalla

*(Próximamente)*

## 👥 Autores

- **YeustunLR** — [GitHub](https://github.com/YeustunLR)
- **Eric.V**

> **Nota:** Si vas a clonar este repositorio, recuerda cambiar el `git clone` por la URL real del repo una vez creado y definir la licencia según corresponda.
