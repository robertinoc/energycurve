import type { PlaylistContext, SupportedGenre } from "@/lib/product/strategy"
import { computeSetScore } from "@/lib/engine/analysis"
import { buildTargetCurve } from "@/lib/engine/target-curve"
import type { ResolvedTrackEnergy } from "@/types/analysis"

/** Exhaustive search is affordable up to this many tracks (8! = 40,320). */
const EXACT_SEARCH_MAX_TRACKS = 8

/** Hard cap on 2-opt improvement passes for larger sets. */
const MAX_IMPROVEMENT_PASSES = 50

export interface OptimizedOrder {
  /** Indexes into the input array, in suggested playing order. */
  order: number[]
  score: number
}

function scoreOrder(
  energies: ResolvedTrackEnergy[],
  order: number[],
  genre: SupportedGenre,
  context: PlaylistContext
): number {
  return computeSetScore(
    order.map((index) => energies[index].score),
    genre,
    context
  )
}

function exactBestOrder(
  energies: ResolvedTrackEnergy[],
  genre: SupportedGenre,
  context: PlaylistContext
): OptimizedOrder {
  const n = energies.length
  const indexes = Array.from({ length: n }, (_, i) => i)
  let best: number[] = [...indexes]
  let bestScore = Number.NEGATIVE_INFINITY

  // Heap's algorithm, iterative — deterministic enumeration order, so ties
  // resolve to the first permutation found and results are reproducible.
  const counters = new Array<number>(n).fill(0)
  const current = [...indexes]

  const consider = (candidate: number[]) => {
    const score = scoreOrder(energies, candidate, genre, context)

    if (score > bestScore) {
      bestScore = score
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

  return { order: best, score: bestScore }
}

/**
 * Greedy seed: assign tracks to the target-curve slots they fit best. Sorting
 * both tracks and target slots by energy pairs the lowest-energy track with
 * the lowest-energy slot, which already follows the ideal shape closely.
 */
function greedySeed(
  energies: ResolvedTrackEnergy[],
  genre: SupportedGenre,
  context: PlaylistContext
): number[] {
  const target = buildTargetCurve(energies.length, context, genre)
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

function localSearchBestOrder(
  energies: ResolvedTrackEnergy[],
  genre: SupportedGenre,
  context: PlaylistContext
): OptimizedOrder {
  const order = greedySeed(energies, genre, context)
  let score = scoreOrder(energies, order, genre, context)

  // Best-improvement pairwise swaps until a full pass finds nothing better.
  // Deterministic: fixed scan order, strict improvement required.
  for (let pass = 0; pass < MAX_IMPROVEMENT_PASSES; pass += 1) {
    let bestGain = 0
    let bestSwap: [number, number] | null = null

    for (let a = 0; a < order.length - 1; a += 1) {
      for (let b = a + 1; b < order.length; b += 1) {
        ;[order[a], order[b]] = [order[b], order[a]]
        const candidateScore = scoreOrder(energies, order, genre, context)
        ;[order[a], order[b]] = [order[b], order[a]]

        const gain = candidateScore - score

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
    score += bestGain
    score = Math.round(score * 10) / 10
  }

  return { order, score: scoreOrder(energies, order, genre, context) }
}

/**
 * Finds the track order that best follows the ideal curve for this context
 * and genre (B11). Exact for small sets; greedy seed + deterministic 2-opt
 * for larger ones. Replaces V1's ascending sort, which was musically wrong
 * for main/closing sets (a set is waves, not a monotonic ramp) and rarely
 * improved the score.
 */
export function optimizeOrder(
  energies: ResolvedTrackEnergy[],
  genre: SupportedGenre,
  context: PlaylistContext
): OptimizedOrder {
  if (energies.length <= EXACT_SEARCH_MAX_TRACKS) {
    return exactBestOrder(energies, genre, context)
  }

  return localSearchBestOrder(energies, genre, context)
}
