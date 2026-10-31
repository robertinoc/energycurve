/**
 * Splitting one long list into several sets of about an hour.
 *
 * ## Split first, order second
 *
 * The obvious implementation — order the whole list, then cut it — produces two
 * broken sets: the optimizer builds one curve across everything, so set 1 ends
 * on the peak and set 2 starts on it. Here the tracks are dealt into groups by
 * the chosen criterion first, and only then does each group get its own target
 * curve (`buildTargetCurve`) and its own order (`optimizeOrder`), once per group.
 *
 * ## Three criteria, one at a time
 *
 * - **own_curve** — every set is autonomous: tracks sorted by energy and dealt
 *   in a snake across the piles, so each pile gets low tracks for its intro and
 *   peak tracks for its climax.
 * - **continuous** — energy bands: set 1 keeps the lowest band, set 2 the next.
 *   Each set still gets its curve, but the curves chain: set 2's target starts
 *   where set 1's ended.
 * - **harmonic** — groups by Camelot neighbourhood (the transition table), so
 *   each set mixes clean. Offered only with enough key coverage.
 *
 * Pure and deterministic: the same list and the same choice always give the
 * same sets, on the server and in the browser.
 */

import {
  type CurveShape,
  type PlaylistContext,
  type SupportedGenre,
} from "@/lib/product/strategy"
import { optimizeOrder } from "@/lib/engine/reorder"
import { buildTargetCurve } from "@/lib/engine/target-curve"
import {
  DURATION_COVERAGE_MIN,
  SLOT_FIT_TOLERANCE,
} from "@/lib/engine/set-timing"
import {
  estimateSetDuration,
  type DurationTrack,
  type SetDuration,
} from "@/lib/engine/set-duration"
import { harmonicIndex, harmonicTableMoveAt } from "@/lib/music/harmonic-transitions"
import { parseCamelot } from "@/lib/music/camelot"
import type { ResolvedTrackEnergy } from "@/types/analysis"

/** The length each set aims at. */
export const SPLIT_TARGET_MINUTES = 60

/**
 * How far over the target a list can run before splitting is offered.
 *
 * The slot tolerance, reused rather than invented: ten percent of an hour is
 * the stretch a DJ absorbs with a longer mix or a loop.
 */
export const SPLIT_OFFER_ABOVE_MINUTES = Math.round(
  SPLIT_TARGET_MINUTES * (1 + SLOT_FIT_TOLERANCE)
)

/**
 * How far from an hour each part may land and still be offered.
 *
 * Wider than the offer threshold because it is a range, not a trigger: a list
 * of 2 h 30 can honestly be two sets of 75 minutes or three of 50, and both are
 * "about an hour" to a DJ. Past a quarter either way the split stops being
 * one-hour sets.
 */
export const SPLIT_PART_TOLERANCE = 0.25

/** A set shorter than this is not a set. */
export const SPLIT_MIN_TRACKS_PER_SET = 4

export const SPLIT_CRITERIA = ["own_curve", "continuous", "harmonic"] as const

export type SplitCriterion = (typeof SPLIT_CRITERIA)[number]

export function isSplitCriterion(value: unknown): value is SplitCriterion {
  return typeof value === "string" && (SPLIT_CRITERIA as readonly string[]).includes(value)
}

/** Whether to ask at all: only when the list runs clearly past an hour. */
export function shouldOfferSplit(duration: SetDuration): boolean {
  return duration.minutes > SPLIT_OFFER_ABOVE_MINUTES
}

/**
 * The set counts worth offering: each part close to an hour, and never every
 * possible number. Usually one, sometimes two neighbours. Empty when the list
 * does not need splitting.
 */
export function splitCountOptions(duration: SetDuration, trackCount: number): number[] {
  if (!shouldOfferSplit(duration)) {
    return []
  }

  const exact = duration.minutes / SPLIT_TARGET_MINUTES
  const candidates = [Math.floor(exact), Math.ceil(exact)]
    .filter((count, index, all) => all.indexOf(count) === index)
    .filter((count) => count >= 2)
    .filter((count) => trackCount / count >= SPLIT_MIN_TRACKS_PER_SET)

  const close = candidates.filter((count) => {
    const perSet = duration.minutes / count

    return Math.abs(perSet - SPLIT_TARGET_MINUTES) <= SPLIT_TARGET_MINUTES * SPLIT_PART_TOLERANCE
  })

  if (close.length > 0) {
    return close
  }

  // Nothing lands within the band (a list of 1 h 20 splits into 40-minute
  // halves): offer the single closest rather than nothing, since the list is
  // still over an hour.
  const closest = [...candidates].sort(
    (a, b) =>
      Math.abs(duration.minutes / a - SPLIT_TARGET_MINUTES) -
      Math.abs(duration.minutes / b - SPLIT_TARGET_MINUTES)
  )[0]

  return closest === undefined ? [] : [closest]
}

