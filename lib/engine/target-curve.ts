import {
  DEFAULT_GENRE_CURVE_CHARACTER,
  GENRE_CURVE_CHARACTER_V2,
  TARGET_CURVE_V2,
  type GenreCurveCharacter,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t
}

export function genreCurveCharacter(
  genre: SupportedGenre
): GenreCurveCharacter {
  return GENRE_CURVE_CHARACTER_V2[genre] ?? DEFAULT_GENRE_CURVE_CHARACTER
}

/**
 * Continuous ideal-curve shape for a context + genre, evaluated at t ∈ [0, 1]
 * (B2). Kept separate from the sampler so both can be unit-tested.
 */
function targetEnergyAt(
  t: number,
  context: PlaylistContext,
  character: GenreCurveCharacter
): number {
  if (context === "opening") {
    const { startEnergy, endEnergy, slowBuildEndEnergy } =
      TARGET_CURVE_V2.opening
    const end = character.build === "slow" ? slowBuildEndEnergy : endEnergy

    return lerp(startEnergy, end, t)
  }

  if (context === "main") {
    const shape =
      character.build === "driving"
        ? TARGET_CURVE_V2.main.driving
        : character.build === "slow"
          ? TARGET_CURVE_V2.main.slow
          : TARGET_CURVE_V2.main.standard

    // Ramp to the climax position, then hold the peak. Waves around the
    // template are free within the shape-fit tolerance band (B3).
    return lerp(
      shape.startEnergy,
      shape.peakEnergy,
      Math.min(t / shape.climaxAt, 1)
    )
  }

  const closing = TARGET_CURVE_V2.closing
  const peak = character.sustainedPeak
    ? closing.drivingPeakEnergy
    : closing.peakEnergy
  const base = lerp(
    closing.startEnergy,
    peak,
    Math.min(t / closing.climaxAt, 1)
  )

  // Emotional genres may land the final stretch slightly below the peak (B2).
  if (character.softLanding && t > closing.softLandingFrom) {
    const dipT =
      (t - closing.softLandingFrom) / (1 - closing.softLandingFrom)

    return base - closing.softLandingDip * dipT
  }

  return base
}

/**
 * Samples the ideal curve at the set's actual track count, so comparing a set
 * against its target is length-invariant by construction (B2). A single-track
 * set samples the midpoint.
 */
export function buildTargetCurve(
  trackCount: number,
  context: PlaylistContext,
  genre: SupportedGenre
): number[] {
  if (trackCount <= 0) {
    return []
  }

  const character = genreCurveCharacter(genre)

  return Array.from({ length: trackCount }, (_, index) => {
    const t = trackCount === 1 ? 0.5 : index / (trackCount - 1)

    return roundToOneDecimal(targetEnergyAt(t, context, character))
  })
}
