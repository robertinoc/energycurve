import { describe, expect, it } from "vitest"

import { computeSetScore } from "@/lib/engine/analysis"
import { optimizeOrder, REORDER_MAX_TRACKS } from "@/lib/engine/reorder"
import { suggestReorder } from "@/lib/engine/recommendations"
import type { ResolvedTrackEnergy } from "@/types/analysis"

function energiesFrom(scores: number[]): ResolvedTrackEnergy[] {
  return scores.map((score, index) => ({
    trackId: `t${index + 1}`,
    position: index + 1,
    score,
    source: "manual" as const,
    bpm: null,
    camelot: null,
  }))
}

function isPermutation(order: number[], length: number) {
  return (
    order.length === length &&
    [...order].sort((a, b) => a - b).every((value, index) => value === index)
  )
}

function keyedEnergies(
  entries: Array<{ score: number; camelot: string | null }>
) {
  return entries.map((entry, index) => ({
    trackId: `t${index + 1}`,
    position: index + 1,
    score: entry.score,
    source: "manual" as const,
    bpm: null,
    camelot: entry.camelot,
  }))
}

describe("optimizeOrder — harmonic objective (B20)", () => {
  it("prefers the harmonic chain among energy-equivalent orders", () => {
    // Six tracks at identical energy: energy score is the same for every
    // permutation, so harmony decides. Keys allow a perfect wheel walk.
    const energies = keyedEnergies([
      { score: 8, camelot: "9A" },
      { score: 8, camelot: "7A" },
      { score: 8, camelot: "10A" },
      { score: 8, camelot: "8A" },
      { score: 8, camelot: "6A" },
      { score: 8, camelot: "11A" },
    ])

    const optimized = optimizeOrder(energies, "hard-techno", "main")
    const orderedKeys = optimized.order.map((i) => energies[i].camelot)

    expect(optimized.harmonicRatio).toBe(1)
    // A full chain: every adjacent pair within ±1 on the wheel.
    for (let i = 1; i < orderedKeys.length; i += 1) {
      const a = Number.parseInt(orderedKeys[i - 1]!, 10)
      const b = Number.parseInt(orderedKeys[i]!, 10)
      expect(Math.abs(a - b)).toBeLessThanOrEqual(1)
    }
  })

  it("ignores harmony when key coverage is too low", () => {
    const energies = keyedEnergies([
      { score: 6, camelot: "9A" },
      { score: 7, camelot: null },
      { score: 8, camelot: null },
      { score: 9, camelot: null },
      { score: 8.5, camelot: null },
      { score: 9, camelot: "3B" },
    ])

    // No throw + valid permutation is the contract; ratio may be anything.
    const optimized = optimizeOrder(energies, "house", "main")
    expect(isPermutation(optimized.order, energies.length)).toBe(true)
  })
})

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

/**
 * The search is 2-opt over a whole-order objective — O(passes · n²) candidate
 * swaps, each scored in O(n). Measured with keys: 60 tracks 0.5s, 150 tracks
 * 11.6s, 250 tracks 63s, 400 tracks four minutes. The analysis runs inside a
 * server render, so past a certain length the page doesn't get slow, it times
 * out and the DJ gets nothing.
 */
describe("length cap on the reorder search", () => {
  function energies(n: number): ResolvedTrackEnergy[] {
    return Array.from({ length: n }, (_, i) => ({
      trackId: `t${i}`,
      position: i + 1,
      score: 1 + ((i * 37) % 90) / 10,
      source: "manual" as const,
      bpm: 128,
      camelot: `${((i * 5) % 12) + 1}${i % 2 === 0 ? "A" : "B"}`,
    }))
  }

  it("still suggests an order at the cap", () => {
    expect(
      suggestReorder(
        energies(REORDER_MAX_TRACKS),
        "house",
        "main",
        5,
        "en"
      )
    ).not.toBeNull()
  }, 30_000)

  it("declines past it rather than hanging the render", () => {
    expect(
      suggestReorder(
        energies(REORDER_MAX_TRACKS + 1),
        "house",
        "main",
        5,
        "en"
      )
    ).toBeNull()
  })

  it("stays inside a server render's budget at the cap", () => {
    const t0 = performance.now()
    optimizeOrder(energies(REORDER_MAX_TRACKS), "house", "main", null)
    const ms = performance.now() - t0

    // Generous ceiling — CI machines vary — but it fails loudly if the cost
    // at the cap ever climbs back into "the page hangs" territory.
    expect(ms).toBeLessThan(15_000)
  }, 60_000)
})
