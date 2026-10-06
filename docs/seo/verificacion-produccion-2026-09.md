# Verificación en producción — fases 0, 1 y 3

**Fecha:** 19/09/2026
**Contra:** `https://energycurve.app` (producción, no el build local)
**Commit que sirve producción:** sin confirmar como hash. Vercel no expone un
build id en las cabeceras (`curl -sI` devuelve `x-vercel-id`, que es un id de
request, no de deploy). Lo que **sí** está confirmado por marcador: producción
incluye el lote 4 (`c784edb`), porque `/` sirve el `Organization` con
`alternateName: "EnergyCurve DJ"` y el `sameAs` de Instagram, que ese lote
agregó y antes no existían.

Cada fila de abajo es un comando corrido hoy contra el dominio real y su
salida. Nada está citado de memoria ni del handoff.

---

## Resultado por fase

| Fase | Estado |
|---|---|
| Fase 0 | **ROJO** — 1 de 2 punteros existe |
| Fase 1 | **VERDE** — con una precisión sobre el redirect de `www` |
| Fase 3 | **VERDE** |

La fase 0 no se marca verificada. Lo que falló está abajo.

---

## Fase 0 — punteros al plan

| Qué | Comando | Salida | Estado |
|---|---|---|---|
| `AGENTS.md` apunta al plan | `grep -n "seo/SEO-PLAN.md" AGENTS.md` | `56:The plan this work follows is \`docs/seo/SEO-PLAN.md\` (phases 0–5, task IDs` | verde |
| `docs/roadmap-status.md` apunta al plan | `grep -niE "seo.plan\|SEO-E" docs/roadmap-status.md` | **arreglado el 22/09/2026** | verde |

**Estaba en rojo y era el único.** `docs/roadmap-status.md` tenía una sección
`## Content, SEO & AEO — closed 12 Aug 2026` que describía el estado previo al
plan y **no mencionaba `docs/seo/SEO-PLAN.md` en ningún lado**: quien abría el
roadmap para ver dónde siguió el trabajo de SEO leía una sección que se declara
cerrada y nunca llegaba al plan que la reabrió.

Arreglado en el lote del 22/09: el encabezado ahora dice *"closed 12 Aug 2026,
reopened 15 Sep 2026"* y arranca con el puntero. **Con esto la fase 0 queda
verificada en verde.**

No se había arreglado antes a propósito: la tarea que lo encontró era verificar,
y un rojo listado vale más que un tilde puesto de apuro.

---

## Fase 1 — indexabilidad base

### `/es` sirve `lang="es"`

```
curl -s https://energycurve.app/es | grep -o '<html[^>]*'
→ <html lang="es" class="manrope_… space_grotesk_… space_mono_… h-full antialiased"
```

**Verde.**

### Sitemap: 200, `application/xml`, 78 URLs

```
curl -sI https://energycurve.app/sitemap.xml | grep -iE '^(HTTP|content-type)'
→ HTTP/2 200
→ content-type: application/xml

curl -s https://energycurve.app/sitemap.xml | grep -c '<loc>'
→ 78
```

**Verde.** 78 coincide con el sitemap del build local del mismo commit de
trabajo, contado con el mismo comando.

Además, las 78 devuelven 200 — ninguna 404 ni redirect:

```
while read -r u; do c=$(curl -s -o /dev/null -w '%{http_code}' "$u"); [ "$c" = 200 ] || echo "$c $u"; done < all.txt
→ (sin salida)
```

### `www` redirige al dominio pelado

```
curl -sI https://www.energycurve.app/ | head -5
→ HTTP/2 308
→ location: https://energycurve.app/
```

**Verde, con una precisión.** El código es **308**, no 301. Los dos son
redirects permanentes y Google consolida señales igual con ambos; 308 además
preserva el método de la request. O sea: el efecto SEO es el mismo. Pero el
plan decía 301 y el servidor devuelve 308, así que queda escrito cuál es.

### Cada artículo con su `BlogPosting`

