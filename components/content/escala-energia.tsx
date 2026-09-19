import { ENERGY_SCALE_COPY } from "@/lib/content/content-copy"
import { energyColor } from "@/lib/charts/energy-colors"
import {
  CONTEXT_ENGINE_V1,
  ENERGY_SCORE_BPM_BANDS,
  ENERGY_SCORE_RANGE,
} from "@/lib/product/strategy"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * The 1–10 energy scale, read from the engine.
 *
 * Every number on this page is derived: the rows come from
 * `ENERGY_SCORE_RANGE`, the colour of each from `energyColor`, the tempo
 * reference from `ENERGY_SCORE_BPM_BANDS`, and the per-slot ranges from
 * `CONTEXT_ENGINE_V1`. Nothing is typed in twice.
 *
 * That is the whole point of the component. A table of energy bands written by
 * hand in a content file is a second source of truth, and the day someone
 * changes a band in `lib/product/strategy.ts` the page starts lying quietly —
 * to a reader who has no way of knowing, about a product they are paying for.
 * The words that describe the bands are copy; the numbers are never copy.
 */

function bandKey(score: number): "low" | "mid" | "high" {
  if (score >= 8) return "high"
  if (score >= 5) return "mid"
  return "low"
}

/** `-Infinity`/`Infinity` read as "up to" and "from", not as a symbol. */
function bpmLabel(
  band: (typeof ENERGY_SCORE_BPM_BANDS)[number],
  locale: SiteLocale
): string {
  const min = "minBpmInclusive" in band ? band.minBpmInclusive : undefined
  const max = band.maxBpmInclusive

  if (min === undefined || !Number.isFinite(min)) {
    return locale === "es" ? `hasta ${max}` : `up to ${max}`
  }

  if (!Number.isFinite(max)) {
    return locale === "es" ? `desde ${min}` : `from ${min}`
  }

  return `${min} – ${max}`
}

export function EscalaEnergia({ locale }: { locale: SiteLocale }) {
  const scores = Array.from(
    { length: ENERGY_SCORE_RANGE.max - ENERGY_SCORE_RANGE.min + 1 },
    (_, index) => ENERGY_SCORE_RANGE.min + index
  )

  const contexts = ["opening", "main", "closing"] as const

  return (
    <section className="my-6 flex flex-col gap-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4 sm:p-5">
      <h3 className="font-heading text-base font-semibold text-white">
        {ENERGY_SCALE_COPY.heading[locale]}
      </h3>

      <ul className="flex flex-col gap-1.5">
        {scores.map((score) => {
          const key = bandKey(score)

          return (
            /* Wraps on a phone: at 390px the three columns plus the sentence
               squeeze the sentence into a two-word ribbon. The description
               takes the full width below the score, and sits inline again from
               the small breakpoint up. */
            <li
              key={score}
              className="flex flex-wrap items-start gap-x-3 gap-y-1"
            >
              <span
                aria-hidden="true"
                className="mt-1.5 size-3 shrink-0 rounded-full"
                style={{ backgroundColor: energyColor(score) }}
              />
              <span className="w-16 shrink-0 font-mono text-sm text-white">
                {score}{" "}
                <span className="text-white/50">
                  {ENERGY_SCALE_COPY.outOf[locale]}
                </span>
              </span>
              <span className="w-20 shrink-0 text-sm text-white/72">
                {ENERGY_SCALE_COPY.bands[key][locale]}
              </span>
              <span className="w-full pl-6 text-sm leading-6 text-white/60 sm:w-auto sm:flex-1 sm:pl-0">
                {ENERGY_SCALE_COPY.bandMeaning[key][locale]}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col gap-2">
        <h4 className="text-[11px] uppercase tracking-[0.16em] text-white/50">
          {ENERGY_SCALE_COPY.bpmHeading[locale]}
        </h4>
        <ul className="flex flex-col gap-1">
          {ENERGY_SCORE_BPM_BANDS.map((band) => (
            <li
              key={`${band.maxBpmInclusive}`}
              className="flex gap-4 text-sm text-white/64"
            >
              <span className="w-28 shrink-0 font-mono">
                {bpmLabel(band, locale)}
              </span>
              <span>
                {band.scoreMin} – {band.scoreMax}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-[11px] uppercase tracking-[0.16em] text-white/50">
          {ENERGY_SCALE_COPY.contextHeading[locale]}
        </h4>
        <ul className="flex flex-col gap-1">
          {contexts.map((context) => (
            <li key={context} className="flex gap-4 text-sm text-white/64">
              <span className="w-28 shrink-0">
                {ENERGY_SCALE_COPY.contexts[context][locale]}
              </span>
              <span className="font-mono">
                {CONTEXT_ENGINE_V1[context].expectedEnergyMin} –{" "}
                {CONTEXT_ENGINE_V1[context].expectedEnergyMax}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs leading-5 text-white/50">
        {ENERGY_SCALE_COPY.footnote[locale]}
      </p>
    </section>
  )
}
