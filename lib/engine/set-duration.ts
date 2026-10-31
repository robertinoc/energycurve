/**
 * How long a list of tracks plays for, once the tracks are mixed into each
 * other rather than played back to back.
 *
 * `set-timing.ts` answers how much music is in a set; this answers how much of
 * it the room hears. The difference is the overlap: during a mix two tracks
 * play at once, so a set of twenty six-minute tracks is not two hours of
 * playing time. The split-into-sets flow asks the second question, because
 * "about an hour per set" is an hour on the clock.
 *
 * Two levels, and the result always says which one it used — a number on
 * screen without its provenance is a guess presented as a measurement:
 *
 * 1. **Measured**: enough tracks carry their real length (the same
 *    `DURATION_COVERAGE_MIN` that `resolveSetTiming` uses) → the sum of the
 *    lengths, minus the overlap of every transition.
 * 2. **Rough**: below that, {@link ROUGH_TRACKS_PER_HOUR} tracks per hour, and
 *    the screen says it is a rough estimate.
 */

import {
  DURATION_COVERAGE_MIN,
  resolveSetTiming,
} from "@/lib/engine/set-timing"

/**
 * How long a mix lasts, in bars.
 *
 * In bars and not seconds on purpose: a slow track and a fast one do not mix
 * in the same number of seconds, but they do mix in the same number of bars —
 * a DJ counts phrases, not a stopwatch. 32 bars is the canonical mix, two
 * 16-bar phrases.
 *
 * Robertino has not confirmed whether he meant 30/32 as bars or as seconds. If
 * the answer is seconds, this is the one constant to change (and
 * {@link transitionSeconds} stops reading the BPM); nothing else assumes bars.
 */
export const MIX_OVERLAP_BARS = 32

/** Four beats to the bar: every genre this product scores is in 4/4. */
export const BEATS_PER_BAR = 4

/**
 * The overlap assumed for a transition when neither track has a BPM.
 *
 * Fixed, and flagged: a transition counted with this value is reported as
 * estimated, so the total can say how much of it was guessed.
 */
export const FALLBACK_TRANSITION_SECONDS = 45

/**
 * Tracks per hour when too few lengths are known to measure.
 *
 * A rule of thumb for mixed club music — tracks played for two and a half to
 * three minutes each once intros and outros overlap. It is the rough level and
 * the UI says so; it never stands in for a measured total.
 */
export const ROUGH_TRACKS_PER_HOUR = 22

export interface DurationTrack {
  durationSeconds: number | null
  bpm: number | null
}

export type DurationMethod = "measured" | "rough"

export interface SetDuration {
  method: DurationMethod
  /** Estimated playing time, whole minutes. */
  minutes: number
  /** Share of tracks with a real length, 0–1. */
  coverage: number
  /** Transitions counted (tracks − 1). Zero on the rough level. */
  transitions: number
  /** Of those, how many used the fixed fallback because no BPM was known. */
  estimatedTransitions: number
}

function usableBpm(value: number | null): number | null {
  return value !== null && Number.isFinite(value) && value > 0 ? value : null
}

/**
 * Seconds the mix between two tracks lasts.
 *
 * While two tracks are beatmatched they run at one tempo, so one known BPM is
 * enough; with both known, the mix runs somewhere between them and the mean is
 * the honest middle. With neither, the fixed fallback, flagged.
 */
export function transitionSeconds(
  from: DurationTrack,
  to: DurationTrack
): { seconds: number; estimated: boolean } {
  const bpms = [usableBpm(from.bpm), usableBpm(to.bpm)].filter(
    (value): value is number => value !== null
  )

  if (bpms.length === 0) {
    return { seconds: FALLBACK_TRANSITION_SECONDS, estimated: true }
  }

  const bpm = bpms.reduce((sum, value) => sum + value, 0) / bpms.length

  return {
    seconds: (MIX_OVERLAP_BARS * BEATS_PER_BAR * 60) / bpm,
    estimated: false,
  }
}

/**
 * Playing time of `tracks`, in the order given.
 *
 * The order matters only for which BPMs meet at each transition; the total of
 * the lengths does not depend on it.
 */
export function estimateSetDuration(tracks: readonly DurationTrack[]): SetDuration {
  const timing = resolveSetTiming(tracks.map((track) => track.durationSeconds))

  if (tracks.length === 0) {
    return {
      method: "measured",
      minutes: 0,
      coverage: 0,
      transitions: 0,
      estimatedTransitions: 0,
    }
  }

  if (timing.coverage < DURATION_COVERAGE_MIN) {
    return {
      method: "rough",
      minutes: Math.round((tracks.length / ROUGH_TRACKS_PER_HOUR) * 60),
      coverage: timing.coverage,
      transitions: 0,
      estimatedTransitions: 0,
    }
  }

  let overlapSeconds = 0
  let estimatedTransitions = 0

  for (let index = 1; index < tracks.length; index += 1) {
    const transition = transitionSeconds(tracks[index - 1], tracks[index])

    overlapSeconds += transition.seconds
    estimatedTransitions += transition.estimated ? 1 : 0
  }

  return {
    method: "measured",
    minutes: Math.max(0, Math.round(timing.totalMinutes - overlapSeconds / 60)),
    coverage: timing.coverage,
    transitions: tracks.length - 1,
    estimatedTransitions,
  }
}