/** Share of tracks with a usable Camelot key. */
export function keyCoverageOf(camelots: readonly (string | null)[]): number {
  if (camelots.length === 0) {
    return 0
  }

  return camelots.filter((code) => parseCamelot(code) !== null).length / camelots.length
}

export interface HarmonicAvailability {
  available: boolean
  /** Tracks without a key, so the UI can say why the option is disabled. */
  missingKeys: number
  coverage: number
}

/**
 * Whether the harmonic criterion may be offered. Same threshold as a measured
 * duration: below it a split would be computed on part of the data and
 * presented as if it were all of it.
 */
export function harmonicAvailability(camelots: readonly (string | null)[]): HarmonicAvailability {
  const coverage = keyCoverageOf(camelots)

  return {
    available: coverage >= DURATION_COVERAGE_MIN,
    missingKeys: camelots.filter((code) => parseCamelot(code) === null).length,
    coverage,
  }
}

// ---------------------------------------------------------------------------
// Partitioning
// ---------------------------------------------------------------------------

/** Indexes sorted by energy, ties by original position, so the deal is stable. */
function byEnergy(energies: readonly ResolvedTrackEnergy[], direction: 1 | -1): number[] {
  return energies
    .map((_, index) => index)
    .sort((a, b) => (energies[a].score - energies[b].score) * direction || a - b)
}

/** Sizes as equal as integers allow, the larger ones first. */
function sizes(total: number, count: number): number[] {
  return Array.from(
    { length: count },
    (_, index) => Math.floor(total / count) + (index < total % count ? 1 : 0)
  )
}

/**
 * own_curve: a snake deal over the energy-sorted list — 0,1,…,N−1,N−1,…,0 — so
 * no pile is systematically first to every high track.
 */
function dealStratified(energies: readonly ResolvedTrackEnergy[], count: number): number[][] {
  const piles: number[][] = Array.from({ length: count }, () => [])

  byEnergy(energies, -1).forEach((trackIndex, rank) => {
    const round = Math.floor(rank / count)
    const offset = rank % count
    const pile = round % 2 === 0 ? offset : count - 1 - offset

    piles[pile].push(trackIndex)
  })

  return piles
}

/** continuous: contiguous energy bands, lowest first. */
function dealBands(energies: readonly ResolvedTrackEnergy[], count: number): number[][] {
  const sorted = byEnergy(energies, 1)
  const piles: number[][] = []
  let start = 0

  for (const size of sizes(sorted.length, count)) {
    piles.push(sorted.slice(start, start + size))
    start += size
  }

  return piles
}

function wheelIndex(code: string | null): number | null {
  const position = parseCamelot(code)

  return position ? harmonicIndex(position.num, position.ring) : null
}

/** Pairs inside a group that the transition table accepts, either direction. */
function compatiblePairs(group: readonly number[], lanes: readonly (number | null)[]): number {
  let pairs = 0

  for (let i = 0; i < group.length; i += 1) {
    for (let j = i + 1; j < group.length; j += 1) {
      const a = lanes[group[i]]
      const b = lanes[group[j]]

      if (a !== null && b !== null && (harmonicTableMoveAt(a, b) || harmonicTableMoveAt(b, a))) {
        pairs += 1
      }
    }
  }

  return pairs
}

/**
 * harmonic: walk the keyed tracks around the Camelot wheel (number, then ring,
 * so 8A sits beside 8B and 9A), cut the circle into N arcs of equal size, and
 * keep the rotation whose arcs hold the most pairs the transition table
 * accepts. Neighbouring numbers are what the table rewards most, so arcs of the
 * wheel are the natural candidates; scoring every rotation picks where to cut.
 *
 * Tracks without a key — at most a fifth, or the criterion is not offered —
 * cannot be placed by key, so they go to the smallest groups afterwards, in
 * list order.
 */
