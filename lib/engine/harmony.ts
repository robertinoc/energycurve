import { HARMONY_RULES_V4 } from "@/lib/product/strategy"
import { harmonicTier, type HarmonicTier } from "@/lib/music/camelot"

/**
 * Harmonic read of an ordered set (B18): how many adjacent transitions are
 * compatible on the Camelot wheel. Pure — feeds the reorder optimizer's
 * objective. Transitions with a missing key on
 * either side are excluded (unknown ≠ clash).
 */

export interface HarmonyAssessment {
  /** Transitions where both tracks have a parseable key. */
  knownTransitions: number
  /** perfect + smooth transitions. */
  harmonicCount: number
  /** +2 same-ring "energy boost" jumps (usable, not seamless). */
  boostCount: number
  clashCount: number
  /** 1 − Σcosts / knownTransitions; 1 when nothing is known (neutral). */
  ratio: number
  /** Per-transition tiers, index i = transition from track i to i+1. */
  tiers: HarmonicTier[]
}

export function assessHarmony(keys: Array<string | null>): HarmonyAssessment {
  const costs = HARMONY_RULES_V4.tierCosts
  const tiers: HarmonicTier[] = []
  let knownTransitions = 0
  let harmonicCount = 0
  let boostCount = 0
  let clashCount = 0
  let totalCost = 0

  for (let i = 1; i < keys.length; i += 1) {
    const tier = harmonicTier(keys[i - 1], keys[i])
    tiers.push(tier)

    if (tier === "unknown") {
      continue
    }

    knownTransitions += 1
    totalCost += costs[tier]

    if (tier === "perfect" || tier === "smooth") {
      harmonicCount += 1
    } else if (tier === "boost") {
      boostCount += 1
    } else {
      clashCount += 1
    }
  }

  return {
    knownTransitions,
    harmonicCount,
    boostCount,
    clashCount,
    ratio: knownTransitions > 0 ? 1 - totalCost / knownTransitions : 1,
    tiers,
  }
}

/** Share of transitions whose keys are known — gates the harmonic objective (B20). */
export function keyCoverage(keys: Array<string | null>): number {
  if (keys.length < 2) {
    return 0
  }

  const { knownTransitions } = assessHarmony(keys)

  return knownTransitions / (keys.length - 1)
}