Cinco artículos en el sitemap, todos en español. Cada uno trae **un** bloque
`ld+json` que **parsea** y contiene `BlogPosting` + `BreadcrumbList`:

| Artículo | JSON-LD | Parsea |
|---|---|---|
| `/es/blog/antes-de-tocar-no-despues` | `BlogPosting`, `BreadcrumbList` | sí |
| `/es/blog/cuanto-es-mucho-salto-de-energia` | `BlogPosting`, `BreadcrumbList` | sí |
| `/es/blog/esta-bien-el-orden-de-mi-set` | `BlogPosting`, `BreadcrumbList` | sí |
| `/es/blog/ordenar-un-set-desde-una-lista-de-texto` | `BlogPosting`, `BreadcrumbList` | sí |
| `/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad` | `BlogPosting`, `BreadcrumbList` | sí |

Índices: `/es/blog` sirve `Blog` + `BreadcrumbList`. `/blog` (inglés) **no
sirve JSON-LD y no está en el sitemap**, lo cual es correcto y no un rojo: está
marcado `<meta name="robots" content="noindex, follow">` porque el blog en
inglés todavía no tiene posts. Un índice vacío indexado sería peor.

### `hreflang` recíproco donde corresponde

```
<link rel="alternate" hrefLang="en" href="https://energycurve.app"/>
```

> Ojo al leerlo: Next emite el nombre del prop JSX, `hrefLang` con L mayúscula.
> Los nombres de atributo en HTML no distinguen mayúsculas, así que es válido y
> Google lo lee igual — pero un `grep 'hreflang='` sensible a mayúsculas
> devuelve cero y hace creer que no está. Pasó en esta misma verificación.

| Página | `hreflang` que emite | Recíproco |
|---|---|---|
| `/` ↔ `/es` | `en`, `es`, `x-default` | sí |
| `/pricing` ↔ `/es/pricing` | `en`, `es`, `x-default` | sí |
| `/energy-tags` ↔ `/es/energy-tags` | `en`, `es`, `x-default` | sí |
| `/import-formats` ↔ `/es/import-formats` | `en`, `es`, `x-default` | sí |
| `/install` ↔ `/es/install` | `en`, `es`, `x-default` | sí |
| `/glossary` ↔ `/es/glosario` | `en`, `es`, `x-default` | sí |
| `/es/blog` | sólo `es` + `x-default` | n/a — no hay gemelo inglés |
| `/es/blog/<artículo>` | sólo `es` | n/a — no hay gemelo inglés |

Chequeo de ida y vuelta sobre 15 páginas: **0 de una sola dirección**. Las
páginas que existen sólo en español declaran sólo `es` en vez de apuntar a un
gemelo inglés inexistente, que es lo correcto — un `hreflang` a un 404 se
descarta entero.

Nota menor, no rojo: `/es/blog` emite `x-default` y los artículos no. Con un
solo idioma, el `es` autorreferencial alcanza.

---

## Fase 3 — datos estructurados y superficie para máquinas

Todos los bloques parsean. La prueba es `JSON.parse`, no la presencia del
`<script>`: un bloque que existe y no parsea es invisible.

| Ruta | Tipos en el `@graph` | Parsea |
|---|---|---|
| `/energy-tags` | `TechArticle`, `FAQPage`, `BreadcrumbList` | sí |
| `/es/energy-tags` | `TechArticle`, `FAQPage`, `BreadcrumbList` | sí |
| `/import-formats` | `TechArticle`, `FAQPage`, `BreadcrumbList` | sí |
| `/es/import-formats` | `TechArticle`, `FAQPage`, `BreadcrumbList` | sí |
| `/install` | `HowTo` ×2, `FAQPage`, `WebPage`, `BreadcrumbList` | sí |
| `/es/install` | `HowTo` ×2, `FAQPage`, `WebPage`, `BreadcrumbList` | sí |

`/install` sirve **dos** `HowTo` (una instalación por plataforma), no uno. Es
intencional y válido.

### Cada artículo con su propia imagen OG

