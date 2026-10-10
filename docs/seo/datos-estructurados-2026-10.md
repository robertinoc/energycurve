# Datos estructurados — auditoría por tipo de página

**Fecha:** 10/10/2026. Lote 19, tarea 7. Lo que «emite» cada página se leyó
del HTML servido por el build de la rama (`next start`, `curl`, cada bloque
`application/ld+json` parseado con `JSON.parse` y recorrido en busca de cada
`@type`), no del código.

La regla para decidir: **un tipo entra sólo si habilita un resultado
enriquecido concreto o le aclara algo concreto a un motor de respuestas.**
Schema por completitud es superficie que mantener sin nada a cambio. Y todo
sale de un builder en `lib/` (`AGENTS.md`).

Dos datos de contexto que cambian la cuenta, de la documentación de Google
Search Central de agosto/septiembre de 2023: los resultados enriquecidos de
**`FAQPage`** quedaron sólo para sitios de gobierno y salud, y los de
**`HowTo`** se retiraron. Nada de eso hace incorrecto el markup que ya
tenemos —lo siguen leyendo los motores de respuestas—, pero significa que
agregar más de esos dos tipos no compra ningún resultado en Google.

## Lo que emite cada tipo de página

| Tipo de página | URLs (EN; ES igual) | Emite | Le faltaría | Decisión |
|---|---|---|---|---|
| Portada | `/` | `Organization`, `SoftwareApplication` + 3 `Offer`, `FAQPage` | **`WebSite`** | **Agregado, sólo en `/`.** Ver abajo |
| Portada ES | `/es` | Lo mismo | — | Sin `WebSite`: Google lee el nombre del sitio del dominio, no de un subdirectorio |
| Precios | `/pricing` | `Product` + `AggregateOffer` (3 `Offer`), `BreadcrumbList` | — | Bien. Habilita fragmentos de producto con precio |
| Índice de herramientas | `/tools` | `BreadcrumbList` | `CollectionPage` + `ItemList` | **No.** Google no tiene un carrusel para listas de aplicaciones (los carruseles de `ItemList` son de recetas, cursos, películas y restaurantes), y el HTML ya lista las cuatro con su descripción |
| Herramientas (4) | `/tools/energy-curve`, `camelot-wheel`, `key-bpm-compatibility`, `traktor-rekordbox-converter` | `WebApplication` (subtipo de `SoftwareApplication`) + `Offer` a 0, `FAQPage`, `BreadcrumbList` | `aggregateRating` | **El candidato «`SoftwareApplication`» ya existe.** El resultado enriquecido de software pide además `aggregateRating` o `review`, y no hay ni una reseña real: no se inventa. Queda como está, útil para un motor de respuestas («es gratis, corre en el navegador») |
| Glosario | `/glossary` | `DefinedTermSet` con sus 21 `DefinedTerm`, `BreadcrumbList` | — | **El candidato «`DefinedTerm` en `DefinedTermSet`» ya existe**, desde que se escribió el glosario |
| Entrada del glosario (21) | `/glossary/*` | `DefinedTerm` con `inDefinedTermSet`, `BreadcrumbList` | — | Bien |
| Blog | `/blog` | `Blog` con sus `BlogPosting`, `BreadcrumbList` | — | Bien |
| Artículo (15 EN, 9 ES) | `/blog/*` | `BlogPosting`, `WebPage`, `BreadcrumbList`, `FAQPage` | — | Bien. Habilita el resultado de artículo |
| Guías | `/guide` | `CollectionPage` con sus `TechArticle` | — | Bien |
| Guía | `/guide/energy-curve-in-a-dj-set` | `TechArticle`, `BreadcrumbList`, `FAQPage` | — | Bien. **Arreglado de paso** (tarea 3): la respuesta del FAQ llegaba al `FAQPage` con markdown crudo |
| Comparaciones (6) | `/compare/*` | `WebPage` con `citation` y `lastReviewed`, `BreadcrumbList`, `FAQPage` | — | Bien. `citation` y `lastReviewed` son lo que le dice a un motor de respuestas de dónde sale cada afirmación sobre el competidor y de cuándo es |
| Referencia (3) | `/harmonic-mixing-cheat-sheet`, `/energy-tags`, `/import-formats` | `TechArticle`, `WebPage`, `FAQPage`, `BreadcrumbList` | — | Bien |
| Instalar | `/install` | `HowTo`, `FAQPage`, `WebPage`, `BreadcrumbList` | — | Bien como está; el `HowTo` ya no da resultado enriquecido en Google (ver arriba) y no se saca: no cuesta nada y es correcto |
| Legales (4) | `/privacy`, `/terms`, `/cookie-policy`, `/subprocessors` | Nada | — | Bien. Ningún tipo les compra nada |

## Lo que se implementó: `WebSite` en `/`

```json
{ "@type": "WebSite", "@id": "https://energycurve.app/#website",
  "name": "EnergyCurve", "alternateName": "EnergyCurve DJ",
  "url": "https://energycurve.app/",
  "publisher": { "@id": "https://energycurve.app/#organization" } }
```

**Qué habilita:** el **nombre del sitio** que Google muestra arriba de cada
resultado. Google lo toma de `WebSite` en la página de inicio del dominio; sin
él, lo adivina (del título, o muestra el dominio pelado). Con
`energycurve.com` —la empresa agrícola de `docs/brand-name-collision.md`— en
la misma palabra, declarar el nombre y su desambiguador «EnergyCurve DJ» es
lo que se quiere. Son los mismos dos textos que ya lleva `Organization`.

**Dónde no:** en `/es`. Google lee nombres de sitio a nivel dominio y
subdominio, no de un subdirectorio; un segundo `WebSite` ahí sería una
declaración que compite con la primera.

**Builder:** `buildWebSite()` en `lib/seo.ts`, sumado al grafo de
`buildLandingStructuredData` sólo para `en`. Sin `SearchAction`: el sitio no
tiene buscador, y declarar uno que no existe es exactamente lo que no.

**Verificado:** `tests/seo.test.ts` (rojo sin el cambio), y sobre el build,
`curl` a `/` y a `/es`: el bloque parsea, `/` tiene `WebSite` y `/es` no.
**Sin verificar:** qué nombre muestra Google. Eso se ve en Search Console
semanas después del deploy, y es una fila del banco.
