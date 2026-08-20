/**
 * How much music is actually in a set.
 *
 * Distinct from `slot.ts`, and the distinction matters. `clockAt` answers *when
 * does track 14 land*, and it answers it by stretching the tracklist across the
 * declared slot — which is right, because a DJ told to play 01:00–03:00 plays until
 * 03:00 and the tracklist is what flexes, through mixing, edits and loops.
 *
 * This module answers a different question: *how much music do I have*. That one
 * cannot be answered by stretching, and it was being answered with a guess —
 * `trackCount × 3 minutes` — while the real length of every imported file sat in
 * `tracks.duration_seconds`, read from the file's own tags. For a set of
 * seven-minute progressive tracks the guess is off by more than a factor of two,
 * and the engine was telling those DJs their set was "too short" on the strength
 * of it.
 *
 * Pure, so the arithmetic that decides whether someone gets told their set is the
 * wrong length is testable without a database.
 */

import { STANDARD_TRACK_DURATION_MINUTES } from "@/lib/product/strategy"

/**
 * Share of tracks that must carry a real length before the total is called
 * measured.
 *
 * Set high because a total is only as good as its worst gap: at 50% coverage half
 * the number is invented, and presenting that as the set's length would be the
 * same overconfidence this module exists to remove. Mirrors the shape of
 * `minKeyCoverage`, which gates harmony advice the same way for the same reason.
 */
export const DURATION_COVERAGE_MIN = 0.8

export interface SetTiming {
  /** Total playing time in minutes, rounded to the nearest minute. */
  totalMinutes: number
  /** Share of tracks whose real length was known, 0–1. */
  coverage: number
  /**
   * True when the total comes from real file lengths rather than the standard
   * -track guess. Everything that would *state* a duration to the user should
   * check this first; a guess presented as a measurement is the bug.
   */
  measured: boolean
  /** How many tracks had no length. Zero on a fully tagged set. */
  unknownCount: number
}

/**
 * Median of the known lengths, in minutes — the fallback for tracks that have none.
 *
 * Better than the global 3-minute constant because a DJ's library clusters: if the
 * twenty tracks we can measure average seven minutes, the two we can't are far more
 * likely to be seven than three. Median rather than mean so one 40-minute live
 * recording doesn't drag the estimate for everything around it.
 */
function medianMinutes(values: readonly number[]): number {
  if (values.length === 0) {
    return STANDARD_TRACK_DURATION_MINUTES
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

/** True for a duration that could plausibly be a track. */
function isUsableDuration(value: unknown): value is number {
  // Upper bound at four hours: a longer value is a bad tag, not a track, and one
  // corrupt row shouldn't be allowed to define the median for the rest.
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 4 * 60 * 60
  )
}

/**
 * Playing time for a set, from whatever real lengths it has.
 *
 * Degrades per track rather than all-or-nothing: one untagged file in a set of
 * thirty shouldn't throw away the other twenty-nine real numbers, which is what an
 * `every()` check does. `coverage` and `measured` report how much of the answer was
 * real, so a caller can decline to state it.
 */
export function resolveSetTiming(
  durationsSeconds: readonly (number | null | undefined)[]
): SetTiming {
  if (durationsSeconds.length === 0) {
    return { totalMinutes: 0, coverage: 0, measured: false, unknownCount: 0 }
  }

  const knownMinutes = durationsSeconds
    .filter(isUsableDuration)
    .map((seconds) => seconds / 60)

  const coverage = knownMinutes.length / durationsSeconds.length
  const unknownCount = durationsSeconds.length - knownMinutes.length
  const fallback = medianMinutes(knownMinutes)

  const total =
    knownMinutes.reduce((sum, minutes) => sum + minutes, 0) +
    unknownCount * fallback

  return {
    totalMinutes: Math.round(total),
    coverage,
    measured: coverage >= DURATION_COVERAGE_MIN,
    unknownCount,
  }
}

export type SlotFitVerdict = "short" | "over" | "fits"

export interface SlotFit {
  verdict: SlotFitVerdict
  /** Minutes of music, minus minutes of slot. Negative when short. */
  differenceMinutes: number
  setMinutes: number
  slotMinutes: number
}

/**
 * A slot is treated as filled when the music is within this share of it.
 *
 * Ten percent of a two-hour slot is twelve minutes, which a DJ absorbs without
 * noticing — that is what mixing and looping are for. Beyond it they are either
 * padding or cutting, and both are worth knowing before they get there rather
 * than at 02:40.
 */
export const SLOT_FIT_TOLERANCE = 0.1

/**
 * Whether the set has enough music for the slot.
 *
 * The first question a booked DJ asks, and until now the engine could not answer
 * it — `clockAt` stretches the tracklist to fill the slot by construction, so the
 * gap was invisible in the very model that was supposed to expose timing problems.
 * This does not contradict that model; it quantifies the stretch the model assumes.
 *
 * Returns null when the set's length isn't measured, because a fit computed from a
 * guessed total is a guess wearing a number, and this is advice someone acts on.
 */
export function assessSlotFit(
  timing: SetTiming,
  slotMinutes: number
): SlotFit | null {
  if (!timing.measured || slotMinutes <= 0) {
    return null
  }

  const differenceMinutes = timing.totalMinutes - slotMinutes
  const tolerance = slotMinutes * SLOT_FIT_TOLERANCE

  return {
    verdict:
      differenceMinutes < -tolerance
        ? "short"
        : differenceMinutes > tolerance
          ? "over"
          : "fits",
    differenceMinutes,
    setMinutes: timing.totalMinutes,
    slotMinutes,
  }
}
