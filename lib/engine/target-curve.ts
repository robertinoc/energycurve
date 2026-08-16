import {
  CURVE_SHAPE_ANCHORS,
  DEFAULT_GENRE_CURVE_CHARACTER,
  GENRE_CURVE_CHARACTER_V2,
  TARGET_CURVE_V2,
  type CurveShape,
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
 * Energy a named shape asks for at t ∈ [0, 1], interpolating between anchors.
 *
 * Clamped at both ends rather than extrapolated: a shape says nothing about what
 * happens outside the set it describes, and inventing values there would be
 * making up a promise the shape never made.
 */
function shapeEnergyAt(
  t: number,
  anchors: readonly (readonly [number, number])[]
): number {
  const clamped = Math.min(Math.max(t, 0), 1)

  for (let i = 1; i < anchors.length; i += 1) {
    const [prevT, prevEnergy] = anchors[i - 1]
    const [nextT, nextEnergy] = anchors[i]

    if (clamped <= nextT) {
      const span = nextT - prevT

      return span === 0
        ? nextEnergy
        : lerp(prevEnergy, nextEnergy, (clamped - prevT) / span)
    }
  }

  return anchors[anchors.length - 1][1]
}

/**
 * Samples the ideal curve at the set's actual track count, so comparing a set
 * against its target is length-invariant by construction (B2). A single-track
 * set samples the midpoint.
 */
export function buildTargetCurve(
  trackCount: number,
  context: PlaylistContext,
  genre: SupportedGenre,
  /**
   * Explicit shape the DJ picked. When absent the target is derived from
   * context + genre exactly as before, so every existing set keeps its score.
   * When present it wins outright: the DJ telling us what they are playing is
   * better information than our inference from two tags.
   */
  shape?: CurveShape | null,
  /**
   * A saved template's anchors. Wins over `shape` when both are given, because
   * a DJ who saved their own shape and then picked it is asking for theirs —
   * and the two can only both be set through a stale form.
   */
  customAnchors?: readonly (readonly [number, number])[] | null
): number[] {
  if (trackCount <= 0) {
    return []
  }

  const character = genreCurveCharacter(genre)

  return Array.from({ length: trackCount }, (_, index) => {
    const t = trackCount === 1 ? 0.5 : index / (trackCount - 1)

    const anchors =
      customAnchors && customAnchors.length >= 2
        ? customAnchors
        : shape
          ? CURVE_SHAPE_ANCHORS[shape]
          : null

    return roundToOneDecimal(
      anchors
        ? shapeEnergyAt(t, anchors)
        : targetEnergyAt(t, context, character)
    )
  })
}
