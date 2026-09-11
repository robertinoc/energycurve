# Catálogo de casos de borde de UX y estados vacíos/error

**Proyecto 1 · Plan Integral de Pruebas · F3.** Fecha: 2026-09-11.
Derivado del código, no de una lista genérica: cada entrada apunta a un archivo
y dice si está cubierta, si se arregló en esta pasada, o si sigue abierta.

El criterio para entrar acá es que **alguien lo pueda ver**. Un branch de error
que solo existe en un test no es un caso de borde de UX; uno que un DJ o su
cliente alcanzan con un click, sí.

---

## 1. El hallazgo de la fase: el 404 no existía

El app tiene **diez llamadas a `notFound()`** y no tenía **ningún**
`not-found.tsx`. Las diez renderizaban la página integrada de Next: negro sobre
blanco, sin `h1`, solo en inglés, sin navegación, sin nada que diga
EnergyCurve.

Las diez, por ruta:

| Ruta | Cuándo se alcanza |
|---|---|
| `app/blog/[slug]`, `app/es/blog/[slug]` | un post que se movió o no existe |
| `app/dashboard/playlists/[id]` (+ `analysis`, `compare`, `gig`, `set-sheet`) | el set se borró **o es de otra cuenta** |
| `app/dashboard/shared/[id]` | el set compartido dejó de estarlo |
| `app/c/[token]` (×2) | firma inválida, o set borrado/vacío |

La que hizo que valiera arreglarlo en vez de anotarlo es `/c/[token]`. Esa
página se niega **a propósito** a distinguir una firma inválida de un set
borrado, porque decir cuál confirmaría que el id existía. La decisión es
correcta —y significaba que el cliente de un DJ, clickeando un link que el DJ le
mandó, caía en un callejón sin estilo, sin explicación y sin forma de volver.

**Arreglado:** `app/not-found.tsx` (público) y `app/dashboard/not-found.tsx`
(dentro del shell del dashboard, para que el DJ conserve su sidebar). Los dos
son server components, así que el idioma sale de la misma cookie que lee el
resto del server —no del `document.cookie` en el cliente, que es el workaround
que `error.tsx` necesita por ser client component.

Dos textos distintos porque el público no es el mismo:

- El público cubre **tres causas a la vez** ("el link puede estar mal, o apuntar
  a algo que ya no está") porque tiene que ser verdad para las tres sin nombrar
  ninguna.
- El del dashboard dice "puede que pertenezca a otra cuenta", que es cierto
  exista o no el id — el mismo razonamiento por el que la capa de servicios
  devuelve vacío en lugar de 403.

Cobertura: `e2e/not-found.spec.ts`, 7 casos × 4 navegadores.

### 1b · Dos hallazgos que salieron de escribir esos tests

**El título de marketing en un link muerto.** Cuando `/c/[token]` llama a
`notFound()`, Next sirve el body correcto y el status 404 correcto —y el HTML
servido hasta trae el título del 404— pero **en el navegador gana el `metadata`
de la ruta**. O sea: el crawler veía "Page not found" y la persona veía una
pestaña que decía "The shape of a set" sobre una página que dice que el set no
está. Verificado con una sonda: renombrar ese título cambió lo que mostraba el
browser. Arreglado convirtiendo el `metadata` estático en `generateMetadata`
condicional.

Queda cubierto solo el caso de firma inválida. El segundo `notFound()` (set
borrado o sin tracks) necesitaría una segunda llamada a
`getPlaylistWithTracksById`, que es el loader deliberadamente sin scope cuyos
callers están fijados en dos por `.semgrep/energycurve.yml`. Ampliar esa lista
para arreglar un título de pestaña es el trade equivocado, y que la regla lo
frene es la regla funcionando.

**Dos `robots` contradictorios.** Un 404 sale con
`<meta name="robots" content="noindex">` (lo emite Next) seguido de
`<meta name="robots" content="index, follow">` (lo emite el root layout). No es
dañino —el status 404 es lo que actúa un buscador, y ante directivas en
conflicto gana la más restrictiva— y agregar una tercera no lo haría menos
confuso. El test fija que la restrictiva esté presente, para que un cambio
futuro de metadata no deje solo la permisiva.

---

## 2. Estados vacíos existentes

Los que ya tienen copy dedicada en ambos idiomas (`lib/content/dashboard-copy.ts`):

| Estado | Dónde | Cubierto |
|---|---|---|
| Sin playlists todavía | `playlists-browser.tsx` | copy EN/ES |
| Con playlists pero filtro sin resultados | `playlists-browser.tsx` (`emptyFiltered`) | copy EN/ES |
| Set sin tracks | `track-table.tsx` | copy EN/ES |
| Sin versiones guardadas | `version-history.tsx` | copy EN/ES |
| Sin colaboradores | `collaborators-panel.tsx` | copy EN/ES |
| Sin sugerencias en el hilo | `suggestion-thread.tsx` | copy EN/ES |
| Sin análisis corridos (panel admin) | `ActivityFeed.tsx` | inglés (panel interno) |
| Sin acciones de admin registradas | `ActivityFeed.tsx` | inglés + explica que falta la migración 0027 |

Distinguir **"vacío" de "filtrado a cero"** es la que más se suele omitir y acá
está bien hecha: "todavía no tenés sets" y "ningún set coincide con este filtro"
piden cosas distintas de la persona.

---

## 3. Casos de borde de datos que ya tienen test

De F5 (`docs/qa/findings-f5-precision.md`) y del corpus sintético
(`tests/fixtures/playlists.ts`):

- set que cruza la medianoche (aritmética de slot)
- track sin BPM → energía estimada, marcada como estimada en el gráfico
- tonalidades en las tres notaciones + `as_imported`
- nombre de set con `&` y `<` (escapado en export XML y en JSON-LD)
- NML con bloques `CUE_V2` (el P0 de hotcues)
- set de 40 tracks
- XML de importación con DOCTYPE / `<!ENTITY>` / anidamiento >40 → rechazado
  antes de que el parser construya nada

---

## 4. Lo que sigue abierto

| Caso | Por qué no se cerró |
|---|---|
| Recorrido completo de estados vacíos **autenticado** (dashboard recién creado, primer set, primer análisis) | necesita las 3 cuentas de prueba |
| Estados de error de Stripe en checkout (tarjeta rechazada, sesión expirada) | necesita cuenta PRO en modo test |
| Gig Mode sin conexión (PWA / service worker) | necesita sesión autenticada |
| Set compartido cuyo dueño revoca el acceso **mientras el colaborador lo mira** | necesita dos cuentas simultáneas |
| Cuota de plan agotada a mitad de flujo | necesita cuenta FREE con cuota consumida |

Los cinco dependen del mismo bloqueante que F3 entero. Ninguno se declara
verificado.
