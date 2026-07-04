import {
  CONTEXT_ENGINE_V1,
  ENERGY_SCORE_BPM_BANDS,
  ENERGY_SCORE_RANGE,
  STANDARD_TRACK_DURATION_MINUTES,
  type PlaylistContext,
} from "@/lib/product/strategy"
import type { EnergySource, ResolvedTrackEnergy } from "@/types/analysis"

/**
 * Interpolation anchors for the open-ended first and last BPM bands (A1).
 * Below the low anchor the score clamps to the band minimum; above the high
 * anchor it clamps to the band maximum.
 */
export const OPEN_BAND_ANCHORS = {
  lowBpm: 105,
  highBpm: 150,
} as const

/** Fallback range used when a playlist has no context set (A2). */
const NO_CONTEXT_FALLBACK_RANGE = { min: 4, max: 8 } as const

interface NormalizedBand {
  min: number
  max: number
  scoreMin: number
  scoreMax: number
}

const NORMALIZED_BANDS: NormalizedBand[] = ENERGY_SCORE_BPM_BANDS.map(
  (band) => ({
    min:
      "minBpmInclusive" in band
        ? band.minBpmInclusive
        : Number.NEGATIVE_INFINITY,
    max: band.maxBpmInclusive,
    scoreMin: band.scoreMin,
    scoreMax: band.scoreMax,
  })
)

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function findBand(bpm: number): NormalizedBand {
  const match = NORMALIZED_BANDS.find(
    (band) => bpm >= band.min && bpm <= band.max
  )

  if (match) {
    return match
  }

  // BPM values falling in a gap between two bands (e.g. 122.005) round into
  // the lower band (A1).
  const lower = [...NORMALIZED_BANDS]
    .reverse()
    .find((band) => band.max < bpm)

  return lower ?? NORMALIZED_BANDS[0]
}

/**
 * Maps a BPM to an energy score by linear interpolation across the matching
 * band's BPM range onto its score range, rounded to one decimal (A1).
 */
export function energyScoreFromBpm(bpm: number): number {
  const band = findBand(bpm)
  const bandMin =
    band.min === Number.NEGATIVE_INFINITY ? OPEN_BAND_ANCHORS.lowBpm : band.min
  const bandMax =
    band.max === Number.POSITIVE_INFINITY ? OPEN_BAND_ANCHORS.highBpm : band.max

  const t = bandMax === bandMin ? 0 : clamp01((bpm - bandMin) / (bandMax - bandMin))

  return roundToOneDecimal(lerp(band.scoreMin, band.scoreMax, t))
}

/**
 * Position-based fallback when a track has no BPM and no manual score (A2):
 * linear ramp across the context's expected energy range.
 */
export function estimatedScoreFromPosition(
  index: number,
  trackCount: number,
  context: PlaylistContext | null
): number {
  const range = context
    ? {
        min: CONTEXT_ENGINE_V1[context].expectedEnergyMin,
        max: CONTEXT_ENGINE_V1[context].expectedEnergyMax,
      }
    : NO_CONTEXT_FALLBACK_RANGE

  const t = trackCount <= 1 ? 0.5 : clamp01(index / (trackCount - 1))

  return roundToOneDecimal(lerp(range.min, range.max, t))
}

export interface TrackEnergyInput {
  id?: string | null
  position: number
  bpm: number | null
  energy_score: number | null
}

/**
 * Resolves the energy score for every track with the precedence
 * manual > BPM-derived > position-estimated (A3), tagging the source so the
 * UI can label where each value came from.
 */
export function resolveTrackEnergies(
  tracks: TrackEnergyInput[],
  context: PlaylistContext | null
): ResolvedTrackEnergy[] {
  return tracks.map((track, index) => {
    let score: number
    let source: EnergySource

    if (track.energy_score !== null) {
      score = roundToOneDecimal(
        Math.min(
          ENERGY_SCORE_RANGE.max,
          Math.max(ENERGY_SCORE_RANGE.min, track.energy_score)
        )
      )
      source = "manual"
    } else if (track.bpm !== null) {
      score = energyScoreFromBpm(track.bpm)
      source = "bpm"
    } else {
      score = estimatedScoreFromPosition(index, tracks.length, context)
      source = "estimated"
    }

    return {
      trackId: track.id ?? null,
      position: track.position,
      score,
      source,
    }
  })
}

export function estimateSetDurationMinutes(trackCount: number): number {
  return trackCount * STANDARD_TRACK_DURATION_MINUTES
}
