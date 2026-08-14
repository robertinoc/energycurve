/**
 * Maps a set's energy curve onto the clock.
 *
 * The pain this addresses is specific and it is not about the curve's shape: a
 * warm-up DJ can build a technically excellent arc and still burn the floor at
 * 01:20 when the headliner goes on at 03:00. The shape was right; the *timing*
 * was wrong. Nothing in the analysis could see that, because the engine only
 * knew "track 14 of 24" and never what time track 14 lands.
 *
 * Deliberately timezone-free. A slot is venue wall-clock — "I play 01:00 to
 * 03:00" — and attaching a timezone to it would invent a precision the DJ never
 * supplied and break the moment they play in another city. Minutes from midnight
 * is the whole model.
 */

export const MINUTES_IN_DAY = 24 * 60

export interface Slot {
  /** Minutes from midnight, 0–1439. */
  startMinutes: number
  endMinutes: number
}

export interface ResolvedSlot extends Slot {
  /**
   * Slot length in minutes, wrap-aware: 23:00→01:00 is 120 minutes, not a
   * negative number. Most club sets cross midnight, so this is the common case
   * rather than an edge one.
   */
  durationMinutes: number
  /** True when the slot runs past midnight. */
  crossesMidnight: boolean
}

/** True for a value usable as a wall-clock minute offset. */
export function isValidMinuteOfDay(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < MINUTES_IN_DAY
  )
}

/**
 * Builds a slot from two wall-clock minute offsets, or null when either is
 * missing or unusable.
 *
 * A zero-length slot (same start and end) resolves to null rather than to a
 * 24-hour set: it's far more likely to be a half-filled form than a DJ playing
 * for a full day.
 */
export function resolveSlot(
  startMinutes: number | null | undefined,
  endMinutes: number | null | undefined
): ResolvedSlot | null {
  if (!isValidMinuteOfDay(startMinutes) || !isValidMinuteOfDay(endMinutes)) {
    return null
  }

  if (startMinutes === endMinutes) {
    return null
  }

  const crossesMidnight = endMinutes < startMinutes
  const durationMinutes = crossesMidnight
    ? MINUTES_IN_DAY - startMinutes + endMinutes
    : endMinutes - startMinutes

  return { startMinutes, endMinutes, durationMinutes, crossesMidnight }
}

/** `"01:20"`, from minutes since midnight. Wraps past a day. */
export function formatClock(minutes: number): string {
  const normalized = ((Math.round(minutes) % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY
  const hours = Math.floor(normalized / 60)

  return `${String(hours).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`
}

/** `"1h40"` / `"25min"` — a gap a person reads, not a minute count. */
export function formatGap(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes))

  if (whole < 60) {
    return `${whole}min`
  }

  const hours = Math.floor(whole / 60)
  const rest = whole % 60

  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, "0")}`
}

/**
 * Wall-clock minute a track position starts at.
 *
 * The set is stretched to fill the declared slot rather than using each track's
 * real duration. That's the honest model: the DJ told us when they start and
 * when they stop, and they will fill exactly that — the tracklist is what
 * flexes, through mixing, edits and loops. Summing durations instead would
 * produce a set that "ends" 20 minutes early, which is never what happens.
 */
export function clockAt(
  index: number,
  trackCount: number,
  slot: ResolvedSlot
): number {
  if (trackCount <= 1) {
    return slot.startMinutes
  }

  const progress = Math.min(Math.max(index / trackCount, 0), 1)

  return slot.startMinutes + progress * slot.durationMinutes
}

export type SlotVerdict = "peak_too_early" | "peak_too_late" | "well_placed"

export interface SlotAssessment {
  verdict: SlotVerdict
  /** 1-based position of the set's highest-energy track. */
  peakPosition: number
  /** Wall-clock minute that track lands on. */
  peakClockMinutes: number
  /** How far into the slot the peak falls, 0–1. */
  peakProgress: number
  /** Minutes of set still to play after the peak. */
  remainingMinutes: number
  slot: ResolvedSlot
}

/**
 * Where the peak should land, as a share of the slot.
 *
 * The window is wide on purpose. A peak between 55% and 90% of the slot is
 * defensible for almost any set: earlier leaves too much set to fill after the
 * high point, later leaves no room to land it. Only the outside of that band is
 * worth telling someone about — a narrow window would fire on sets that are
 * fine, and an analysis that cries wolf gets ignored entirely.
 */
export const PEAK_WINDOW = { from: 0.55, to: 0.9 } as const

/**
 * Index of the set's peak: the **last** maximum, not the first.
 *
 * When a set touches its top energy more than once, the floor peaks the last
 * time. Shared rather than reimplemented per caller because the set sheet marks
 * the peak track and the analysis talks about it — two different answers to
 * "where is the peak" is a contradiction the DJ sees in one glance.
 *
 * Returns -1 for an empty set, so callers must handle it explicitly.
 */
export function peakIndexOf(curve: readonly number[]): number {
  let peakIndex = -1

  for (let index = 0; index < curve.length; index += 1) {
    if (peakIndex === -1 || curve[index] >= curve[peakIndex]) {
      peakIndex = index
    }
  }

  return peakIndex
}

export function assessSlot(
  curve: readonly number[],
  slot: ResolvedSlot
): SlotAssessment | null {
  if (curve.length === 0) {
    return null
  }

  const peakIndex = peakIndexOf(curve)

  const peakClockMinutes = clockAt(peakIndex, curve.length, slot)
  const peakProgress =
    curve.length <= 1 ? 0.5 : peakIndex / curve.length
  const remainingMinutes = Math.max(
    0,
    slot.startMinutes + slot.durationMinutes - peakClockMinutes
  )

  const verdict: SlotVerdict =
    peakProgress < PEAK_WINDOW.from
      ? "peak_too_early"
      : peakProgress > PEAK_WINDOW.to
        ? "peak_too_late"
        : "well_placed"

  return {
    verdict,
    peakPosition: peakIndex + 1,
    peakClockMinutes,
    peakProgress,
    remainingMinutes,
    slot,
  }
}

/** Parses `"01:30"` into minutes from midnight, or null. */
export function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())

  if (!match) {
    return null
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (hours > 23 || minutes > 59) {
    return null
  }

  return hours * 60 + minutes
}
