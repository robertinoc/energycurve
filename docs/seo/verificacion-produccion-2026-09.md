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
