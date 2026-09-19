/**
 * Page chrome for the guides and the glossary, in both languages.
 *
 * Same shape as every other copy module in this folder: a plain object of
 * `{ en, es }` leaves, indexed at render. The entries themselves live in
 * `lib/content/glossary/terms.ts` and `lib/content/guides/guides.ts` — this is
 * only the furniture around them.
 */

import type { Bilingual, CurveShape } from "@/lib/content/content-nodes"

export const GLOSSARY_COPY = {
  h1: { es: "Glosario para DJs", en: "DJ glossary" },
  standfirst: {
    es: "Veintiún términos que aparecen al preparar un set, explicados sin vueltas y con un ejemplo concreto.",
    en: "Twenty-one words that come up while preparing a set, explained plainly and with a concrete example.",
  },
  filterLabel: { es: "Filtrar términos", en: "Filter terms" },
  filterPlaceholder: { es: "Escribí para filtrar…", en: "Type to filter…" },
  empty: {
    es: "Ningún término coincide con lo que escribiste.",
    en: "No term matches what you typed.",
  },
  count: { es: "términos", en: "terms" },
  backToIndex: { es: "Volver al glosario", en: "Back to the glossary" },
  seeAlso: { es: "Ver también", en: "See also" },
  keepReading: { es: "Seguir leyendo", en: "Keep reading" },
  inShort: { es: "En corto", en: "In short" },
  home: { es: "Inicio", en: "Home" },
} as const

export const GUIDES_COPY = {
  h1: { es: "Guías", en: "Guides" },
  standfirst: {
    es: "Guías largas sobre preparar un set: leer una curva, ordenar temas y decidir qué mover.",
    en: "Long-form guides on preparing a set: reading a curve, ordering tracks, and deciding what to move.",
  },
  empty: {
    es: "Todavía no hay guías publicadas. La primera está en escritura.",
    en: "No guides published yet. The first one is being written.",
  },
  contents: { es: "Contenido", en: "Contents" },
  updatedOn: { es: "Actualizada el", en: "Updated on" },
  readingTime: { es: "min de lectura", en: "min read" },
  related: { es: "Relacionado", en: "Related" },
  backToIndex: { es: "Volver a las guías", en: "Back to the guides" },
  draftBadge: { es: "Borrador — no indexada", en: "Draft — not indexed" },
  home: { es: "Inicio", en: "Home" },
} as const

export const CTA_COPY = {
  tool: {
    title: {
      es: "Mirá la curva de tu set, gratis",
      en: "See your set's curve, free",
    },
    body: {
      es: "Sin cuenta y sin subir el archivo a ningún lado: el análisis pasa en tu navegador.",
      en: "No account, and nothing uploaded anywhere: the analysis happens in your browser.",
    },
    action: { es: "Abrir la herramienta", en: "Open the tool" },
  },
  signup: {
    title: {
      es: "Guardá tus sets y seguí cómo cambian",
      en: "Save your sets and watch them change",
    },
    body: {
      es: "Una cuenta gratis guarda tus análisis y te deja compararlos entre fechas.",
      en: "A free account keeps your analyses and lets you compare them across nights.",
    },
    action: { es: "Crear cuenta gratis", en: "Create a free account" },
  },
} as const

/**
 * The energy scale table's words.
 *
 * The numbers are not here on purpose: they are read from
 * `lib/product/strategy.ts` and `lib/charts/energy-colors.ts` by the component.
 * These are the labels that describe them, which is copy — and the distinction
 * is what keeps the table from becoming a second source of truth.
 */
