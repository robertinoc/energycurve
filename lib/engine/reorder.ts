import {
  REORDER_HARMONY_V4,
  type PlaylistContext,
  type SupportedGenre,
  type CurveShape,
} from "@/lib/product/strategy"
import { computeSetScore } from "@/lib/engine/analysis"
import {
  assessHarmonyPositions,
  keyCoverage,
  toWheelPositions,
} from "@/lib/engine/harmony"
import type { CamelotPosition } from "@/lib/music/camelot"
import { buildTargetCurve } from "@/lib/engine/target-curve"
import type { ResolvedTrackEnergy } from "@/types/analysis"

/** Exhaustive search is affordable up to this many tracks (8! = 40,320). */
const EXACT_SEARCH_MAX_TRACKS = 8

/** Hard cap on 2-opt improvement passes for larger sets. */
const MAX_IMPROVEMENT_PASSES = 50

/**
 * Longest set we will search for a better order.
 *
 * The search is 2-opt over a whole-order objective: O(passes · n²) candidate
 * swaps, each scored in O(n). That is fine for a set and ruinous for a library.
 * Measured, with keys, after the parse-once fix: 60 tracks 0.6s, 80 tracks
 * 1.4s, 100 tracks 2.9s, 120 tracks 6s, 150 tracks 11.6s, 250 tracks 63s, 400
 * tracks four minutes.
 *
 * 80 is where the curve is still flat enough to sit inside a render. It is also
 * past any real set — 80 tracks is five or six hours.
 *
 * The analysis runs inside a server render, so past a certain length the page
 * does not get slow — it times out and the DJ gets nothing at all. A cap turns
 * that into a set that simply carries no reorder suggestion, which is the
 * honest outcome anyway: 120 tracks is an eight-hour set, and a curve over one
 * is not what this engine is for.
 *
 * This is an engineering bound, not a scoring rule — the objective and its
 * weights are untouched, so `lib/product/strategy.ts` stays frozen.
 */
export const REORDER_MAX_TRACKS = 80

export interface OptimizedOrder {
  /** Indexes into the input array, in suggested playing order. */
  order: number[]
  /** Energy set score of the suggested order (same scale as the analysis). */
  score: number
  /** Harmonic ratio of the suggested order (1 when keys are unknown). */
  harmonicRatio: number
}

/**
 * Whether the optimizer weighs harmony (B20): enough of the transitions must
 * have both keys, otherwise the objective is energy-only (prior behavior).
 */
export function harmonyApplies(energies: ResolvedTrackEnergy[]): boolean {
  return (
    keyCoverage(energies.map((entry) => entry.camelot)) >=
    REORDER_HARMONY_V4.minKeyCoverage
  )
}

function energyScoreOf(
  energies: ResolvedTrackEnergy[],
  order: number[],
  genre: SupportedGenre,
  context: PlaylistContext,
  shape: CurveShape | null
): number {
  // Per-track provenance travels with the permutation so the confidence
  // rules (B13) shape the optimizer's objective exactly like the analysis.
  return computeSetScore(
    order.map((index) => energies[index].score),
    genre,
    context,
    order.map((index) => ({
      source: energies[index].source,
      bpm: energies[index].bpm,
    })),
    shape
  )
}

/**
 * Harmonic ratio of a candidate order, from positions parsed once per search.
 *
 * `wheel` is indexed like `energies`; the permutation only reorders lookups.
 * Parsing inside this function is what made the optimizer unusable on long
 * sets — see `harmonicMoveBetween`.
 */
function harmonicRatioOf(
  wheel: Array<CamelotPosition | null>,
  order: number[]
): number {
  return assessHarmonyPositions(order.map((index) => wheel[index])).ratio
}

/**
 * Combined objective (B20): energy score + weighted harmonic ratio. Harmony
 * can be worth up to `harmonyWeight` points — it dominates energy ties
 * without trading the curve away.
 */
function objectiveOf(
  energies: ResolvedTrackEnergy[],
  wheel: Array<CamelotPosition | null>,
  order: number[],
  genre: SupportedGenre,
  context: PlaylistContext,
  shape: CurveShape | null,
  useHarmony: boolean
): number {
  const energy = energyScoreOf(energies, order, genre, context, shape)

  if (!useHarmony) {
    return energy
  }

  return (
    energy +
    REORDER_HARMONY_V4.harmonyWeight * harmonicRatioOf(wheel, order)
  )
}

function exactBestOrder(
  energies: ResolvedTrackEnergy[],
  wheel: Array<CamelotPosition | null>,
  genre: SupportedGenre,
  context: PlaylistContext,
  shape: CurveShape | null,
  useHarmony: boolean
): number[] {
  const n = energies.length
  const indexes = Array.from({ length: n }, (_, i) => i)
  let best: number[] = [...indexes]
  let bestObjective = Number.NEGATIVE_INFINITY

  // Heap's algorithm, iterative — deterministic enumeration order, so ties
  // resolve to the first permutation found and results are reproducible.
  const counters = new Array<number>(n).fill(0)
  const current = [...indexes]

  const consider = (candidate: number[]) => {
    const objective = objectiveOf(
      energies,
      wheel,
      candidate,
      genre,
      context,
      shape,
      useHarmony
    )

    if (objective > bestObjective) {
      bestObjective = objective
      best = [...candidate]
    }
  }

  consider(current)

  let i = 0

  while (i < n) {
    if (counters[i] < i) {
      const swapWith = i % 2 === 0 ? 0 : counters[i]
      ;[current[swapWith], current[i]] = [current[i], current[swapWith]]
      consider(current)
      counters[i] += 1
      i = 0
    } else {
      counters[i] = 0
      i += 1
    }
  }

  return best
}

