import { assessTransitions } from "@/lib/engine/analysis"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  GENRE_LABELS,
  GENRE_TRANSITION_TOLERANCE_V2,
  SUPPORTED_GENRES,
} from "@/lib/product/strategy"

/**
 * The figures an article can embed with a fenced block:
 *
 *     ```figure
 *     set-order-example
 *     ```
 *
 * Lote 22. A closed list on purpose: an id the parser does not know is an
 * error at build time, not an empty space on a published page.
 *
 * Every number a figure draws comes from the engine or from a constant the
 * article is tested against. The words around it are copy; the numbers never
 * are — the same rule as `<EscalaEnergia>` and the harmonic cheat sheet.
 */
export { BLOG_FIGURE_IDS, isBlogFigureId, type BlogFigureId } from "@/lib/blog/figure-ids"

/**
 * The worked example in «¿Está bien el orden de mi set?» and its English twin:
 * nine energies, and one track moved. `after` is computed from the move rather
 * than typed, and a test holds the article's printed sequences to both.
 */
const BEFORE = [4, 5, 5, 8, 4, 6, 7, 9, 8]
/** 1-based, as the article says it: «mové el tema 4 a la posición 7». */
const MOVE = { track: 4, toPosition: 7 }

function applyMove(scores: number[], track: number, toPosition: number) {
  const next = [...scores]
  const [moved] = next.splice(track - 1, 1)
  next.splice(toPosition - 1, 0, moved)
  return next
}

export const SET_ORDER_EXAMPLE = {
  before: BEFORE,
  move: MOVE,
  after: applyMove(BEFORE, MOVE.track, MOVE.toPosition),
} as const

/**
 * The genre whose tolerance judges the example. The article names none; house
 * carries the engine's default (2 up, 2 down), so it is the neutral reading.
 */
export const EXAMPLE_GENRE = "house" as const

/**
 * Transitions the engine penalizes in a sequence, 1-based positions. Breathers
 * (a controlled drop after a sustained peak) are craft and are not returned.
 */
export function flaggedTransitions(scores: readonly number[]) {
  return assessTransitions([...scores], EXAMPLE_GENRE)
    .filter((t) => !t.isBreather && t.penalty > 0)
    .map((t) => ({ from: t.index + 1, to: t.index + 2, delta: t.delta }))
}

/** A signed step as the articles write it: «+3», «−4» (a real minus). */
export function formatStep(delta: number, locale: SiteLocale): string {
  const n = Math.abs(delta).toLocaleString(locale === "es" ? "es-AR" : "en-US")
  return `${delta < 0 ? "−" : "+"}${n}`
}

/** The tolerance rows, in the engine's genre order. */
export function toleranceRows() {
  return SUPPORTED_GENRES.map((genre) => ({
    genre,
    label: GENRE_LABELS[genre],
    ...GENRE_TRANSITION_TOLERANCE_V2[genre],
  }))
}

type Bilingual = Record<SiteLocale, string>

export const BLOG_FIGURE_COPY = {
  setOrder: {
    title: {
      es: "El mismo set, antes y después de mover un tema",
      en: "The same set, before and after moving one track",
    } satisfies Bilingual,
    before: { es: "Antes", en: "Before" } satisfies Bilingual,
    after: { es: "Después", en: "After" } satisfies Bilingual,
    flagged: {
      es: "Saltos que el análisis marca",
      en: "Jumps the analysis flags",
    } satisfies Bilingual,
    none: { es: "ninguno", en: "none" } satisfies Bilingual,
    between: {
      es: "temas {from} → {to}",
      en: "tracks {from} → {to}",
    } satisfies Bilingual,
    /** The same, for a screen reader, which reads «→» as an arrow. */
    betweenSpoken: {
      es: "entre los temas {from} y {to}",
      en: "between tracks {from} and {to}",
    } satisfies Bilingual,
    energy: { es: "energía", en: "energy" } satisfies Bilingual,
    caption: {
      es: "Marcado con la misma regla con la que el análisis penaliza un salto: más de {rise} puntos de subida o {drop} de bajada, la tolerancia de {genre}.",
      en: "Flagged with the rule the analysis scores a jump by: more than {rise} points up or {drop} down, the tolerance for {genre}.",
    } satisfies Bilingual,
  },
  tolerance: {
    title: {
      es: "Cuánto puede subir o bajar la energía entre dos temas, por género",
      en: "How far energy can rise or drop between two tracks, by genre",
    } satisfies Bilingual,
    rise: { es: "Subida", en: "Rise" } satisfies Bilingual,
    drop: { es: "Bajada", en: "Drop" } satisfies Bilingual,
    caption: {
      es: "Pasado este margen, el análisis empieza a descontar puntos, en proporción a cuánto se pasa. Son los valores del motor de EnergyCurve.",
      en: "Past this margin, the analysis starts taking points off, in proportion to how far past it the step goes. These are EnergyCurve's engine values.",
    } satisfies Bilingual,
  },
} as const
