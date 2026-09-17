# Tarea: fundación de contenido (guías + glosario)

Escrita por Robertino el 17/09/2026, sin empezar. Vive en el repo para que la pueda
tomar cualquier cuenta sin depender de que alguien la vuelva a pegar en un chat.

Contexto general del proyecto: [`docs/handoff-2026-09-17.md`](../handoff-2026-09-17.md) y
`AGENTS.md`. Lo que sigue es la tarea tal como fue especificada, más los hallazgos que ya
se hicieron para que nadie los redescubra.

---

## Encuadre

Rama nueva: `seo/content-foundation`. Empezá en **modo plan** y mostrá el plan antes de
implementar. **No hagas deploy.**

Hablá en español rioplatense con voseo. El código, los comentarios y los mensajes de
commit van en inglés, como todo el repo.

## Tono y vocabulario (importa mucho en esta tarea)

Voseo: "analizá", "pegá", "mirá". Cambiar de registro a mitad del funnel se lee como
traducción automática.

Vocabulario obligatorio: **tonalidad** (no "key"), **temas** (no sólo "tracks"),
**librería**, **preparar un set**, **toque** o **fecha** (no "gig"). El inglés es llano y
sin adornos.

Reglas de honestidad que el repo hace cumplir con tests: nada de números inventados, ni
cantidades de usuarios, ni claims de precisión. "Decí lo que no se sabe": `null` antes que
un número que el producto no puede sostener. Si una capacidad no está terminada, se dice.

---

## 1. Componentes reutilizables

Para blog, guías y glosario. Todos tienen que renderizar contenido legible en el **HTML
del servidor**.

- `<CurvaDemo shape="warm-up|peak|journey|closing|plana">` — gráfico de curva embebible,
  reusando el componente de la herramienta, con datos de ejemplo por forma y una línea de
  explicación. Varios en una misma página sin romper el layout en mobile.
- `<EscalaEnergia>` — tabla de la escala 1 a 10 alineada con el score de la app. **Los
  rangos salen del motor**, no se inventan.
- `<FAQ>` — lista de preguntas que además emite JSON-LD `FAQPage` de la página.
- `<Callout>`, `<Pasos>` (lista numerada con estilo), `<Comparacion>` (tabla).
- `<CTA>` reutilizable, con variantes "probar herramienta gratis" y "crear cuenta".

## 2. Ruta de guías

- `/es/guia/[slug]` ↔ `/guide/[slug]`, más índices `/es/guia` y `/guide`.
- Por guía: índice de contenidos con anclas a los H2, breadcrumbs, fecha de actualización
  visible, tiempo de lectura, artículos relacionados y CTA final.
- Schema `Article` (o `TechArticle`) + `BreadcrumbList` + hreflang + sitemap.
- Publicá **una guía de prueba en borrador** que **no** quede indexable (noindex y fuera
  del sitemap) usando **todos** los componentes, para poder revisarlos. La guía real la
  escribe Robertino después.

## 3. Glosario — 21 términos

- `/es/glosario` ↔ `/glossary` (índice con buscador simple, agrupado por letra) y una
  página por término: `/es/glosario/[termino]` ↔ `/glossary/[term]`.
- Los 21: curva de energía, energía de un track, BPM, tonalidad, rueda Camelot, Open Key,
  mezcla armónica, phrasing, drop, breakdown, build-up, warm-up, peak time, closing set,
  crowd reading, key lock, pitch, beatmatching, transición, cue point, B2B.
  **Compás, tracklist y residencia se sacaron a propósito**: no daban 150 palabras útiles
  sin rellenar. No los vuelvas a meter.
- Cada entrada: definición corta (1 o 2 frases) arriba, después 150–300 palabras con un
  ejemplo concreto, y links a la herramienta o al artículo que corresponda.
  **Si alguno no da para 150 palabras útiles, decilo y lo sacamos** en vez de rellenar.
- Schema `DefinedTerm` por entrada + `DefinedTermSet` en el índice + `BreadcrumbList`.
- Escribilas en español primero y traducí al inglés. Marcá en el resumen las definiciones
  sobre las que tengas dudas.

## 4. Enlaces internos

- `<Termino id="camelot">` para enlazar a una entrada del glosario desde cualquier
  contenido, con tooltip con la definición corta.
- En los 5 artículos existentes, enlazar la primera aparición de los términos que **ya**
  estén en el texto, **sin reescribir los artículos ni tocar los `.md`**.