function dealHarmonic(energies: readonly ResolvedTrackEnergy[], count: number): number[][] {
  const lanes = energies.map((entry) => wheelIndex(entry.camelot))
  const keyed = energies
    .map((_, index) => index)
    .filter((index) => lanes[index] !== null)
    .sort((a, b) => (lanes[a] as number) - (lanes[b] as number) || a - b)
  const unkeyed = energies.map((_, index) => index).filter((index) => lanes[index] === null)

  const groupSizes = sizes(keyed.length, count)
  let best: number[][] = []
  let bestScore = -1

  for (let rotation = 0; rotation < Math.max(keyed.length, 1); rotation += 1) {
    const circle = [...keyed.slice(rotation), ...keyed.slice(0, rotation)]
    const groups: number[][] = []
    let start = 0

    for (const size of groupSizes) {
      groups.push(circle.slice(start, start + size))
      start += size
    }

    const score = groups.reduce((sum, group) => sum + compatiblePairs(group, lanes), 0)

    if (score > bestScore) {
      best = groups
      bestScore = score
    }
  }

  for (const index of unkeyed) {
    const smallest = best.reduce(
      (min, group, groupIndex) => (group.length < best[min].length ? groupIndex : min),
      0
    )

    best[smallest].push(index)
  }

  return best
}

/** Track indexes per set, before ordering. */
export function partitionTracks(
  energies: readonly ResolvedTrackEnergy[],
  count: number,
  criterion: SplitCriterion
): number[][] {
  if (count < 2 || energies.length < count) {
    return [energies.map((_, index) => index)]
  }

  switch (criterion) {
    case "own_curve":
      return dealStratified(energies, count)
    case "continuous":
      return dealBands(energies, count)
    case "harmonic":
      return dealHarmonic(energies, count)
  }
}

// ---------------------------------------------------------------------------
// The plan: partition, then a curve and an order per set
// ---------------------------------------------------------------------------

export interface SplitTrack extends DurationTrack {
  energy: ResolvedTrackEnergy
}

export interface PlannedSet {
  /** 1-based, the order the sets are played in. */
  number: number
  /** Indexes into the input list, in suggested playing order. */
  order: number[]
  /** The target this set was ordered against. */
  target: number[]
  /** Energies in suggested order — what the result screen draws. */
  curve: number[]
  duration: SetDuration
  /**
   * The anchors handed to the optimizer, for `continuous` only: the chain. Null
   * means the set followed the playlist's own context and shape.
   */
  anchors: Array<[number, number]> | null
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * For `continuous`: each set's target runs from where the previous one ended to
 * the top of its own band. Set 1 starts at the bottom of its band.
 *
 * Takes the energies of each set, in playing order of the sets, so the result
 * screen can redraw the same chain from the stored sets.
 */
export function chainedAnchors(scoresPerSet: readonly (readonly number[])[]): Array<Array<[number, number]>> {
  const anchors: Array<Array<[number, number]>> = []
  let previousEnd: number | null = null

  for (const scores of scoresPerSet) {
    const start = previousEnd ?? Math.min(...scores)
    const end = Math.max(...scores)

    anchors.push([
      [0, round1(start)],
      [1, round1(end)],
    ])
    previousEnd = end
  }

  return anchors
}

export function planSplit(
  tracks: readonly SplitTrack[],
  count: number,
  criterion: SplitCriterion,
  options: { genre: SupportedGenre; context: PlaylistContext; shape?: CurveShape | null }
): PlannedSet[] {
  const energies = tracks.map((track) => track.energy)
  const groups = partitionTracks(energies, count, criterion)
  const anchorsPerSet =
    criterion === "continuous"
      ? chainedAnchors(groups.map((group) => group.map((index) => energies[index].score)))
      : null
  const shape = options.shape ?? null

  return groups.map((group, setIndex) => {
    const anchors = anchorsPerSet?.[setIndex] ?? null
    const groupEnergies = group.map((index) => energies[index])
    const optimized = optimizeOrder(groupEnergies, options.genre, options.context, shape, anchors)
    const order = optimized.order.map((local) => group[local])

    return {
      number: setIndex + 1,
      order,
      target: buildTargetCurve(group.length, options.context, options.genre, shape, anchors),
      curve: order.map((index) => energies[index].score),
      duration: estimateSetDuration(order.map((index) => tracks[index])),
      anchors,
    }
  })
}
