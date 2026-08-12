# Arquitectura frontend

## Decisión actual

EduNivel usa App Router de Next.js con organización por funcionalidad. Las rutas
viven en `src/app`, la lógica de cada funcionalidad en `src/modules` y los
elementos visuales realmente transversales en `src/components`.

Una `page.tsx` debe ser pequeña, pero no tiene que limitarse artificialmente a
renderizar un solo componente. Su función es adaptar una URL al caso de uso y
componer la vista correspondiente.

## Responsabilidad de cada ubicación

| Ubicación | Debe contener | No debe contener |
| --- | --- | --- |
| `src/app/**/page.tsx` | metadata, lectura de `params` y `searchParams`, guards, consultas del caso de uso y composición de la página | estado complejo de cliente, validaciones reutilizables o grandes bloques repetidos de UI |
| `src/app/**/layout.tsx` | cascarón compartido por un segmento y guards que aplican a todo el subárbol | reglas de negocio específicas de una sola página |
| `src/modules/<feature>/components` | componentes propios de una funcionalidad | componentes usados como infraestructura visual por funcionalidades no relacionadas |
| `src/modules/<feature>/schemas` | validación de entradas de la funcionalidad | presentación o acceso directo desde las rutas |
| `src/modules/<feature>/lib` | reglas puras y utilidades cohesivas del dominio | utilidades genéricas sin dueño claro |
| `src/server/<feature>` | consultas, integraciones y operaciones exclusivas del servidor | componentes React de cliente |
| `src/components` | UI compartida por varias funcionalidades, como el cascarón público | reglas de negocio |

## Regla para páginas delgadas

Una página está bien si al leerla se entiende rápidamente:

1. qué requisitos de acceso tiene;
2. qué datos obtiene;
3. qué vista compone;
4. qué metadata expone.

No se debe extraer un componente únicamente para conseguir que `page.tsx` tenga
un solo import. Conviene extraer cuando existe al menos una de estas razones:

- el bloque tiene estado o efectos de cliente;
- se reutiliza en otra vista;
- representa un concepto con nombre propio;
- contiene suficiente markup como para ocultar el flujo principal;
- puede probarse de forma útil como unidad aislada.

Por eso, la portada puede componer directamente `Hero`, `Features`, `Levels`,
`Pricing` y `Testimonials`. Del mismo modo, una página de autenticación puede
componer `AuthCard` y su formulario, además de ejecutar un guard en servidor.
Ambas formas respetan la misma regla.

## Dirección de dependencias

La dirección preferida es:

```text
src/app ───────> src/modules
   └───────────> src/components compartidos
src/modules ───> src/components compartidos
```

Reglas prácticas:

- `src/modules` no importa desde `src/app`.
- Un módulo no debe alojar el cascarón de otro módulo.
- Los componentes compartidos no conocen reglas de negocio de sus consumidores.
- Los Server Components son el valor predeterminado; `"use client"` se coloca en
  la frontera interactiva más pequeña posible.
- La autorización siempre se valida en servidor, aunque la navegación o la UI
  también oculten acciones.

El navbar, footer y selector de tema públicos están en `src/components/layout`
porque los consumen tanto marketing como autenticación. No pertenecen
exclusivamente al módulo de marketing.

## Siguiente trabajo recomendado

El tamaño de una `page.tsx` es una señal, no un límite automático. Antes de
extraer, se deben revisar responsabilidades y pruebas. En el estado actual, los
mejores candidatos para una revisión posterior son:

- formularios de cliente extensos, especialmente `RegisterForm`, para separar
  secciones visuales y mantener la orquestación del envío en un único lugar;
- `ContactSection`, para separar datos/configuración, presentación y envío;
- páginas del dashboard de más de 150 líneas, extrayendo conceptos de dominio y
  no simples envoltorios de una sola línea;
- componentes compartidos por `auth` y `users`, para decidir si representan UI
  de identidad compartida o si están creando acoplamiento accidental.

Cada refactor debe conservar comportamiento, ejecutar ESLint y TypeScript, y
añadir pruebas cuando se mueva lógica, validación o autorización.
