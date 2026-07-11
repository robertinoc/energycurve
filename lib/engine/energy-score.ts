import {
  BPM_PROFILE_EDGE_RAMP,
  CONTEXT_ENGINE_V1,
  DEFAULT_GENRE_BPM_PROFILE,
  ENERGY_SCORE_BPM_BANDS,
  ENERGY_SCORE_RANGE,
  GENRE_BPM_PROFILES_V2,
  LOUDNESS_RULES_V4,
  STANDARD_TRACK_DURATION_MINUTES,
  TRACK_GENRE_ANCHOR_BPM_MARGIN,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"
import { toCamelot } from "@/lib/music/camelot"
import { mapGenreTag } from "@/lib/playlists/genre-mapping"
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
 * V1 universal mapping, kept as the fallback when no genre is available:
 * linear interpolation across the matching band's BPM range onto its score
 * range, rounded to one decimal (A1).
 */
export function energyScoreFromBpmUniversal(bpm: number): number {
  const band = findBand(bpm)
  const bandMin =
    band.min === Number.NEGATIVE_INFINITY ? OPEN_BAND_ANCHORS.lowBpm : band.min
  const bandMax =
    band.max === Number.POSITIVE_INFINITY ? OPEN_BAND_ANCHORS.highBpm : band.max

  const t = bandMax === bandMin ? 0 : clamp01((bpm - bandMin) / (bandMax - bandMin))

  return roundToOneDecimal(lerp(band.scoreMin, band.scoreMax, t))
}

/**
 * Genre-relative BPM→energy mapping (B1): within the genre's [bpmLow, bpmHigh]
 * band energy interpolates 3→9; outside it keeps sliding toward the 1/10
 * extremes across a BPM_PROFILE_EDGE_RAMP window, then clamps. Without a
 * genre this falls back to the V1 universal bands so legacy playlists keep
 * their scores.
 */
export function energyScoreFromBpm(
  bpm: number,
  genre: SupportedGenre | null = null
): number {
  if (!genre) {
    return energyScoreFromBpmUniversal(bpm)
  }

  const profile = GENRE_BPM_PROFILES_V2[genre] ?? DEFAULT_GENRE_BPM_PROFILE

  if (bpm < profile.bpmLow) {
    const t = clamp01((profile.bpmLow - bpm) / BPM_PROFILE_EDGE_RAMP)

    return roundToOneDecimal(lerp(3, ENERGY_SCORE_RANGE.min, t))
  }

  if (bpm > profile.bpmHigh) {
    const t = clamp01((bpm - profile.bpmHigh) / BPM_PROFILE_EDGE_RAMP)

    return roundToOneDecimal(lerp(9, ENERGY_SCORE_RANGE.max, t))
  }

  const t =
    profile.bpmHigh === profile.bpmLow
      ? 0
      : (bpm - profile.bpmLow) / (profile.bpmHigh - profile.bpmLow)

  return roundToOneDecimal(lerp(3, 9, t))
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
  /** Free-text genre tag from import metadata; anchors this track's BPM mapping (B14). */
  genre?: string | null
  /** Musical key from import metadata; resolved to Camelot for harmony (B18). */
  musical_key?: string | null
  /** Perceived loudness in dB; refines the BPM energy within the set (B19). */
  perceived_db?: number | null
}

interface LoudnessContext {
  median: number
  spread: number
}

/**
 * Set-level loudness stats (B19). Only meaningful when enough tracks carry a
 * dB reading and they actually differ — otherwise null and no adjustment is
 * applied (never fabricate signal).
 */
function loudnessContextOf(tracks: TrackEnergyInput[]): LoudnessContext | null {
  const rules = LOUDNESS_RULES_V4
  const dbs = tracks
    .map((track) => track.perceived_db)
    .filter((db): db is number => db !== null && db !== undefined)

  if (dbs.length < rules.minTracksWithDb) {
    return null
  }

  const sorted = [...dbs].sort((a, b) => a - b)
  const spread = sorted[sorted.length - 1] - sorted[0]

  if (spread < rules.minSpreadDb) {
    return null
  }

  const mid = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]

  return { median, spread }
}

/**
 * Resolves the energy score for every track with the precedence
 * manual > BPM-derived > position-estimated (A3), tagging the source so the
 * UI can label where each value came from. The BPM mapping anchors to the
 * track's own genre tag when it maps to a known genre (B14) — a psy-trance
 * track inside a hard-techno set is judged on its own band — falling back to
 * the playlist's genre (B1). When the import carries perceived loudness, the
 * BPM anchor is refined by how loud the track is relative to the set (B19):
 * that is what differentiates the curve when BPMs are homogeneous.
 */
export function resolveTrackEnergies(
  tracks: TrackEnergyInput[],
  context: PlaylistContext | null,
  genre: SupportedGenre | null = null
): ResolvedTrackEnergy[] {
  const loudness = loudnessContextOf(tracks)

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
      // The track's own tag anchors its band only when the BPM is plausible
      // for that genre (B14) — a "Techno"-tagged track at 158 BPM is
      // mislabeled and would saturate on the wrong band.
      const tagGenre = mapGenreTag(track.genre)
      const tagProfile = tagGenre
        ? (GENRE_BPM_PROFILES_V2[tagGenre] ?? DEFAULT_GENRE_BPM_PROFILE)
        : null
      const tagPlausible =
        tagProfile !== null &&
        track.bpm >= tagProfile.bpmLow - TRACK_GENRE_ANCHOR_BPM_MARGIN &&
        track.bpm <= tagProfile.bpmHigh + TRACK_GENRE_ANCHOR_BPM_MARGIN
      const trackGenre = tagPlausible ? tagGenre : genre

      score = energyScoreFromBpm(track.bpm, trackGenre)
      source = "bpm"

      const db = track.perceived_db

      if (loudness && db !== null && db !== undefined) {
        const adjustment = Math.max(
          -LOUDNESS_RULES_V4.maxAdjustment,
          Math.min(
            LOUDNESS_RULES_V4.maxAdjustment,
            ((db - loudness.median) / loudness.spread) *
              LOUDNESS_RULES_V4.maxAdjustment *
              2
          )
        )

        score = roundToOneDecimal(
          Math.min(
            ENERGY_SCORE_RANGE.max,
            Math.max(ENERGY_SCORE_RANGE.min, score + adjustment)
          )
        )
        source = "bpm_loudness"
      }
    } else {
      score = estimatedScoreFromPosition(index, tracks.length, context)
      source = "estimated"
    }

    return {
      trackId: track.id ?? null,
      position: track.position,
      score,
      source,
      bpm: track.bpm,
      camelot: toCamelot(track.musical_key ?? null),
    }
  })
}

export function estimateSetDurationMinutes(trackCount: number): number {
  return trackCount * STANDARD_TRACK_DURATION_MINUTES
}