| Artículo | `og:image` |
|---|---|
| `antes-de-tocar-no-despues` | `/opengraph-image/blog/es/antes-de-tocar-no-despues` |
| `cuanto-es-mucho-salto-de-energia` | `/opengraph-image/blog/es/cuanto-es-mucho-salto-de-energia` |
| `esta-bien-el-orden-de-mi-set` | `/opengraph-image/blog/es/esta-bien-el-orden-de-mi-set` |
| `ordenar-un-set-desde-una-lista-de-texto` | `/opengraph-image/blog/es/ordenar-un-set-desde-una-lista-de-texto` |
| `tus-temas-no-tienen-bpm-ni-tonalidad` | `/opengraph-image/blog/es/tus-temas-no-tienen-bpm-ni-tonalidad` |

Cada una es una URL distinta — ninguna cae en la imagen genérica del sitio. La
primera se pidió para confirmar que no es un 404:

```
curl -sI https://energycurve.app/opengraph-image/blog/es/antes-de-tocar-no-despues
→ HTTP/2 200
→ content-type: image/png
```

### `/llms.txt`

```
curl -sI https://energycurve.app/llms.txt | grep -iE '^(HTTP|content-type)'
→ HTTP/2 200
→ content-type: text/plain; charset=utf-8

curl -s https://energycurve.app/llms.txt | wc -c
→ 8598
```

**Verde.** 8598 bytes de texto plano, arranca con `# EnergyCurve` y el
resumen de una línea.

---

## Lo que quedó en rojo

**Nada, desde el 22/09/2026.** El único rojo era el puntero de
`docs/roadmap-status.md` al plan, y está puesto — ver la fase 0 arriba.

Lo que este documento **sigue sin poder verificar** es otra cosa y conviene no
confundirlas: todo lo de acá se midió con `curl` contra producción, y las fases
2, 4 y 5 dependen de acciones que no se leen desde afuera (perfiles de entidad,
key events de PostHog, el LCP). El verde de la fase 0 significa que el puntero
existe, no que el plan esté hecho.

---

## Cómo repetir esta verificación

Los scripts usados son de un solo uso y no se commitearon. Los dos que valen la
pena reescribir:

```bash
# JSON-LD: extraer y PARSEAR, no sólo buscar el <script>
curl -s https://energycurve.app/install | python3 -c "
import sys,re,json
for m in re.finditer(r'<script[^>]*ld\+json[^>]*>(.*?)</script>', sys.stdin.read(), re.S):
    d = json.loads(m.group(1))
    print([n.get('@type') for n in (d.get('@graph') or [d])])
"

# hreflang: ojo con el case, Next emite hrefLang
curl -s https://energycurve.app/ | grep -oiE '<link[^>]*alternate[^>]*>'
```

---

# Verificación en producción — Fase 2

