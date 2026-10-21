# Convención de UTM

**20/10/2026, lote 20.** Cómo se etiqueta un enlace para que el backstage sepa
de dónde llegó cada usuario (`docs/seo/primer-contacto.md`), y cómo etiqueta el
sitio los enlaces que salen de él. **Las listas de este documento son cerradas**
y salen del código: `KNOWN_SOURCES` y `MEDIUMS` en
`lib/attribution/first-touch.ts`. `tests/utm-convention.test.ts` falla si este
documento y el código dicen cosas distintas, si un ejemplo de abajo no se lee
como dice, o si el repo publica un `utm_source` que no está en la lista.

## Las tres reglas

1. **Un enlace hacia EnergyCurve lleva `utm_source`, `utm_medium` y, si hay
   una acción concreta, `utm_campaign`.** Nada más: `utm_term` y `utm_content`
   no se leen, y un parámetro que el producto no lee es un parámetro que alguien
   termina copiando mal.
2. **Un enlace que sale de EnergyCurve dice `utm_source=energycurve`**, con
   medio `crosspromo` (StageLink) o `referral` (cualquier otro), y la campaña
   nombra el lugar de la página donde está el enlace. Lo arma `outboundHref()`
   (`lib/attribution/utm.ts`); nadie lo escribe a mano.
3. **Un enlace a una página propia no lleva UTM nunca**, y un identificador
   tampoco (`sameAs`, `url`, `citation` y el resto del JSON-LD). Esto incluye
   `llms.txt`: un asistente que cita una de esas páginas le agrega su propia
   etiqueta (ChatGPT pone su dominio, `chatgpt.com`, como `utm_source`), y la nuestra quedaría
   delante y convertiría «ChatGPT» en «un archivo». En `llms.txt` se etiqueta
   el único enlace que sale del sitio, el de StageLink.

## Fuentes

Una palabra, en minúscula. El producto también acepta las formas en que la
gente la escribe (`Instagram`, `IG`, `insta` → `instagram`), pero en un enlace
nuevo va la de esta tabla.

| Fuente | Medio que implica |
|---|---|
| `google` | organic |
| `bing` | organic |
| `duckduckgo` | organic |
| `yahoo` | organic |
| `ecosia` | organic |
| `brave` | organic |
| `chatgpt` | ai |
| `perplexity` | ai |
| `claude` | ai |
| `gemini` | ai |
| `copilot` | ai |
| `instagram` | social |
| `facebook` | social |
| `x` | social |
| `linkedin` | social |
| `youtube` | social |
| `tiktok` | social |
| `reddit` | social |
| `threads` | social |
| `producthunt` | directory |
| `alternativeto` | directory |
| `crunchbase` | directory |
| `stagelink` | crosspromo |

Una fuente que no está en la tabla **no se rechaza: se cuenta como `other` y su
texto se descarta.** Para que cuente con nombre, hay que agregarla al código y
a esta tabla en el mismo cambio.

Las fuentes de buscadores y de asistentes casi nunca se escriben a mano: el
producto las deduce del sitio que mandó a la persona. Están en la tabla porque
el backstage las muestra con esos nombres.

## Medios

| Medio | Cuándo |
|---|---|
| `none` | Nadie lo escribe: es el de una visita directa |
| `organic` | Un buscador |
| `ai` | Un asistente de IA |
| `social` | Una red social: bio, post, historia, comentario |
| `directory` | Un directorio o listado de productos |
| `crosspromo` | Entre productos de StageLink LLC, en cualquiera de las dos direcciones |
| `referral` | Cualquier otro sitio que enlaza |
| `other` | Nadie lo escribe: es el de un medio que no está en esta tabla |

## Campañas

Minúsculas, números y guiones; sin espacios, sin acentos, hasta 64 caracteres.
Si la campaña tiene fecha, va primero y con guiones (`2026-10-lanzamiento`).
Lo que no entra en el formato **se descarta, no se corrige**: una campaña con un
`@` es una dirección pegada en un enlace, y siete dígitos seguidos son un
teléfono o un número de cuenta.

## Tres ejemplos reales

Son los tres casos que pidió el lote: un directorio, una red social y el cruce
con StageLink. El test los lee y comprueba que el producto los cuenta como dice
la columna de la derecha.

| Dónde se publica | Enlace | Se cuenta como |
|---|---|---|
| La ficha de Product Hunt (SEO-E22, `docs/seo/entidad-perfiles.md`) | `https://energycurve.app/?utm_source=producthunt&utm_medium=directory&utm_campaign=2026-10-lanzamiento` | producthunt · directory · 2026-10-lanzamiento |
| La bio de Instagram, apuntando a la herramienta en español | `https://energycurve.app/es/herramientas/curva-de-energia?utm_source=instagram&utm_medium=social&utm_campaign=perfil-bio` | instagram · social · perfil-bio |
| El pie de StageLink, hacia EnergyCurve | `https://energycurve.app/?utm_source=stagelink&utm_medium=crosspromo&utm_campaign=footer-suite` | stagelink · crosspromo · footer-suite |

**Estos enlaces no se publicaron.** Los perfiles y las bios los publica
Robertino a mano, y este lote no tocó ninguno; el que esté vivo hoy sin
etiqueta sigue contando, por su referrer, como `instagram` o `producthunt` con
su medio.

## Los enlaces que el repo etiqueta

| Dónde | Hacia | Medio | Campaña |
|---|---|---|---|
| Portada, bloque de la familia de productos | StageLink | crosspromo | `landing-suite` |
| Pie, la frase de la familia | StageLink | crosspromo | `footer-family` |
| Pie, lista de recursos | StageLink | crosspromo | `footer-resources` |
| Menú de la portada | StageLink | crosspromo | `nav-menu` |
| `llms.txt`, la línea de la empresa operadora | StageLink | crosspromo | `llms-txt` |
| Las fuentes de cada comparación (`/compare/*`) | Los fabricantes | referral | `compare-sources` |
| El crédito de GetSongBPM en la búsqueda de títulos | GetSongBPM | referral | `title-lookup-credit` |

El pie es el mismo en la portada y en las páginas de contenido desde el lote 18,
así que `footer-family` y `footer-resources` cuentan los dos.

Las fuentes de las comparaciones salen con `rel="noreferrer"`: sin la etiqueta,
el fabricante no ve de dónde llegó la visita. Con la etiqueta la ve, que es lo
que pidió el lote. El `citation` del JSON-LD de esas páginas sigue con la URL
limpia (regla 3).