export const ENERGY_SCALE_COPY = {
  heading: { es: "La escala de energía, del 1 al 10", en: "The energy scale, 1 to 10" },
  scoreColumn: { es: "Puntaje", en: "Score" },
  bandColumn: { es: "Franja", en: "Band" },
  meaningColumn: { es: "Qué significa", en: "What it means" },
  bpmHeading: { es: "Qué BPM sugiere qué puntaje", en: "Which BPM suggests which score" },
  bpmColumn: { es: "BPM", en: "BPM" },
  suggestsColumn: { es: "Sugiere", en: "Suggests" },
  contextHeading: { es: "Qué rango espera cada toque", en: "The range each slot expects" },
  contextColumn: { es: "Toque", en: "Slot" },
  expectedColumn: { es: "Rango esperado", en: "Expected range" },
  bands: {
    low: {
      es: "Baja",
      en: "Low",
    },
    mid: {
      es: "Media",
      en: "Building",
    },
    high: {
      es: "Alta",
      en: "High",
    },
  },
  bandMeaning: {
    low: {
      es: "Abre, deja respirar o baja a propósito. Es la franja donde vive un warm-up.",
      en: "Opens, gives air, or comes down on purpose. This is where a warm-up lives.",
    },
    mid: {
      es: "El cuerpo de la mayoría de los sets: empuja sin llegar al techo.",
      en: "The body of most sets: pushing without hitting the ceiling.",
    },
    high: {
      es: "Pico. Se sostiene por contraste, no encadenando temas altos sin parar.",
      en: "Peak. Held by contrast, not by chaining high tracks without pause.",
    },
  },
  contexts: {
    opening: { es: "Apertura", en: "Opening" },
    main: { es: "Principal", en: "Main" },
    closing: { es: "Cierre", en: "Closing" },
  },
  footnote: {
    es: "Los rangos de esta tabla se leen de las constantes del motor: si el motor cambia, la tabla cambia con él. El BPM es una referencia de arranque, no un veredicto.",
    en: "The ranges in this table are read from the engine's constants: if the engine changes, so does the table. BPM is a starting reference, not a verdict.",
  },
  outOf: { es: "de 10", en: "of 10" },
} as const

/**
 * The five example curves.
 *
 * Illustrations of a shape, drawn on the same 1–10 scale the engine scores on.
 * They are not averages of anything and the caption does not claim they are —
 * we have not measured that, and a made-up average is exactly the kind of number
 * this repo refuses to print.
 */
export const CURVE_DEMOS: Record<
  CurveShape,
  { label: Bilingual; caption: Bilingual; scores: number[] }
> = {
  "warm-up": {
    label: { es: "Warm-up", en: "Warm-up" },
    caption: {
      es: "Empieza abajo y sube despacio. Termina con margen para que el que sigue tenga a dónde ir.",
      en: "Starts low and climbs slowly. Ends with headroom so the next DJ has somewhere to go.",
    },
    scores: [3, 3, 4, 4, 5, 5, 5, 6, 6, 6],
  },
  peak: {
    label: { es: "Peak time", en: "Peak time" },
    caption: {
      es: "Arriba casi todo el tiempo, pero con bajadas cortas: sin contraste, el pico se siente plano.",
      en: "High for most of it, but with short dips: without contrast, the peak reads as flat.",
    },
    scores: [7, 8, 9, 8, 9, 10, 8, 9, 10, 9],
  },
  journey: {
    label: { es: "Recorrido", en: "Journey" },
    caption: {
      es: "Una subida larga con un respiro en el medio. La forma más común de un set de varias horas.",
      en: "One long climb with a breath in the middle. The commonest shape for a set of several hours.",
    },
    scores: [3, 4, 5, 6, 5, 6, 7, 8, 9, 8],
  },
  closing: {
    label: { es: "Cierre", en: "Closing" },
    caption: {
      es: "Baja, pero con un repunte antes del final: bajar no es lo mismo que apagarse.",
      en: "Comes down, with a lift before the end: coming down is not the same as fading out.",
    },
    scores: [9, 8, 8, 7, 7, 6, 7, 6, 5, 4],
  },
  plana: {
    label: { es: "Plana", en: "Flat" },
    caption: {
      es: "El problema más común, dibujado: diez temas fuertes seguidos y ningún contraste que los sostenga.",
      en: "The commonest problem, drawn: ten strong tracks in a row and no contrast holding them up.",
    },
    scores: [8, 8, 9, 8, 8, 9, 8, 9, 8, 8],
  },
}

export const COMPONENT_COPY = {
  curveAlt: {
    es: "Curva de energía de ejemplo",
    en: "Example energy curve",
  },
  stepLabel: { es: "Paso", en: "Step" },
  termTooltipHint: {
    es: "Ver en el glosario",
    en: "See in the glossary",
  },
} as const
