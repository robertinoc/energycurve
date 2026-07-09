import {
  DEFAULT_GENRE_BPM_PROFILE,
  DEFAULT_GENRE_CURVE_CHARACTER,
  GENRE_BPM_PROFILES_V2,
  GENRE_CURVE_CHARACTER_V2,
  GENRE_LABELS,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"

/**
 * A short, plain-language coaching note for the detected genre — the copy shown
 * in the collapsible "Main genre detected" strip on the playlist detail view.
 *
 * Pure and derived from the frozen strategy constants (BPM band + curve
 * character) so it never contradicts the scoring engine. Optionally takes the
 * tracks to flag concrete BPM outliers that sit outside the genre's pocket.
 */

interface TipTrack {
  bpm: number | null
}

function buildAdvice(character: {
  build: "slow" | "standard" | "driving"
  sustainedPeak: boolean
  softLanding: boolean
}): string {
  const build =
    character.build === "slow"
      ? "give it a long, patient build before the peak"
      : character.build === "driving"
        ? "get into the pocket early and stay there"
        : "build steadily into the peak in the last third"

  if (character.sustainedPeak) {
    return `${build}, holding the peak as a plateau rather than one spike`
  }
  if (character.softLanding) {
    return `${build}; you can land the final track a touch below the peak`
  }
  return build
}

export function genreTip(
  genre: SupportedGenre,
  context: PlaylistContext | null,
  tracks: TipTrack[] = []
): string {
  const label = GENRE_LABELS[genre] ?? genre
  const bpm = GENRE_BPM_PROFILES_V2[genre] ?? DEFAULT_GENRE_BPM_PROFILE
  const character =
    GENRE_CURVE_CHARACTER_V2[genre] ?? DEFAULT_GENRE_CURVE_CHARACTER

  const parts: string[] = [
    `${label} usually lives around ${bpm.bpmLow}–${bpm.bpmHigh} BPM — ${buildAdvice(character)}.`,
  ]

  const belowPocket = tracks.filter(
    (t) => t.bpm !== null && t.bpm < bpm.bpmLow
  ).length
  if (belowPocket > 0) {
    parts.push(
      `${belowPocket} track${belowPocket === 1 ? "" : "s"} sit${belowPocket === 1 ? "s" : ""} below the genre's pocket (under ${bpm.bpmLow} BPM) — worth a second look.`
    )
  }

  return parts.join(" ")
}
