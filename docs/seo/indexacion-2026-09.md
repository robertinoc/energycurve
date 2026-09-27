# Indexación — la anomalía del 20/09/2026, auditada

**Fecha:** 27/09/2026. Lote 12, tarea 3. Todos los números de este documento
salen de un comando corrido ese día sobre el build de la rama `seo/plan-lote-12`
(base `b2bd523`, que es `main`), y el comando está al lado del número.

---

## 1. El dato de Google Search Console

Informe de cobertura del 20/09/2026, un día después de registrar el sitio:

| Estado | URLs |
|---|---|
| Indexadas | 67 |
| No indexadas | 14 |

Las 14, por motivo:

| Motivo | URLs |
|---|---|
| Página con redirección | 3 — son las redirecciones de SEO-E07 y es el comportamiento esperado; no se auditan acá |
| Rastreada: actualmente sin indexar | 1 — `/es/herramientas` |
| Detectada: actualmente sin indexar | 10 — `/es/blog`, `/es/energy-tags`, `/es/glosario/leer-la-pista`, `/es/glosario/open-key`, `/es/herramientas/compatibilidad-tonalidad-bpm`, `/es/terms`, `/glossary/transition`, `/guide`, `/pricing`, `/subprocessors` |

Dos cosas que conviene leer antes de los números. **«Detectada, sin indexar»**
quiere decir que Google conoce la URL (por el sitemap o por un enlace) y todavía
no la rastreó: es una cola, no un veredicto. **«Rastreada, sin indexar»** sí es
un veredicto: la leyó y decidió no indexarla, por ahora. Y de las 11 URLs que no
son redirección, **7 son españolas y 4 inglesas**, que es lo que dio origen a la
hipótesis de que el lado español está peor enlazado.

---

## 2. Método: enlaces entrantes desde el HTML del servidor

Un rastreador toma primero el HTML que responde el servidor, sin ejecutar
JavaScript. El censo hace lo mismo: baja el sitemap, pide cada página con
`fetch`, saca los `<script>`, y cuenta **cuántas páginas distintas** contienen
un `<a href>` hacia cada ruta interna. Cuenta páginas, no anclas: una página que
enlaza tres veces a `/pricing` cuenta una vez.

```bash
npx next start --port 3011
node scripts/inbound-links.mjs http://127.0.0.1:3011 /tmp/links.json
```

Se corrió dos veces: sobre `b2bd523` (100 URLs en el sitemap, «antes») y sobre
el build de este lote (104, «después», con los cuatro artículos nuevos). La
columna que importa para la anomalía es la de antes, porque es el sitio que
Google vio el 20/09 — con una salvedad en §5.

---

## 3. Las 11 URLs contra sus gemelas

| No indexada | Páginas que la enlazan | Gemela (indexada) | Páginas que la enlazan | Diferencia |
|---|---|---|---|---|
| `/es/herramientas` (rastreada) | 1 | `/tools` | 1 | ninguna |
| `/es/blog` | 6 | `/blog` | 12 | 6 — cada artículo enlaza su índice, y hay 11 artículos en inglés contra 5 en español |
| `/es/energy-tags` | 6 | `/energy-tags` | 11 | 5 — misma razón: enlazan desde artículos |
| `/es/glosario/leer-la-pista` | 1 | `/glossary/crowd-reading` | 1 | ninguna |
| `/es/glosario/open-key` | 4 | `/glossary/open-key` | 4 | ninguna |
| `/es/herramientas/compatibilidad-tonalidad-bpm` | 6 | `/tools/key-bpm-compatibility` | 6 | ninguna |
| `/es/terms` | 5 | `/terms` | 5 | ninguna |
| `/glossary/transition` | 10 | `/es/glosario/transicion` | 8 | **la inglesa, que es la no indexada, tiene más** |
| `/guide` | 2 | `/es/guia` | 2 | ninguna |
| `/pricing` | 1 | `/es/pricing` | 1 | ninguna |
| `/subprocessors` | 4 | `/es/subprocessors` | 4 | ninguna |

Fuente: `links-before.json`, sobre 100 páginas.

**La hipótesis no sobrevive al conteo.** En 8 de los 11 pares las dos versiones
tienen exactamente las mismas páginas enlazándolas. En los 2 pares donde la
española tiene menos (`/es/blog`, `/es/energy-tags`), la diferencia es el número
de artículos de cada idioma, no el enlazado de la página. Y en el par restante
la que tiene más enlaces es la que no está indexada. El enlazado interno es
simétrico por construcción: las mismas plantillas, `localizedPath()` de por
medio, producen los mismos enlaces en los dos idiomas.