/**
 * Energy seed: assign tracks to the target-curve slots they fit best. Sorting
 * both tracks and target slots by energy pairs the lowest-energy track with
 * the lowest-energy slot, which already follows the ideal shape closely.
 */
function greedySeed(
  energies: ResolvedTrackEnergy[],
  genre: SupportedGenre,
  context: PlaylistContext,
  shape: CurveShape | null
): number[] {
  const target = buildTargetCurve(energies.length, context, genre, shape)
  const slotsByEnergy = target
    .map((energy, slot) => ({ energy, slot }))
    .sort((a, b) => a.energy - b.energy || a.slot - b.slot)
  const tracksByEnergy = energies
    .map((entry, index) => ({ score: entry.score, index }))
    .sort((a, b) => a.score - b.score || a.index - b.index)

  const order = new Array<number>(energies.length)

  slotsByEnergy.forEach(({ slot }, rank) => {
    order[slot] = tracksByEnergy[rank].index
  })

  return order
}

/**
 * Harmonic seed: walk the Camelot wheel (a DJ's harmonic spine) — group
 * same-key clusters together with adjacent wheel numbers adjacent, keeping
 * each cluster sorted by energy. Starts highly harmonic; 2-opt then repairs
 * the energy arc. Keyless tracks go last (they can slot anywhere).
 */
function harmonicSeed(energies: ResolvedTrackEnergy[]): number[] {
  return energies
    .map((entry, index) => {
      const camelot = entry.camelot?.match(/^(\d{1,2})([AB])$/)

      return {
        index,
        num: camelot ? Number.parseInt(camelot[1], 10) : 99,
        ring: camelot ? camelot[2] : "Z",
        score: entry.score,
      }
    })
    .sort(
      (a, b) =>
        a.num - b.num ||
        a.ring.localeCompare(b.ring) ||
        a.score - b.score ||
        a.index - b.index
    )
    .map((entry) => entry.index)
}

function twoOpt(
  seed: number[],
  energies: ResolvedTrackEnergy[],
  wheel: Array<CamelotPosition | null>,
  genre: SupportedGenre,
  context: PlaylistContext,
  shape: CurveShape | null,
  useHarmony: boolean
): { order: number[]; objective: number } {
  const order = [...seed]
  let objective = objectiveOf(
    energies,
    wheel,
    order,
    genre,
    context,
    shape,
    useHarmony
  )

  // Best-improvement pairwise swaps until a full pass finds nothing better.
  // Deterministic: fixed scan order, strict improvement required.
  for (let pass = 0; pass < MAX_IMPROVEMENT_PASSES; pass += 1) {
    let bestGain = 0
    let bestSwap: [number, number] | null = null

    for (let a = 0; a < order.length - 1; a += 1) {
      for (let b = a + 1; b < order.length; b += 1) {
        ;[order[a], order[b]] = [order[b], order[a]]
        const candidate = objectiveOf(
          energies,
          wheel,
          order,
          genre,
          context,
          shape,
          useHarmony
        )
        ;[order[a], order[b]] = [order[b], order[a]]

        const gain = candidate - objective

        if (gain > bestGain) {
          bestGain = gain
          bestSwap = [a, b]
        }
      }
    }

    if (!bestSwap) {
      break
    }

    const [a, b] = bestSwap
    ;[order[a], order[b]] = [order[b], order[a]]
    objective += bestGain
  }

  return { order, objective }
}

function localSearchBestOrder(
  energies: ResolvedTrackEnergy[],
  wheel: Array<CamelotPosition | null>,
  genre: SupportedGenre,
  context: PlaylistContext,
  shape: CurveShape | null,
  useHarmony: boolean
): number[] {
  // Two seeds, two hill climbs, best objective wins (B20): the energy seed
  // protects the curve; the harmonic seed protects the Camelot chains that
  // pairwise swaps alone can't assemble from scratch.
  const seeds = useHarmony
    ? [greedySeed(energies, genre, context, shape), harmonicSeed(energies)]
    : [greedySeed(energies, genre, context, shape)]

  let best: { order: number[]; objective: number } | null = null

  for (const seed of seeds) {
    const result = twoOpt(
      seed,
      energies,
      wheel,
      genre,
      context,
      shape,
      useHarmony
    )

    if (!best || result.objective > best.objective) {
      best = result
    }
  }

  return best!.order
}

/**
 * Finds the track order that best follows the ideal curve for this context
 * and genre — and, when keys are available, keeps the transitions harmonic
 * on the Camelot wheel (B20). Exact for small sets; greedy seed +
 * deterministic 2-opt for larger ones.
 */
export function optimizeOrder(
  energies: ResolvedTrackEnergy[],
  genre: SupportedGenre,
  context: PlaylistContext,
  /**
   * The declared shape, so a suggested order aims at what the DJ said they are
   * playing. Without this the optimizer would optimize against the derived
   * target and actively fight a declared after-hours or landing set.
   */
  shape: CurveShape | null = null
): OptimizedOrder {
  const useHarmony = harmonyApplies(energies)
  // Parsed once for the whole search, then only indexed.
  const wheel = toWheelPositions(energies.map((entry) => entry.camelot))

  const order =
    energies.length <= EXACT_SEARCH_MAX_TRACKS
      ? exactBestOrder(energies, wheel, genre, context, shape, useHarmony)
      : localSearchBestOrder(energies, wheel, genre, context, shape, useHarmony)

  return {
    order,
    score: energyScoreOf(energies, order, genre, context, shape),
    harmonicRatio: harmonicRatioOf(wheel, order),
  }
}
