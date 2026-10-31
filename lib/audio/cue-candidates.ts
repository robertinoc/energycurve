/**
 * Three CUE candidates per track from the whole-track envelope: where the groove
 * enters, where the biggest drop lands, and where the outro starts.
 *
 * Phase A is a measurement, not the feature: the question is whether an energy
 * envelope carries enough structure to place these at all. So this is the
 * simplest method that could work — thresholds and box-filter jumps on the
 * envelope, then a snap to the beat grid — with every threshold a named constant,
 * so a run that disagrees with the ear can say which one was wrong.
 *
 * What it does not do, and cannot from this input: find the downbeat. A beat grid
 * says where beats are, not which one starts the bar, so a suggestion can land on
 * a beat and still be a beat early or late for the phrase. That is a known gap,
 * not an oversight.
 */

import type { EnergyEnvelope } from "./energy-envelope"

/** A beat grid as `guess()` from web-audio-beat-detector returns it. */
export interface BeatGrid {
  bpm: number
  /** Seconds from the start of the audio to the first beat, within one beat. */
  offsetSeconds: number
}

export type CueKind = "entry" | "drop" | "exit"

export interface CueCandidate {
  kind: CueKind
  /** Where the CUE would go, in seconds from the start of the decoded audio. */
  seconds: number
  /** Before snapping: where the envelope alone put it. */
  envelopeSeconds: number
  /** False when there was no grid to snap to — the time is a half-second guess. */
  snapped: boolean
  /**
   * How pronounced the change was, in envelope units (0…~1). Reported so a weak
   * candidate can be told apart from a clear one in the export.
   */
  strength: number
}

export interface CueCandidates {
  entry: CueCandidate | null
  drop: CueCandidate | null
  exit: CueCandidate | null
  /** Why a candidate is missing, in words, for the export. */
  notes: string[]
}

/** A section counts as "the groove" once the low band holds this level… */
export const ENTRY_LEVEL = 0.5
/** …for this long without dipping. Eight seconds is four bars at 120 BPM. */
export const SUSTAIN_SECONDS = 8
/** Span on each side of a candidate jump. */
export const JUMP_WINDOW_SECONDS = 8
/** A drop has to raise the low band by at least this much to count. */
export const DROP_MIN_JUMP = 0.25
/**
 * An outro has to lower everything above the low band by at least this much to
 * count. Above, not full: the kick usually carries on into the outro and
 * dominates a full-band RMS, so what leaves (pads, leads, vocals) barely moves it.
 */
export const EXIT_MIN_FALL = 0.2
/** The outro is searched for in the last part of the track only. */
export const EXIT_SEARCH_FROM = 0.6
/**
 * The track's audible end: the last point with the full band above this. The
 * search for the outro stops a window short of it, because the tail decaying to
 * silence is always the largest fall in the track and is never the outro.
 */
export const END_LEVEL = 0.25
/** A beat counts as "kick present" at this share of the section's typical kick. */
export const KICK_PRESENT = 0.5

/** Normalises by the 95th percentile, so one spike can't define the scale. */
export function normalise(values: readonly number[]): number[] {
  if (values.length === 0) return []
  const sorted = [...values].sort((a, b) => a - b)
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
  if (!(p95 > 0)) return values.map(() => 0)
  return values.map((value) => value / p95)
}

function meanOf(values: readonly number[], from: number, to: number) {
  let sum = 0
  let count = 0
  for (let i = Math.max(0, from); i < Math.min(values.length, to); i += 1) {
    sum += values[i]
    count += 1
  }
  return count > 0 ? sum / count : 0
}

function median(values: number[]) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function beatPeriod(grid: BeatGrid) {
  return 60 / grid.bpm
}

/** The grid beat nearest to `seconds`. */
export function snapToGrid(seconds: number, grid: BeatGrid) {
  const period = beatPeriod(grid)
  const index = Math.round((seconds - grid.offsetSeconds) / period)
  return grid.offsetSeconds + Math.max(0, index) * period
}

