# Revisión mensual de SEO — SEO-E27

**El primer lunes de cada mes, ~1 h.** Search Console primero, después la
corrida de visibilidad en IA, y al final una nota de 10 líneas en Asana con los
números de la columna «Se anota». Escrito el 10/10/2026 (lote 19).

Antes de abrir nada: `curl -s https://energycurve.app/sitemap.xml | grep -c '<loc>'`
— cuántas URLs tiene el sitemap **hoy**. Es el denominador de todo lo de abajo.

## Search Console, en este orden

Período: **últimos 28 días**, comparado con los 28 anteriores. Propiedad:
`energycurve.app`.

| # | Pantalla | Se anota | Mala señal |
|---|---|---|---|
| 1 | **Sitemaps** | Estado y «URLs descubiertas» | Estado distinto de «Correcto», o descubiertas ≠ el `curl` de arriba (Google lee un sitemap viejo o uno roto) |
| 2 | **Indexación → Páginas** | Indexadas · No indexadas · y las no indexadas **por motivo** | Ver «Cómo leer los motivos», abajo |
| 3 | **Rendimiento → Resultados de búsqueda** | Clics · Impresiones · CTR · Posición media | Impresiones que caen dos revisiones seguidas. Un mes solo es ruido con estos volúmenes |
| 4 | Rendimiento, filtro **Consulta que no contiene `energycurve`** | Clics sin marca | Es el KPI de `SEO-PLAN.md` §4 (meta: 150/mes al 15/12). Si sube la marca y no esto, el contenido no está trayendo a nadie nuevo |
| 5 | Rendimiento, pestaña **Páginas**, los 5 primeros | URL e impresiones de cada una | Que la portada concentre casi todo: el contenido no rankea por sí mismo |
| 6 | **Experiencia → Métricas web principales** (mobile) | URLs «Buenas» · «Necesitan mejora» · «Deficientes» | Cualquier URL en «Deficientes». Cruzalo con `docs/seo/cwv-log.md`, que tiene el laboratorio de las mismas semanas. «Sin datos suficientes» es lo esperable con poco tráfico, no una falla |
| 7 | **Mejoras** (cada informe que aparezca: rutas de navegación, productos, etc.) | Elementos válidos · no válidos, por informe | Cualquier elemento **no válido**: es JSON-LD que Google no acepta, y todo el JSON-LD sale de `lib/`, así que es un bug, no contenido |
| 8 | **Enlaces → Enlaces internos**, «Páginas más enlazadas» | Las 5 primeras | Que `/tools` o `/pricing` no estén arriba. El número propio se mide con `scripts/inbound-links.mjs` (ver `docs/seo/enlazado-interno-2026-10.md`) |

### Cómo leer los motivos de «no indexada»

Esto le costó una sesión entera a Robertino el 20/09 y está escrito en
`docs/seo/indexacion-2026-09.md` §1 y §5. Resumido:

| Motivo | Qué es | Qué hacer |
|---|---|---|
| **Rastreada: actualmente sin indexar** | **El único que es un juicio de calidad.** Google leyó la página y decidió no indexarla | Anotá cada URL. Si la misma está dos revisiones seguidas, es candidata a engordar (ver §4 y §6 de `indexacion-2026-09.md`) |
| **Detectada: actualmente sin indexar** | Una **cola**, no un juicio: Google conoce la URL y todavía no la leyó | Sólo el número total. Es mala señal si **no baja en dos revisiones seguidas** con el sitio ya rastreado; ahí deja de ser cola |
| Página con redirección | Las redirecciones de SEO-E07 (`www` → sin `www`) | Nada, salvo que aparezca una URL del sitemap |
| No encontrada (404) · Error del servidor (5xx) · Bloqueada por robots.txt · Excluida por `noindex` | Si la URL **está en el sitemap**, es un bug: el sitemap promete algo que el sitio niega | Abrir tarea con la URL. `e2e/sitemap-links.spec.ts` debería haberlo atrapado; si no lo hizo, también es un hallazgo |
| Duplicada / canónica distinta | Google eligió otra canónica | Mirar con «Inspeccionar URL» si la elegida es la gemela de otro idioma: sería un problema de hreflang |

## Visibilidad en IA

La corrida de `docs/seo/ai-visibility-tracker.md` (SEO-E04), con su
procedimiento: diez consignas, cinco motores, el mismo día. Se anota el
resumen: consignas que nombran a EnergyCurve, de 10, por motor.

Mala señal: un motor que nombraba a EnergyCurve y deja de hacerlo, o un
competidor nuevo que aparece en varias consignas.

## La nota de Asana — 10 líneas

```
Revisión SEO <fecha> — sitemap <N> URLs
GSC sitemap: <estado>, <descubiertas> descubiertas
Indexadas <N> · no indexadas <N> (rastreada <N> · detectada <N> · otras <N>)
Rastreadas sin indexar: <URLs, o «ninguna»>
28 días: <clics> clics · <impresiones> impr. · CTR <x> % · pos. <y> (antes: …)
Clics sin marca: <N> (meta 150/mes al 15/12)
CWV mobile: <buenas>/<mejorar>/<deficientes> · cwv-log: <última fila>
Mejoras no válidas: <N, por informe, o «0»>
IA: <ChatGPT n/10 · Perplexity n/10 · Google n/10 · Claude n/10 · Gemini n/10>
Malas señales: <la lista de arriba que se cumplió, o «ninguna»>
```

Un número que no se pudo ver se escribe «sin dato» y por qué. Una revisión con
huecos sirve; una con números de memoria, no.
