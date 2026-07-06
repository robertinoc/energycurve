import { describe, expect, it } from "vitest"

import { computeSetScore } from "@/lib/engine/analysis"
import { optimizeOrder } from "@/lib/engine/reorder"
import type { ResolvedTrackEnergy } from "@/types/analysis"

function energiesFrom(scores: number[]): ResolvedTrackEnergy[] {
  return scores.map((score, index) => ({
    trackId: `t${index + 1}`,
    position: index + 1,
    score,
    source: "manual" as const,
  }))
}

function isPermutation(order: number[], length: number) {
  return (
    order.length === length &&
    [...order].sort((a, b) => a - b).every((value, index) => value === index)
  )
}

describe("optimizeOrder", () => {
  it("returns a valid permutation that never scores below the input order", () => {
    const energies = energiesFrom([9, 3, 7, 5, 4, 8])
    const identityScore = computeSetScore(
      energies.map((entry) => entry.score),
      "house",
      "opening"
    )

    const optimized = optimizeOrder(energies, "house", "opening")

    expect(isPermutation(optimized.order, energies.length)).toBe(true)
    expect(optimized.score).toBeGreaterThanOrEqual(identityScore)
  })

  it("recovers the ramp for a shuffled opening set (exact search)", () => {
    const energies = energiesFrom([6, 3, 5, 4])
    const optimized = optimizeOrder(energies, "house", "opening")

    const orderedScores = optimized.order.map(
      (index) => energies[index].score
    )
    expect(orderedScores).toEqual([3, 4, 5, 6])
    expect(optimized.score).toBe(10)
  })

  it("is deterministic", () => {
    const energies = energiesFrom([7, 7, 9, 3, 5, 5, 8, 4, 6, 6.5, 8.5, 9])

    const first = optimizeOrder(energies, "techno", "main")
    const second = optimizeOrder(energies, "techno", "main")

    expect(first.order).toEqual(second.order)
    expect(first.score).toBe(second.score)
  })

  it("improves a badly shuffled large set via greedy + 2-opt", () => {
    const scores = [9, 4, 8.5, 3.5, 9.2, 5, 8, 4.5, 9, 5.5, 8.8, 6]
    const energies = energiesFrom(scores)
    const identityScore = computeSetScore(scores, "house", "main")

    const optimized = optimizeOrder(energies, "house", "main")

    expect(isPermutation(optimized.order, energies.length)).toBe(true)
    expect(optimized.score).toBeGreaterThan(identityScore)
  })

  it("does not force a monotonic ramp when waves score better", () => {
    // A main set optimized toward the target should still end high, not
    // simply sort ascending like V1 did.
    const energies = energiesFrom([9, 4, 8.5, 3.5, 9.2, 5, 8, 4.5, 9, 5.5, 8.8, 6])
    const optimized = optimizeOrder(energies, "house", "main")
    const orderedScores = optimized.order.map(
      (index) => energies[index].score
    )

    expect(orderedScores[orderedScores.length - 1]).toBeGreaterThanOrEqual(8)
  })
})