Lo que sí muestra la tabla, y es el hallazgo real: **cuatro páginas de portada
reciben enlace desde una sola página.** `/tools`, `/es/herramientas`, `/pricing`
y `/es/pricing` sólo están enlazadas desde la portada de su idioma. No es un
defecto de la portada: es que la barra de navegación (el menú Recursos, PR #242)
existe sólo en `components/marketing/landing-navbar.tsx`, y las páginas de
contenido —glosario, blog, herramientas, guías— llevan una cabecera con el logo
y una miga de pan, y ningún pie con enlaces al sitio. Verificado sobre el HTML
de `/glossary/bpm`: sus únicos `href` internos son `/`, `/glossary`, tres
entradas del glosario y dos herramientas.

¿Justifica eso un cambio de enlazado? **No con estos números.** `/tools` y
`/es/pricing` tienen exactamente un enlace entrante y están indexadas; sus
gemelas tienen uno y no. Un enlace entrante no está impidiendo la indexación de
nada. Queda anotado en §6 como lo primero que haría si el próximo rastreo no
mueve la cola, porque un pie común subiría esas cuatro de 1 a 104 páginas
enlazándolas, y ése sí sería un número.

---

## 4. `/es/herramientas`, la única rastreada y no indexada

Es el único caso donde Google leyó la página y no la quiso. Comparada con su
gemela indexada, en el HTML del servidor:

| | `/tools` | `/es/herramientas` |
|---|---|---|
| Palabras (sin markup) | 146 | 156 |
| Enlaces entrantes | 1 | 1 |
| `robots` | `index, follow` | `index, follow` |
| Canonical | propia | propia |
| Hreflangs en el sitemap | 3 | 3 |
| `lastmod` en el sitemap | 2026-09-19 | 2026-09-19 |

Dos páginas iguales en todo lo que el rastreador ve, con un resultado distinto.
Lo único que se puede decir con esta tabla es que es una página **delgada** —
146 y 156 palabras para un hub con tres herramientas y un «En camino»— y que
la delgadez no fue decisiva para su gemela. `/guide` y `/es/guia` están en la
misma situación (94 y 90 palabras) y ninguna de las dos está indexada todavía.
Es el segundo candidato de §6.

---

## 5. La salvedad de la fecha

El menú Recursos se reorganizó en el PR #242, mergeado el **19/09/2026 a las
21:05 UTC**. El informe de GSC es del 20/09. Es decir: Google rastreó un sitio
cuya estructura de enlaces tenía menos de un día, y el sitio entero llevaba un
día registrado. Diez URLs en «detectada, sin indexar» a las 24 horas de
registrar un sitio de 100 URLs no describen un problema: describen una cola.

Con el enlazado de hoy verificado simétrico (§3) y sin nada roto en la página
que más importa (§7), **el veredicto es esperar al próximo rastreo** y repetir
este censo contra el informe nuevo. Lo que se compara entonces es la columna
«Detectada» — si sigue en 10 con el sitio ya rastreado varias veces, deja de ser
cola y §6 pasa a ser un plan.

---

## 6. Qué haría después, si el próximo informe no se mueve

En orden, y cada uno con el número que lo justificaría:

1. **Un pie común en las páginas de contenido**, con las cuatro portadas
   (herramientas, blog, glosario, guías) y precios. Sube `/tools`,
   `/es/herramientas`, `/pricing` y `/es/pricing` de 1 página enlazándolas a
   todas. Es un cambio de plantilla, no de contenido.
2. **Engordar los dos hubs delgados**: `/tools` y `/es/herramientas` (146 / 156
   palabras) y `/guide` y `/es/guia` (94 / 90). Un párrafo por herramienta que
   diga qué resuelve, en vez de una tarjeta.
3. Nada sobre hreflang ni canonical: están bien en las 11 (todas tienen las
   tres alternates en el sitemap y la canonical propia).

---

## 7. `/pricing`, auditada aparte

Es la página que vende, así que se miró entera aunque el motivo sea el mismo
«detectada» que las otras nueve. Sobre el build, `curl` a `/pricing` y a
`/es/pricing`:

| Qué | `/pricing` | `/es/pricing` |
|---|---|---|
| Estado | 200, `text/html; charset=utf-8` | 200 |
| `<html lang>` | `en` | `es` |
| Título | «Pricing — Free, PRO US$9.99, PRO+ US$19.99 \| EnergyCurve» | «Precios — Gratis, PRO u$s9,99, PRO+ u$s19,99 \| EnergyCurve» |
| Descripción | 134 caracteres | 142 caracteres |
| `robots` | `index, follow` | `index, follow` |
| Canonical | `https://energycurve.app/pricing` | `https://energycurve.app/es/pricing` |
| Hreflangs | `en`, `es`, `x-default` → `/pricing` | los mismos tres |
| JSON-LD | `Product` «EnergyCurve» con `AggregateOffer` (USD, 0 → 19.99, `offerCount` 3, tres `Offer` con `price` y `availability`) + `BreadcrumbList`; los dos bloques parsean como JSON | idéntico |
| Palabras | 627 | 668 |
| `robots.txt` | `Allow: /`; sólo bloquea `/api/`, `/dashboard`, `/backstage` y las rutas de sesión | — |
| En el sitemap | sí, `lastmod` 2026-09-11, 3 hreflangs | sí |
| Enlaces entrantes | 1 página (la portada, con 7 anclas) | 1 página (`/es`, 7 anclas) |

No hay nada que arreglar en `/pricing`. La única observación es la descripción
inglesa de 134 caracteres, por debajo de la banda de 140–155 que los artículos
respetan por test; no es un motivo de no indexación y no se tocó, porque el copy
de precios es de Robertino.

---

## 8. Efecto colateral del lote 12

Los cuatro artículos nuevos mueven cuatro de las once filas, sin haberlo buscado:

| URL | Antes | Después |
|---|---|---|
| `/blog` | 12 | 15 |
| `/es/blog` | 6 | 7 |
| `/energy-tags` | 11 | 12 |
| `/es/energy-tags` | 6 | 7 |

Las otras siete no cambian. Fuente: `links-after.json`, sobre 104 páginas.
