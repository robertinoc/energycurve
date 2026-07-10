import {
  DEFAULT_GENRE_BPM_PROFILE,
  DEFAULT_GENRE_CURVE_CHARACTER,
  GENRE_BPM_PROFILES_V2,
  GENRE_CURVE_CHARACTER_V2,
  GENRE_LABELS,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"
import type { SiteLocale } from "@/lib/content/site-copy"

/**
 * A short, plain-language coaching note for the detected genre — the copy shown
 * in the collapsible "Main genre detected" strip on the playlist detail view.
 *
 * Pure and derived from the frozen strategy constants (BPM band + curve
 * character) so it never contradicts the scoring engine. Optionally takes the
 * tracks to flag concrete BPM outliers that sit outside the genre's pocket.
 *
 * Localized with full sentence templates per language (not word swaps) so the
 * ES grammar reads naturally.
 */

interface TipTrack {
  bpm: number | null
}

type CurveCharacter = {
  build: "slow" | "standard" | "driving"
  sustainedPeak: boolean
  softLanding: boolean
}

const BUILD_ADVICE: Record<CurveCharacter["build"], Record<SiteLocale, string>> = {
  slow: {
    en: "give it a long, patient build before the peak",
    es: "dale una subida larga y paciente antes del pico",
  },
  driving: {
    en: "get into the pocket early and stay there",
    es: "entrá al pocket temprano y quedate ahí",
  },
  standard: {
    en: "build steadily into the peak in the last third",
    es: "construí de forma sostenida hacia el pico en el último tercio",
  },
}

const SUSTAINED_PEAK_SUFFIX: Record<SiteLocale, string> = {
  en: ", holding the peak as a plateau rather than one spike",
  es: ", sosteniendo el pico como meseta en vez de un solo golpe",
}

const SOFT_LANDING_SUFFIX: Record<SiteLocale, string> = {
  en: "; you can land the final track a touch below the peak",
  es: "; podés aterrizar el último track apenas por debajo del pico",
}

function buildAdvice(character: CurveCharacter, locale: SiteLocale): string {
  const build = BUILD_ADVICE[character.build][locale]

  if (character.sustainedPeak) {
    return `${build}${SUSTAINED_PEAK_SUFFIX[locale]}`
  }
  if (character.softLanding) {
    return `${build}${SOFT_LANDING_SUFFIX[locale]}`
  }
  return build
}

export function genreTip(
  genre: SupportedGenre,
  context: PlaylistContext | null,
  tracks: TipTrack[] = [],
  locale: SiteLocale = "en"
): string {
  const label = GENRE_LABELS[genre] ?? genre
  const bpm = GENRE_BPM_PROFILES_V2[genre] ?? DEFAULT_GENRE_BPM_PROFILE
  const character =
    GENRE_CURVE_CHARACTER_V2[genre] ?? DEFAULT_GENRE_CURVE_CHARACTER
  const advice = buildAdvice(character, locale)

  const parts: string[] = [
    locale === "es"
      ? `${label} suele vivir entre ${bpm.bpmLow}–${bpm.bpmHigh} BPM — ${advice}.`
      : `${label} usually lives around ${bpm.bpmLow}–${bpm.bpmHigh} BPM — ${advice}.`,
  ]

  const belowPocket = tracks.filter(
    (t) => t.bpm !== null && t.bpm < bpm.bpmLow
  ).length
  if (belowPocket > 0) {
    parts.push(
      locale === "es"
        ? `${belowPocket} track${belowPocket === 1 ? " queda" : "s quedan"} por debajo del pocket del género (menos de ${bpm.bpmLow} BPM) — vale la pena repasarlo${belowPocket === 1 ? "" : "s"}.`
        : `${belowPocket} track${belowPocket === 1 ? "" : "s"} sit${belowPocket === 1 ? "s" : ""} below the genre's pocket (under ${bpm.bpmLow} BPM) — worth a second look.`
    )
  }

  return parts.join(" ")
}