/** Every grid beat inside `[from, to]`. */
export function beatsBetween(grid: BeatGrid, from: number, to: number) {
  const period = beatPeriod(grid)
  const beats: number[] = []
  const first = Math.max(0, Math.ceil((from - grid.offsetSeconds) / period))
  for (let index = first; ; index += 1) {
    const at = grid.offsetSeconds + index * period
    if (at > to) break
    beats.push(at)
  }
  return beats
}

/**
 * How hard the low band hits at a beat: the loudest fine point from 30 ms before
 * to 60 ms after it. Asymmetric because a kick's energy follows its onset.
 */
function kickAt(envelope: EnergyEnvelope, seconds: number) {
  const step = envelope.fineSecondsPerPoint
  const from = Math.max(0, Math.floor((seconds - 0.03) / step))
  const to = Math.min(envelope.lowFine.length - 1, Math.ceil((seconds + 0.06) / step))
  let peak = 0
  for (let i = from; i <= to; i += 1) peak = Math.max(peak, envelope.lowFine[i])
  return peak
}

/**
 * Narrows a half-second estimate of "the kick starts here" to a beat: the earliest
 * grid beat within a second of the estimate from which the kick is present on
 * four beats in a row. Falls back to the nearest beat when no beat qualifies.
 */
function firstKickBeat(envelope: EnergyEnvelope, grid: BeatGrid, around: number) {
  const reference = beatsBetween(grid, around, around + SUSTAIN_SECONDS).map((beat) =>
    kickAt(envelope, beat)
  )
  const typical = median(reference)
  if (!(typical > 0)) return snapToGrid(around, grid)

  const period = beatPeriod(grid)
  const candidates = beatsBetween(grid, around - 1, around + 1)
  for (const beat of candidates) {
    let sustained = true
    for (let k = 0; k < 4; k += 1) {
      if (kickAt(envelope, beat + k * period) < KICK_PRESENT * typical) {
        sustained = false
        break
      }
    }
    if (sustained) return beat
  }
  return snapToGrid(around, grid)
}

/** Mean of the fine above-low-band energy over `[from, to)` seconds. */
function restBetween(envelope: EnergyEnvelope, from: number, to: number) {
  const step = envelope.fineSecondsPerPoint
  const first = Math.max(0, Math.floor(from / step))
  const last = Math.min(envelope.fullFine.length, Math.ceil(to / step))
  let sum = 0
  let count = 0
  for (let i = first; i < last; i += 1) {
    const full = envelope.fullFine[i]
    const low = envelope.lowFine[i] ?? 0
    sum += Math.sqrt(Math.max(0, full * full - low * low))
    count += 1
  }
  return count > 0 ? sum / count : 0
}

/**
 * Narrows a half-second estimate of "the outro starts here" to a beat: the grid
 * beat within a second of it across which the energy above the low band falls
 * most, comparing four beats before against four after.
 */
function steepestFallBeat(envelope: EnergyEnvelope, grid: BeatGrid, around: number) {
  const span = 4 * beatPeriod(grid)
  let best = snapToGrid(around, grid)
  let bestFall = -Infinity
  for (const beat of beatsBetween(grid, around - 1, around + 1)) {
    const fall =
      restBetween(envelope, beat - span, beat) - restBetween(envelope, beat, beat + span)
    if (fall > bestFall) {
      bestFall = fall
      best = beat
    }
  }
  return best
}

