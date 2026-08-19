/**
 * The subset of a track's audio analysis that is worth keeping.
 *
 * `AudioFeatures` (analysis-types.ts) is what the worker produces for one
 * analysis run. This is what survives into the database: the five scalar
 * predictors Energy Model v3 is specified against, plus enough provenance to
 * know whether a stored row is still comparable with a fresh one.
 *
 * Chroma is deliberately **not** persisted, even though the worker computes it
 * and a stored copy would let key detection be re-evaluated without re-decoding
 * audio. Chroma is a product of the extraction pipeline, and that pipeline is
 * exactly what the open key-detection work changes (harmonic/percussive
 * separation, tuning correction). A stored vector would be stale the moment
 * either lands, so it would be a cache guaranteed to mislead.
 */

import type { AudioFeatures } from "./analysis-types"

/**
 * Bumped whenever a change to extraction would make new numbers incomparable
 * with stored ones — a different frame size, a different windowing scheme, a
 * filter applied before the spectrum.
 *
 * 2: windowed sampling. Version 1 read every frame of the track; version 2 reads
 * three 30-second windows (lib/audio/sample-windows.ts), so `onsetRate` in
 * particular is measured over sampled audio rather than all of it.
 */
export const TRACK_FEATURES_VERSION = 2

export interface TrackAudioFeatures {
  /** Mean RMS across analysed frames, 0…1. Loudness proxy. */
  rmsMean: number
  /** 95th-percentile RMS — how loud the loud parts get. */
  rmsPeak: number
  /** Mean spectral flux: how fast the spectrum changes frame to frame. */
  fluxMean: number
  /** Mean normalised spectral entropy, 0…1. */
  entropyMean: number
  /** Detected onsets per second of analysed audio. */
  onsetRate: number
  /** Seconds of audio the analysed frames covered. */
  analyzedSeconds: number
  /** See TRACK_FEATURES_VERSION. */
  version: number
}

/**
 * Loose upper bounds, not tight expectations.
 *
 * The job here is to reject a payload that is not a feature set at all — a
 * client can send anything to a server action — while never rejecting a real
 * measurement for being surprising. Flux and onset rate have no theoretical
 * ceiling, so the caps sit far above anything observed rather than at the edge
 * of it: refusing to store a genuinely unusual track would corrupt the very
 * dataset this exists to collect.
 */
const BOUNDS: Record<keyof Omit<TrackAudioFeatures, "version">, [number, number]> = {
  rmsMean: [0, 1],
  rmsPeak: [0, 1],
  fluxMean: [0, 1000],
  entropyMean: [0, 1],
  onsetRate: [0, 100],
  analyzedSeconds: [0, 86_400],
}

function finiteInRange(value: unknown, [min, max]: [number, number]): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null
  }
  return value >= min && value <= max ? value : null
}

/**
 * Narrows unknown input — a jsonb column read, or a client payload — to a
 * feature set, or null.
 *
 * All-or-nothing on purpose. A half-parsed set would give the scorer some
 * predictors and not others, and a model fed a silently truncated feature vector
 * produces a plausible number from incomplete evidence, which is worse than
 * having no number and falling back to BPM.
 */
export function parseTrackAudioFeatures(
  input: unknown
): TrackAudioFeatures | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null
  }

  const raw = input as Record<string, unknown>
  const parsed: Partial<TrackAudioFeatures> = {}

  for (const key of Object.keys(BOUNDS) as (keyof typeof BOUNDS)[]) {
    const value = finiteInRange(raw[key], BOUNDS[key])
    if (value === null) {
      return null
    }
    parsed[key] = value
  }

  const version = finiteInRange(raw.version, [1, 1_000_000])
  if (version === null || !Number.isInteger(version)) {
    return null
  }

  return { ...(parsed as Omit<TrackAudioFeatures, "version">), version }
}

/** Drops chroma and stamps the extraction version. */
export function toTrackAudioFeatures(
  features: AudioFeatures
): TrackAudioFeatures | null {
  return parseTrackAudioFeatures({
    rmsMean: features.rmsMean,
    rmsPeak: features.rmsPeak,
    fluxMean: features.fluxMean,
    entropyMean: features.entropyMean,
    onsetRate: features.onsetRate,
    analyzedSeconds: features.analyzedSeconds,
    version: TRACK_FEATURES_VERSION,
  })
}

/**
 * Whether a stored set can be compared with one measured by the current build.
 *
 * Callers that aggregate across tracks — fitting the model, or reporting a
 * corpus — have to filter on this. Mixing extraction versions in one regression
 * would attribute a change in method to a change in the music.
 */
export function isCurrentFeatureVersion(
  features: TrackAudioFeatures
): boolean {
  return features.version === TRACK_FEATURES_VERSION
}