**Fecha:** 26/09/2026
**Contra:** `https://energycurve.app` (producción, no el build local)
**Commit que sirve producción:** sin confirmar como hash — Vercel no lo expone.
Confirmado por marcador: producción sirve `/blog/how-to-structure-a-dj-set`
(200), que llegó con el lote 10 (`d18551d`, mergeado en #261), así que incluye
**todo** lo de la Fase 2, que es anterior.

Cada fila es un comando corrido hoy contra el dominio real y su salida. Nada
está citado de memoria ni del handoff.

## Resultado

| Fase | Estado |
|---|---|
| Fase 2 | **VERDE** — con una precisión sobre el filtro, abajo |

## Lo que prometió la fase, y lo que se vio vivo

| Qué | Comando | Salida | Estado |
|---|---|---|---|
| SEO-E13/E14 · los artículos en inglés se sirven | `for S in <los 11 slugs>; do curl -s -o x.html -w '%{http_code}' $P/blog/$S; grep -o '<html[^>]*lang="[a-z]*"' x.html; done \| sort \| uniq -c` | `11 200 lang="en"` | verde |
| SEO-E12 · el índice `/blog` lista los artículos | `curl -s $P/blog` + contar `href="/blog/<slug>"` únicos | **11** enlaces a artículos, los 11 slugs presentes | verde |
| SEO-E12 · el índice `/es/blog` lista los suyos | ídem sobre `/es/blog` | **5** enlaces a artículos | verde |
| SEO-E14 · par traducido, `hreflang` en los dos sentidos | `curl -s $P/blog/is-my-dj-set-in-the-right-order` y `$P/es/blog/esta-bien-el-orden-de-mi-set`, extraer `<link rel="alternate" hreflang=…>` | en: `en=/blog/is-my-dj-set-in-the-right-order es=/es/blog/esta-bien-el-orden-de-mi-set x-default=/blog/…` · es: `es=/es/blog/esta-bien-el-orden-de-mi-set en=/blog/is-my-dj-set-in-the-right-order x-default=/blog/…` · canónica propia en cada uno | verde |
| SEO-E15 · relacionados por tag dentro de cada artículo | buscar «Keep reading» / «Seguir leyendo» y contar los `href` a otros artículos en esa sección | en: sección encontrada, **3** artículos (`how-to-structure-a-dj-set`, `what-is-a-dj-set-energy-curve`, `how-to-order-a-dj-set-by-energy-warm-up`) · es: sección encontrada, **3** (`antes-de-tocar-no-despues`, `ordenar-un-set-desde-una-lista-de-texto`, `cuanto-es-mucho-salto-de-energia`) | verde |
| SEO-E16 · el filtro del índice existe en el HTML del servidor | `curl -s $P/blog \| grep -c '<select'` y contar `<option` | `<select>` presente, **19** opciones en `/blog`; presente también en `/es/blog` | verde, con precisión |
| SEO-E16 · `Blog` JSON-LD con su lista | parsear cada `<script type="application/ld+json">` de `/blog` y `/es/blog` con `JSON.parse` y leer `@type` y `blogPost.length` | `/blog`: `Blog+BreadcrumbList`, parsea, `blogPost: 11` · `/es/blog`: parsea, `blogPost: 5` | verde |
| JSON-LD de un artículo | ídem sobre los dos del par | `BlogPosting+BreadcrumbList`, parsea, en los dos | verde |

**La precisión sobre el filtro.** Lo que SEO-E16 diseñó es un `<select>` nativo
que llega en el HTML del servidor, para que una elección hecha **antes** de
hidratar no se pierda cuando la página hidrata (`useTypedBeforeHydration`, en
`components/marketing/blog-tag-filter.tsx`). Con `curl` se verifica la
precondición — el control está, con sus opciones, antes de cualquier JS — y no
el comportamiento, que necesita un navegador. Ese comportamiento lo cubre el
test unitario del hook en el repo; **no está verificado contra producción por
este documento**, y se dice en vez de darlo por hecho. El filtro no funciona
sin JavaScript en absoluto: no hay `<form method="get">` alrededor del
`<select>`. Eso no es lo que la fase prometió, así que no es rojo — pero
conviene saberlo.

**Con esto la Fase 2 queda verificada en verde.** El hito «Phase 2 verified
live» se puede cerrar.

---

# Verificación en producción — Fases 4 y 5

**Fecha:** 27/09/2026 (lote 14)
**Contra:** `https://energycurve.app` (producción, no el build local)
**Commit que sirve producción:** sin confirmar como hash — Vercel no lo expone
(`x-vercel-id` es un id de request). **Confirmado por marcador: producción
sirve el lote 13**, es decir `d97a84f` (merge del PR #265) o posterior: responden
200 `/harmonic-mixing-cheat-sheet`, `/compare/best-dj-software`,
`/blog/how-djs-prepare-their-sets` y `/camelot-wheel.svg`, que sólo existen
desde ese merge, y el sitemap trae 111 URLs, que es el número de ese lote.

```
for U in /guide/energy-curve-in-a-dj-set /compare/mixed-in-key /blog/export-traktor-playlist-to-rekordbox /harmonic-mixing-cheat-sheet /compare/best-dj-software /blog/how-djs-prepare-their-sets /camelot-wheel.svg; do curl -s -o /dev/null -w "$U %{http_code}\n" https://energycurve.app$U; done
→ los siete: 200
curl -s https://energycurve.app/sitemap.xml | grep -o '<loc>' | wc -l
→ 111
```

Cada fila es un comando corrido hoy contra el dominio real y su salida.

## Resultado

| Fase | Código, en producción | Fase entera |
|---|---|---|
| Fase 4 | **ROJO** — E23 verde; E24 servido pero incompleto (sin comparaciones ni artículos en inglés); E22 con 1 perfil de 6 | **NO VERIFICADA** — esperan E22, E25, E26, E27 |
| Fase 5 | **ROJO** — E28 en los artículos no emite el evento; E29 y E30 verdes | **NO VERIFICADA** — esperan la mitad de PostHog de E28, y E31 |

**Ninguna de las dos fases se marca verificada.** Lo que está verde por código
está abajo, fila por fila; lo que falta tiene nombre y apellido al final.

## Fase 4 — la mitad de código

### SEO-E23 — las comparaciones, las dos tandas

| Qué | Comando | Salida | Estado |
|---|---|---|---|
| Las 12 URLs responden 200 con JSON-LD que parsea | `for U in …; do curl -s $P$U \| python3 -c "…json.loads…"` sobre las seis de `/compare/` y las seis de `/es/comparar/` | las 12: `200 · WebPage, BreadcrumbList, FAQPage(3)` | verde |
| Están en el sitemap | `curl -s $P/sitemap.xml \| grep -c "<loc>$P/compare/…</loc>"` | 1 por URL, las 12 | verde |
| El pie las enlaza | `curl -s $P/ \| grep -oE 'href="/compare/[^"]*"' \| sort \| uniq -c` (y `/es` con `/es/comparar/`) | 6 y 6, una ancla cada una | verde |

### SEO-E24 — `/llms.txt`

| Qué | Comando | Salida | Estado |
|---|---|---|---|
| 200, texto plano | `curl -sI $P/llms.txt \| grep -iE '^(HTTP\|content-type)'` | `HTTP/2 200` · `text/plain; charset=utf-8` · 9724 bytes | verde |
| Qué es EnergyCurve, con la línea de contraste | `grep -c "# EnergyCurve"` · `grep -c "Mixed In Key"` | 1 · 2 | verde |
| Precios | `grep -n -i pric` | línea 12: «Pricing — Free, PRO US$9.99, PRO+ US$19.99 … (US$99 / US$199 a year)» | verde |
| Las dos páginas de referencia | `grep -c /energy-tags` · `grep -c /import-formats` | 1 · 1 | verde |
| La empresa | `grep -c "StageLink LLC"` | 1 | verde |
| **Los artículos pilares** | `grep -c how-to-structure-a-dj-set` · `grep "^## "` | **0** — las secciones son `Articles (Spanish)` e `In Spanish`; los artículos en inglés existen desde el 22/09 y el archivo dice «no tienen traducción todavía» | **rojo** |
| **Las comparaciones** | `grep -c /compare/` | **0** — no hay sección de comparaciones | **rojo** |

Los dos rojos son de código y este lote los arregla en `app/llms.txt/route.ts`
(sección «Comparisons» con la fecha de verificación de cada página, sección
«Articles (English)», y la línea de «In Spanish» corregida), con test en
`tests/reference-seo.test.ts`. **Producción sigue sirviendo la versión sin
eso hasta que se deploye**: esta fila se repite contra el dominio después del
deploy, no se da por verde con el PR.

### SEO-E22 — la entidad (la mitad de código)

| Qué | Comando | Salida | Estado |
|---|---|---|---|
| `Organization` con `alternateName` | `curl -s $P/ \| python3 -c "…@type=='Organization'…"` | `alternateName= EnergyCurve DJ` | verde |
| `sameAs` | ídem | `['https://www.instagram.com/energycurve.app/']` — **1 perfil**; el criterio de aceptación pide ≥ 6 | verde por código, **la tarea externa sigue abierta** |

## Fase 5 — la mitad de código

### SEO-E28 — los CTA de contenido

| Qué | Comando | Salida | Estado |
|---|---|---|---|
| CTA en `/energy-tags` e `/import-formats`, los dos idiomas | `curl -s $P$U \| grep -oE 'See your set(&#x27;\|…)s curve, free'` y el `href` a la herramienta | las cuatro páginas: copy presente y ancla a `/tools/energy-curve` / `/es/herramientas/curva-de-energia` (el apóstrofo va escapado en el HTML, un `grep` literal da 0 y engaña) | verde |
| CTA en los artículos | `curl -s $P/blog/how-to-structure-a-dj-set \| grep -c 'href="/tools/energy-curve"'` | 2 anclas (el CTA del artículo y una del cuerpo) | verde: el CTA está |
| **El evento `content_cta_click` en los artículos** | leído en el código servido: `components/marketing/blog-article.tsx` en `d97a84f` | el CTA de los artículos usa `CTAButton` y `Link` **sin `captureContentCtaClick`**; sólo los bloques `<CTA>` de las páginas de referencia pasan por `ContentCtaLink`, que es el único lugar que emite el evento | **rojo** |
| Key events y funnel en PostHog | — | no verificable sin la cuenta | **externo (Robertino)** |

El rojo es de código y este lote lo arregla: `ArticleCta` pasa por
`ContentCtaLink` con la ruta del artículo como `page`. Igual que E24: producción
no lo tiene hasta el deploy.

### SEO-E29 — Lighthouse CI

| Qué | Comando | Salida | Estado |
|---|---|---|---|
| El workflow existe y corre las cuatro rutas | `grep -n url lighthouserc.json` · `grep -n "Lighthouse budgets" .github/workflows/ci.yml` | `/`, `/es`, `/pricing`, `/es/blog/antes-de-tocar-no-despues` · paso `Lighthouse budgets` en el job `verify` | verde |
| Corre en `main` y falla por regresión | `gh run list --branch main --limit 3` · `gh run view <id> --json jobs` | `d97a84f` (27/09 20:44 UTC): `Production build: success`, `Lighthouse budgets: success`; el run de `109406c` falló ese mismo paso por TBT 205 ms contra 200 en `/` y pasó al relanzarlo — el gate corta | verde |

E29 se verifica en CI, no en producción: es un guardarraíl del repositorio y no
tiene superficie servida.

### SEO-E30 — el barrido de accesibilidad

| Qué | Comando | Salida | Estado |
|---|---|---|---|
| Cubre `/energy-tags`, `/import-formats` y un artículo en cada idioma | `grep -n "energy-tags\|import-formats\|blog" e2e/accessibility.spec.ts` | líneas 98–99 las dos referencias (más sus gemelas), 41–50 seis artículos en inglés y dos en español | verde |
| Pasa | `npm run test:e2e` del lote 13 | 911 pasan, 37 saltean, 0 fallan | verde |

## Lo que falta para cerrar cada fase, con nombre

| Fase | Tarea | Qué falta | De quién |
|---|---|---|---|
| 4 | E22 | 5 perfiles más (Product Hunt, AlternativeTo, Crunchbase, X/Instagram/TikTok, Wikidata) y sus URLs en `ENTITY_PROFILES` de `lib/seo.ts` | Robertino crea los perfiles; el código es un array |
| 4 | E24 | deploy del arreglo de este lote, y repetir las dos filas rojas contra el dominio | Robertino (deploy) |
| 4 | E25 | el programa de menciones: textos aprobados por Robertino antes de enviar nada | Robertino |
| 4 | E26 | el enlace desde stagelink.art y el post en su blog | Robertino |
| 4 | E27 | la corrida mensual de visibilidad en IA y la revisión de GSC | Robertino |
| 5 | E28 | deploy del arreglo; marcar `content_cta_click`, `signup` y `analysis_completed` como key events y armar el funnel en PostHog. *Corregido el 06/10 (lote 18): decía `signup_completed` y `first_analysis`, que el código nunca emitió* | Robertino (cuenta de PostHog) |
| 5 | E31 | el log semanal de PSI para 6 URLs (`docs/seo/cwv-log.md`, 4 filas) | Robertino |