export function findCueCandidates(
  envelope: EnergyEnvelope,
  grid: BeatGrid | null
): CueCandidates {
  const notes: string[] = []
  const step = envelope.secondsPerPoint
  const low = normalise(envelope.low)
  const full = normalise(envelope.full)
  // Everything above the low band. The bands are close enough to orthogonal that
  // energy subtracts: full² ≈ low² + rest².
  const rest = normalise(
    envelope.full.map((value, i) =>
      Math.sqrt(Math.max(0, value * value - (envelope.low[i] ?? 0) ** 2))
    )
  )
  const n = low.length
  const sustain = Math.max(1, Math.ceil(SUSTAIN_SECONDS / step))
  const window = Math.max(1, Math.ceil(JUMP_WINDOW_SECONDS / step))

  const usableGrid = grid && grid.bpm > 0 && Number.isFinite(grid.offsetSeconds) ? grid : null
  if (!usableGrid) notes.push("no beat grid: times are not snapped to a beat")

  const place = (
    kind: CueKind,
    index: number,
    strength: number,
    refine: "kick" | "fall"
  ): CueCandidate => {
    const envelopeSeconds = index * step
    if (!usableGrid) {
      return { kind, seconds: envelopeSeconds, envelopeSeconds, snapped: false, strength }
    }
    const seconds =
      refine === "kick"
        ? firstKickBeat(envelope, usableGrid, envelopeSeconds)
        : steepestFallBeat(envelope, usableGrid, envelopeSeconds)
    return { kind, seconds, envelopeSeconds, snapped: true, strength }
  }

  // Entry: the first point from which the low band holds ENTRY_LEVEL for
  // SUSTAIN_SECONDS.
  let entryIndex = -1
  for (let i = 0; i + sustain <= n; i += 1) {
    let held = true
    for (let k = i; k < i + sustain; k += 1) {
      if (low[k] < ENTRY_LEVEL) {
        held = false
        break
      }
    }
    if (held) {
      entryIndex = i
      break
    }
  }
  const entry =
    entryIndex >= 0
      ? place("entry", entryIndex, meanOf(low, entryIndex, entryIndex + sustain), "kick")
      : null
  if (!entry) notes.push("entry: the low band never holds a groove for 8 s")

  // Drop: the largest rise of the low band, mean after minus mean before, past the
  // entry so the entry itself is not counted again.
  let dropIndex = -1
  let bestRise = -Infinity
  const dropFrom = Math.max(window, (entryIndex >= 0 ? entryIndex : 0) + window)
  for (let i = dropFrom; i + window <= n; i += 1) {
    const rise = meanOf(low, i, i + window) - meanOf(low, i - window, i)
    if (rise > bestRise) {
      bestRise = rise
      dropIndex = i
    }
  }
  const drop =
    dropIndex >= 0 && bestRise >= DROP_MIN_JUMP
      ? place("drop", dropIndex, bestRise, "kick")
      : null
  if (!drop) {
    notes.push(
      dropIndex >= 0
        ? `drop: largest low-band rise is ${bestRise.toFixed(2)}, under ${DROP_MIN_JUMP}`
        : "drop: track too short to compare 8 s either side"
    )
  }

  // Exit: the largest fall above the low band in the last part of the track, after
  // the drop if there is one.
  let exitIndex = -1
  let bestFall = -Infinity
  const exitFrom = Math.max(
    window,
    Math.floor(n * EXIT_SEARCH_FROM),
    dropIndex >= 0 && drop ? dropIndex + window : 0
  )
  let lastActive = n - 1
  while (lastActive > 0 && full[lastActive] < END_LEVEL) lastActive -= 1
  for (let i = exitFrom; i + window <= lastActive + 1; i += 1) {
    const fall = meanOf(rest, i - window, i) - meanOf(rest, i, i + window)
    if (fall > bestFall) {
      bestFall = fall
      exitIndex = i
    }
  }
  const exit =
    exitIndex >= 0 && bestFall >= EXIT_MIN_FALL
      ? place("exit", exitIndex, bestFall, "fall")
      : null
  if (!exit) {
    notes.push(
      exitIndex >= 0
        ? `exit: largest fall above the low band is ${bestFall.toFixed(2)}, under ${EXIT_MIN_FALL}`
        : "exit: no room after the drop to look for an outro"
    )
  }

  return { entry, drop, exit, notes }
}

/** m:ss, which is what a CDJ screen shows. Negative and non-finite read as —. */
export function formatMinutesSeconds(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return "—"
  }
  const whole = Math.floor(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`
}
