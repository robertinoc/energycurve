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

Los cinco dependían del mismo bloqueante que F3 entero: las tres cuentas de
prueba. **Ese bloqueante se levantó el 17/09** —las cuentas existen y
`.env.e2e.local` está escrito— así que los cinco están disponibles. Ninguno se
declara verificado todavía: disponible y verificado no son lo mismo, y confundirlos
es exactamente lo que este documento existe para no hacer.

### 4b · Lo que dejó abierto el SEO técnico (PR #227)

Distinto bloqueante: éstos no esperan las cuentas, esperan el deploy. El PR se
verificó contra un build de producción local y se mergeó sin deployar.

| Caso | Por qué no lo cierra un test |
|---|---|
| `lang="es"` en el HTML que sirve producción | Los tests fijan lo que cada layout declara; lo que llega del servidor lo dice `curl` contra el sitio |
| El navegador deja de ofrecer «Translate this page» en `/es` | Es el navegador reaccionando al atributo, no algo que el HTML afirme |
| Rich Results Test sobre un post | Nuestros tests verifican que el JSON-LD parsea y tiene los campos; que Google lo acepte es de Google |
| La tarjeta social en WhatsApp, X y Slack | Un test ve la etiqueta `og:image`; sólo un scraper dice si la imagen resuelve |
| Sitemap y hreflang en Search Console | Los errores de hreflang aparecen días después de subirlo, en una consola a la que sólo accede Robertino |
| 404 con marca en los dos grupos de ruta | Una llamada a `cookies()` en `app/not-found.tsx` convierte el 404 de un post estático en 500 — es comportamiento de runtime en la plataforma real |
| «Seguir leyendo» y el CTA al final de cada post | Que muestre 3, excluya el actual y respete el orden es verificable; que se vea bien y que el botón lleve a `/signup` se mira |
| `lastmod` de un artículo se mueve solo | Los artículos se leen con `readFileSync` en build, así que un `.next` viejo sirve el texto anterior y la prueba miente si no se borra primero |

Los ocho están en la sesión `SEO` del banco de pruebas, con los pasos.

### 4c · Lo que dejó abierto la herramienta pública (PR #229)

Es la primera página del producto que alguien ve sin tener cuenta, así que un
error genérico acá cuesta más que adentro.

| Caso | Por qué no lo cierra un test |
|---|---|
| Una colección de Rekordbox entera, con el selector de playlist | Los tests usan fixtures; el caso raro está en una librería real de cuarenta playlists — y es donde vivía el bug que el PR encontró de paso |
| Traktor, M3U8, CSV de Excel en español y el `.txt` UTF-16, con archivos propios | Mismo motivo: un fixture por formato no es una librería |
| Que nada del archivo salga por red **en producción** | El E2E lo afirma, pero corre sin PostHog; el entorno con scripts de terceros es otro |
| El pase a signup de punta a punta, y qué se pierde | Cruza el registro y la sesión; el E2E corre sin sesión a propósito |
| El gráfico en un teléfono con datos móviles | Los puntos huecos —energía inventada— tienen que distinguirse de los llenos a ojo |
| Los cuatro eventos en PostHog, sin datos del archivo | La consola es de Robertino |
| Accesibilidad de las ocho páginas de herramientas | Axe ya las cubre (agregadas el 17/09, cero violaciones); lo que queda es el teclado y el lector de pantalla, que ningún barrido ve |
| Errores: set de dos temas, archivo corrupto, formato no soportado | Que el mensaje diga qué pasó y cómo seguir se lee, no se afirma |
| Indexación y rich result de FAQ | Semanas de calendario, y Search Console |

### 4d · Las dos herramientas armónicas (PR #231)

| Caso | Por qué no lo cierra un test |
|---|---|
| La rueda y la tabla de equivalencias contra el archivo de Jordi | Los tests verifican coherencia interna —576 pares contra `assessHarmony`—; que la tabla adoptada sea la que él mandó se compara a ojo contra su archivo |
| El pitch sin key lock contra un CDJ real | Ningún test tiene un deck. Es la afirmación más falsable de la herramienta |
| Key lock encendido, herramienta contra equipo | Igual |
| Mitad y doble tiempo con temas reales | Un falso positivo arruina justo los sets donde más se usa |
| La rueda en un teléfono | Es un canvas: en desktop anda y con el dedo puede ser intocable |
| Lector de pantalla sobre la rueda | El E2E verifica que se navegue con teclado, no que se entienda |
| `camelot_key_selected` y `compatibility_checked` sin la clave ni el BPM | La consola es de Robertino |

**Hueco cerrado el 17/09:** las ocho páginas de herramientas —no cuatro; el #231
sumó otras cuatro sin agregarlas— faltaban en `PUBLIC_PAGES` de
`e2e/accessibility.spec.ts`. Ya están, y el barrido WCAG 2.1 AA da cero
violaciones en las ocho. Axe encuentra alrededor de un tercio de las barreras
reales, así que `TOOL.7` sigue siendo necesaria: un barrido verde es un piso, no
un certificado.