- Sumar el glosario al footer y a los índices de herramientas.

## 5. Calidad

- Test que recorra todas las rutas del sitemap y falle si hay un link interno roto.
- Test que valide que cada página **nueva** tiene title, description de 140–155,
  canonical, hreflang recíproco y JSON-LD válido.

---

## Hallazgos previos (no los redescubras)

- **No hay MDX.** Los artículos pasan por un parser propio y deliberadamente restringido
  (`lib/blog/markdown.ts`) que **tira excepción** ante sintaxis no soportada. Devuelve
  bloques tipados con `InlineNode[]` planos: `{kind:"text"|"strong"|"em"|"link"}`.
  → `<CurvaDemo>` **no** puede ir dentro de un `.md` sin extender el parser. Los
  componentes son React, para guías y glosario. Para el punto 4, enlazar términos se
  resuelve **transformando los `InlineNode[]` ya parseados** (partir un nodo `text` en
  texto + link + texto).

- **El gráfico a reusar** es `components/playlists/set-curve.tsx` (client). Props:
  `scores: number[]`, `target: number[] | null`, `hoveredIndex: number | null`,
  `estimatedIndices?: readonly number[]`.

- **La escala de energía sale del motor.** Constantes reales:
  `lib/product/strategy.ts` → `ENERGY_SCORE_RANGE {min:1,max:10}`;
  `ENERGY_SCORE_BPM_BANDS` (≤114.99 → 3-4; 115-122 → 4-5; 122-128 → 5-7; 128-135 → 6-8;
  >135 → 7-10); `CONTEXT_ENGINE_V1` (opening 3-6, main 6-9, closing 7-9).
  `lib/charts/energy-colors.ts` → `energyColor()`: bandas visuales 1-4, 5-7, 8-10.
  Los números son del motor; las palabras que los describen son copy.

- **`ES_SLUGS` es para rutas fijas.** Los 21 términos tienen slug distinto por idioma, así
  que el slug debe vivir **con** el término. Las rutas dinámicas tampoco entran en
  `LOCALIZED_PATHS` (que alimenta el test de route-files); el sitemap las enumera aparte.

- **La guía borrador no puede usar `NOINDEX_PAGES`**: está tipado sobre `LocalizedPath`.
  Usá un flag `draft: true` que viaje con la guía y produzca las tres consecuencias
  (noindex, fuera del sitemap, fuera del índice).

- **El test de description 140–155 va sólo sobre páginas nuevas.** Las viejas no cumplen
  (`/install` en inglés son 89 caracteres, `/privacy` 62).

- **Sitemap**: 32 hoy → debe quedar en **78** = 32 + 2 índices de glosario + 42 entradas
  (21 × 2 idiomas) + 2 índices de guías. La guía borrador **no** va.

---

## Verificación (obligatoria)

- Build de producción, lint, `npx tsc --noEmit` y todos los tests existentes en verde.
- Playwright ES y EN: índice de glosario, una entrada, la guía de prueba con todos los
  componentes, tooltip de término, gráfico de curva embebido.
- `curl` sobre el build: índice de glosario, 3 entradas al azar y la guía de prueba.
  Reportar status, lang, title, largo de description, robots, canonical, hreflangs,
  JSON-LD (tipos + JSON válido) y palabras en el HTML del servidor.
- Sitemap: 78 URLs, todas 200, y la guía de prueba **no** incluida.
- Lighthouse mobile del índice de glosario ES y de una entrada.
- Capturas mobile y desktop de la guía de prueba mostrando cada componente.

## Al final

- Commits claros, resumen con la tabla de verificación, y la lista de definiciones sobre
  las que tengas dudas.
- Creá el PR listo para mergear (base `main`) y esperá a que CI quede en verde.
- **Actualizá el banco de pruebas** agregando una sesión nueva (p. ej. `CONT`) con las
  pruebas manuales de componentes, guías y glosario. El contenido vive en
  `docs/qa/banco-de-pruebas.html` (array `SESSIONS`; cada sesión es
  `{code, title, meta, why, tests:[{code, title, sub, steps[], expect, ifNot}]}`).
  El circuito está en `docs/qa/artifacts-handoff.md` y **el orden importa**: editar el
  archivo → commitear → recién entonces republicar pasando esa ruta y la URL del artifact
  de tu cuenta al publicador. **No toques estado ni notas**: eso vive en el almacén de la
  página, no en el repo.
