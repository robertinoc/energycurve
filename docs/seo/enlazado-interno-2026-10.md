# Enlazado interno — el mapa después del pie

**Fecha:** 10/10/2026. Lote 19, tareas 2 y 3. Rama `plans/lote-19`, base
`29f26cc` (`main`, el merge del #278). Todos los números salen de un comando
corrido ese día sobre un build local; el comando está al lado.

## Cómo se midió

```
npm run build && npx next start --port 3011
node scripts/inbound-links.mjs http://127.0.0.1:3011 antes.json   # build de f59cf52 (= main + el bump de next)
node scripts/inbound-links.mjs http://127.0.0.1:3011 despues.json # build de 0ec14cd
```

El script lee el sitemap, baja cada página, **saca los `<script>`** y cuenta
cuántas páginas distintas tienen un `<a href>` a cada ruta: lo que ve un
crawler antes de ejecutar JavaScript. En las tablas de abajo **no se cuenta
la propia página** (una página que se enlaza a sí misma no es un enlace
entrante), por eso algunos números son uno menos que el JSON crudo.

**¿Hay enlaces que sólo existan después de hidratar?** Se recorrieron las 116
páginas con Chromium (`waitUntil: networkidle`) y se comparó cada par
origen → destino del DOM hidratado contra el del HTML del servidor: **0 pares
nuevos**. Ningún enlace del sitio depende de JavaScript para existir. El
problema de `/tools` no era ése: el enlace no estaba.

Sitemap: **116 URLs antes y después** (`curl -s <base>/sitemap.xml | grep -c '<loc>'`).

## Las dos páginas de la tarea 2

| Página | Antes | Después | Por qué |
|---|---|---|---|
| `/tools` | 1 (`/`) | **55** | El pie del lote 18 enlazaba la herramienta (`/tools/energy-curve`) y no el índice. La única página que lo enlazaba era la portada, por su menú. Ahora la columna «Recursos» lleva «All free tools» |
| `/es/herramientas` | 1 (`/es`) | **49** | Lo mismo, «Todas las herramientas» |

Para comparar: `/pricing` 56 y `/es/pricing` 50, sin cambios. `/tools` queda
uno abajo de `/pricing` porque la página `/tools` no se cuenta a sí misma.

## Las de dos enlaces o menos (tarea 3)

Antes: **9 de 116**. Después: **6 de 116**. Ninguna en 0.

| Página | Antes | Desde | Después | Desde | Qué se hizo |
|---|---|---|---|---|---|
| `/tools` | 1 | `/` | 55 | pie | Ver arriba |
| `/es/herramientas` | 1 | `/es` | 49 | pie | Ver arriba |
| `/glossary/b2b` | 1 | `/glossary` | 2 | `/glossary`, `/blog/what-is-a-dj-set` | **Bug, no huérfano**: el artículo lo enlaza, pero el enlace estaba dentro de `**negrita**` y el parser lo imprimía como texto. Ver «Lo que apareció» |
| `/glossary/crowd-reading` | 1 | `/glossary` | 2 | `/glossary`, `/glossary/warm-up` | `warm-up` lo suma a «Ver también»: la entrada habla de dejar «la pista con gente, calibrada», que es leerla |
| `/es/glosario/leer-la-pista` | 1 | `/es/glosario` | 2 | `/es/glosario`, `/es/glosario/warm-up` | Ídem |
| `/guide/energy-curve-in-a-dj-set` | 1 | `/guide` | 2 | `/guide`, `/glossary/energy-curve` | La entrada «Energy curve» enlaza la guía del mismo tema, en «Seguir leyendo». Es el único lugar donde el enlace es obvio |
| `/es/guia/curva-de-energia-en-un-set-de-dj` | 2 | `/es/guia`, `/es/blog/como-cerrar-un-set-de-dj` | 3 | + `/es/glosario/curva-de-energia` | Ídem |
| `/es/glosario/b2b` | 1 | `/es/glosario` | **1** | `/es/glosario` | **Se deja.** Ningún texto en español habla de B2B: el artículo que lo nombra en inglés (`what-is-a-dj-set`) no tiene gemelo. Forzar un «Ver también» desde otra entrada sería un enlace de relleno. Se cierra con contenido, si algún lote escribe ese gemelo |
| `/blog/what-is-a-dj-set` | 2 | `/blog`, `/blog/how-does-a-dj-set-work` | **2** | ídem | **Se deja.** Lo enlazan el índice y el artículo hermano, que son los dos lugares pertinentes; los artículos relacionados los elige `relatedPosts` por etiquetas |

Mediana de enlaces entrantes por página: 9 antes, 10 después.

## Lo que apareció: 25 enlaces que se imprimían como texto

Buscando por qué `/glossary/b2b` tenía un solo enlace, el HTML servido de
`/blog/what-is-a-dj-set` mostraba `<strong>The [b2b](/glossary/b2b) set</strong>`:
el markdown crudo, al lector. Barrido sobre las 116 páginas
(`curl` + `grep -o '\]([/h][^)]*)'`):

| Página | Enlaces crudos | Dónde |
|---|---|---|
| `/blog/what-is-a-dj-set` | 4 | Enlace dentro de `**negrita**` en una lista |
| `/blog/how-to-structure-a-dj-set` | 3 | Ídem |
| `/guide/energy-curve-in-a-dj-set` | 3 + 6 | Negrita, y los bloques callout, pasos y FAQ, que imprimían el string tal cual |
| `/es/guia/curva-de-energia-en-un-set-de-dj` | 3 + 6 | Ídem |

Y la respuesta del FAQ de la guía llegaba al `FAQPage` como
`[the difference, in their own words, is here](/compare/mixed-in-key)`.

**Arreglado** (`4dc5808`): el parser parte la negrita en tramos y un enlace
marcado `strong`; los bloques pasan su texto por `parseInline`; el texto del
FAQ en el JSON-LD sale de los mismos nodos (`faqAnswerText`). Después: **0
restos de `](` en las 116 páginas**, HTML completo incluido el JSON-LD.
Ningún otro texto de esos bloques tenía `*` ni `[`, así que el cambio no
movió ninguna otra página.

**No se tocaron fechas.** El texto de los artículos y la guía no cambió —
cambió cómo se renderiza—, y las entradas del glosario comparten la fecha de
`/glossary`: moverla cambiaría el `lastmod` de 42 URLs por dos enlaces.

**Tests**, todos vistos en rojo contra el código anterior:
`tests/content-footer.test.ts` (1), `tests/inline-links.test.ts` (10),
`tests/internal-linking.test.ts` (3).

## Lo que apareció, segundo: páginas en inglés que mandaban al español

`/tools/energy-curve` (en inglés) listaba cinco artículos con títulos en
inglés que abrían **en español**, sin aviso: «Is the order of my set any
good?» llevaba a `/es/blog/esta-bien-el-orden-de-mi-set`. Los cinco tienen
gemelo en inglés. El glosario y la guía hacían lo mismo, al menos con la marca
«(en español)». Es una decisión de cuando todos los artículos eran españoles;
hoy hay 15 en inglés y 9 en español, y 8 de los 9 tienen gemelo (`grep
translationOf content/blog/en/*.md`; el que no, `como-cerrar-un-set-de-dj`).

**Arreglado** (`0ec14cd`): `articleLinkFor()` en
`lib/blog/posts.ts` devuelve el gemelo cuando el par está declarado en los dos
sentidos —la misma prueba que usa el hreflang— y el original en español si
no; `<ArticleLink>` lo usan los tres lugares y marca «(en español)» sólo
cuando el destino sigue siendo español. 4 tests en rojo sin el cambio.

Efecto medido (sin contar la propia página):

| Página | Antes | Después |
|---|---|---|
| `/blog/is-my-dj-set-in-the-right-order` | 7 | 10 |
| `/blog/how-much-energy-jump-is-too-much-dj` | 4 | 8 |
| `/blog/dj-tracks-with-no-bpm-or-key` | 5 | 9 |
| `/blog/analyse-your-dj-set-before-you-play-it` | 4 | 6 |
| `/blog/order-a-dj-set-from-a-text-list` | 4 | 5 |
| `/es/blog/esta-bien-el-orden-de-mi-set` | 11 | 8 |
| `/es/blog/cuanto-es-mucho-salto-de-energia` | 11 | 7 |
| `/es/blog/tus-temas-no-tienen-bpm-ni-tonalidad` | 11 | 9 |
| `/es/blog/antes-de-tocar-no-despues` | 9 | 6 |
| `/es/blog/ordenar-un-set-desde-una-lista-de-texto` | 7 | 6 |

Los españoles bajan a propósito: lo que pierden son enlaces desde páginas en
inglés, que mandaban a un lector de inglés a un texto en otro idioma.

De paso, con los enlaces en negrita ahora reales, suben las entradas del
glosario que esos artículos nombran: `/glossary/closing-set` 4 → 7,
`/glossary/peak-time` 13 → 15, `/glossary/warm-up` 12 → 14, y las españolas
una cada una por la guía.

## Observaciones que no se arreglaron

- **Descripciones fuera de rango**, anteriores a este lote: `/es/import-formats`
  181 caracteres y `/import-formats` 177; `/install` 89 y `/es/install` 102.
  Medidas decodificando entidades sobre el build.
