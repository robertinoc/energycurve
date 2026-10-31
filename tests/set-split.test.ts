import { describe, expect, it } from "vitest"

import {
  BEATS_PER_BAR,
  FALLBACK_TRANSITION_SECONDS,
  MIX_OVERLAP_BARS,
  ROUGH_TRACKS_PER_HOUR,
  estimateSetDuration,
  transitionSeconds,
} from "@/lib/engine/set-duration"
import {
  SPLIT_OFFER_ABOVE_MINUTES,
  harmonicAvailability,
  partitionTracks,
  planSplit,
  shouldOfferSplit,
  splitCountOptions,
  type SplitTrack,
} from "@/lib/engine/set-split"
import { optimizeOrder } from "@/lib/engine/reorder"
import { DURATION_COVERAGE_MIN } from "@/lib/engine/set-timing"
import { harmonicTableMove } from "@/lib/music/harmonic-transitions"
import type { ResolvedTrackEnergy } from "@/types/analysis"

/**
 * Splitting one long list into sets of about an hour. The tests that matter most
 * are the partition ones: with "own curve" every set must cover the same range
 * of energy, and with "continuous" they must not — that difference is the whole
 * point of offering both.
 */

function energy(score: number, camelot: string | null = null, index = 0): ResolvedTrackEnergy {
  return { trackId: `t${index}`, position: index + 1, score, source: "bpm", bpm: 124, camelot }
}

/** 45 tracks spread evenly from energy 1.0 to 9.8, in a shuffled list order. */
function fortyFive(): ResolvedTrackEnergy[] {
  return Array.from({ length: 45 }, (_, i) => {
    // A fixed permutation so list order is not energy order.
    const rank = (i * 17) % 45

    return energy(Math.round((1 + rank * 0.2) * 10) / 10, null, i)
  })
}

const scoresOf = (energies: ResolvedTrackEnergy[], group: number[]) =>
  group.map((index) => energies[index].score)

const range = (values: number[]) => ({ min: Math.min(...values), max: Math.max(...values) })

describe("the partition, 45 tracks into 2 sets", () => {
  it("own curve: both sets span a comparable range of energy", () => {
    const energies = fortyFive()
    const [one, two] = partitionTracks(energies, 2, "own_curve").map((group) =>
      range(scoresOf(energies, group))
    )

    // Each set gets low tracks for its intro and peak tracks for its climax. With
    // an odd count one set carries one more track, so its floor sits one or two
    // steps lower — 0.4 of an 8.8 span, which is still the same range.
    expect(Math.abs(one.min - two.min)).toBeLessThanOrEqual(0.5)
    expect(Math.abs(one.max - two.max)).toBeLessThanOrEqual(0.5)
    expect(one.max - one.min).toBeGreaterThan(8)
    expect(two.max - two.min).toBeGreaterThan(8)
  })

  it("continuous: the ranges do not overlap — set 1 is the low band, set 2 the next", () => {
    const energies = fortyFive()
    const [one, two] = partitionTracks(energies, 2, "continuous").map((group) =>
      range(scoresOf(energies, group))
    )

    expect(one.max).toBeLessThanOrEqual(two.min)
    expect(Math.abs(one.min - two.min)).toBeGreaterThan(4)
    expect(Math.abs(one.max - two.max)).toBeGreaterThan(4)
  })

  it("every criterion uses every track exactly once, in sets of near-equal size", () => {
    const energies = fortyFive().map((entry, i) => ({
      ...entry,
      camelot: `${(i % 12) + 1}${i % 2 === 0 ? "A" : "B"}`,
    }))

    for (const criterion of ["own_curve", "continuous", "harmonic"] as const) {
      const groups = partitionTracks(energies, 2, criterion)
      const all = groups.flat().sort((a, b) => a - b)

      expect(all, criterion).toEqual(energies.map((_, i) => i))
      expect(Math.abs(groups[0].length - groups[1].length), criterion).toBeLessThanOrEqual(1)
    }
  })

  it("is deterministic: the same list gives the same sets", () => {
    const energies = fortyFive()

    expect(partitionTracks(energies, 3, "own_curve")).toEqual(partitionTracks(energies, 3, "own_curve"))
  })
})

describe("the harmonic criterion", () => {
  it("keeps neighbours on the wheel together, so more pairs in each set mix clean", () => {
    // Two clusters on opposite sides of the wheel, interleaved in list order.
    const codes = ["1A", "7A", "2A", "8A", "1B", "7B", "12A", "6A", "2B", "8B", "12B", "6B"]
    const energies = codes.map((code, i) => energy(5, code, i))
    const groups = partitionTracks(energies, 2, "harmonic")

    const cleanPairs = (group: number[]) => {
      let pairs = 0
      for (let i = 0; i < group.length; i += 1) {
        for (let j = i + 1; j < group.length; j += 1) {
          const a = energies[group[i]].camelot!
          const b = energies[group[j]].camelot!
          if (harmonicTableMove(a, b) || harmonicTableMove(b, a)) pairs += 1
        }
      }
      return pairs
    }

    // Cutting the list in two halves puts 1A with 7A; by key, each set is one side.
    const indexes = codes.map((_, i) => i)
    const byListOrder = [indexes.slice(0, 6), indexes.slice(6)]

    expect(cleanPairs(groups[0]) + cleanPairs(groups[1])).toBeGreaterThan(
      cleanPairs(byListOrder[0]) + cleanPairs(byListOrder[1])
    )
  })

  it("is offered only with key coverage at the duration threshold, and says how many lack one", () => {
    const enough = Array.from({ length: 10 }, (_, i) => (i < 8 ? "8A" : null))
    const short = Array.from({ length: 10 }, (_, i) => (i < 7 ? "8A" : null))

    expect(DURATION_COVERAGE_MIN).toBe(0.8)
    expect(harmonicAvailability(enough)).toMatchObject({ available: true, missingKeys: 2 })
    expect(harmonicAvailability(short)).toMatchObject({ available: false, missingKeys: 3 })
  })

  it("places tracks without a key in the smallest sets, never drops them", () => {
    const energies = [
      ...["1A", "2A", "3A", "7A", "8A", "9A", "1B", "7B"].map((code, i) => energy(5, code, i)),
      energy(5, null, 8),
      energy(5, null, 9),
    ]
    const groups = partitionTracks(energies, 2, "harmonic")

    expect(groups.flat().sort((a, b) => a - b)).toEqual(energies.map((_, i) => i))
    expect(groups[0].length).toBe(5)
    expect(groups[1].length).toBe(5)
  })
})

describe("the plan: partition first, then a curve and an order per set", () => {
  const tracks: SplitTrack[] = fortyFive().map((entry) => ({
    energy: entry,
    durationSeconds: 360,
    bpm: 124,
  }))

  it("orders each set on its own, never across the cut", () => {
    const sets = planSplit(tracks, 2, "own_curve", { genre: "house", context: "main" })
    const partition = partitionTracks(tracks.map((t) => t.energy), 2, "own_curve")

    expect(sets.map((set) => set.number)).toEqual([1, 2])
    sets.forEach((set, i) => {
      expect([...set.order].sort((a, b) => a - b)).toEqual([...partition[i]].sort((a, b) => a - b))
      expect(set.target).toHaveLength(set.order.length)
    })
  })

  it("continuous: set 2's target starts where set 1's ended", () => {
    const sets = planSplit(tracks, 2, "continuous", { genre: "house", context: "main" })

    expect(sets[0].anchors).not.toBeNull()
    expect(sets[1].anchors?.[0][1]).toBe(sets[0].anchors?.[1][1])
    expect(sets[1].target[0]).toBe(sets[0].target.at(-1))
  })

  it("continuous: the optimizer orders against the chain, not against the declared shape", () => {
    // "landing" descends; the chained target of a band rises. The order has to
    // follow the chain, which only happens if the anchors reach the optimizer.
    const sets = planSplit(tracks, 2, "continuous", { genre: "house", context: "main", shape: "landing" })

    for (const set of sets) {
      expect(set.curve[0]).toBeLessThan(set.curve.at(-1) as number)
    }
  })

  it("own curve and harmonic keep each set autonomous: no chained anchors", () => {
    for (const criterion of ["own_curve", "harmonic"] as const) {
      const sets = planSplit(tracks, 2, criterion, { genre: "house", context: "main" })

      expect(sets.every((set) => set.anchors === null), criterion).toBe(true)
    }
  })
})

describe("optimizeOrder with explicit anchors", () => {
  const energies = [3, 9, 1, 7, 5, 2, 8, 4, 6].map((score, i) => energy(score, null, i))

  it("orders against the anchors when given", () => {
    const { order } = optimizeOrder(energies, "house", "main", null, [
      [0, 9],
      [1, 1],
    ])
    const curve = order.map((i) => energies[i].score)

    expect(curve[0]).toBeGreaterThan(curve.at(-1) as number)
  })

  it("is unchanged without them", () => {
    expect(optimizeOrder(energies, "house", "main")).toEqual(optimizeOrder(energies, "house", "main", null, null))
  })
})

describe("estimated duration", () => {
  it("measures the overlap in bars: 32 bars at 128 BPM is 60 seconds, at 96 BPM 80", () => {
    expect(MIX_OVERLAP_BARS).toBe(32)
    expect(transitionSeconds({ durationSeconds: 300, bpm: 128 }, { durationSeconds: 300, bpm: 128 })).toEqual({
      seconds: (MIX_OVERLAP_BARS * BEATS_PER_BAR * 60) / 128,
      estimated: false,
    })
    expect(transitionSeconds({ durationSeconds: 300, bpm: 96 }, { durationSeconds: 300, bpm: 96 }).seconds).toBe(80)
  })

  it("falls back to a fixed overlap when neither track has a BPM, and flags it", () => {
    expect(transitionSeconds({ durationSeconds: 300, bpm: null }, { durationSeconds: 300, bpm: null })).toEqual({
      seconds: FALLBACK_TRANSITION_SECONDS,
      estimated: true,
    })
    // One known BPM is enough: two beatmatched tracks run at one tempo.
    expect(transitionSeconds({ durationSeconds: 300, bpm: 128 }, { durationSeconds: 300, bpm: null }).estimated).toBe(false)
  })

  it("subtracts every transition from the summed lengths when lengths are known", () => {
    // 11 tracks of 6 min = 66 min; 10 mixes of 60 s at 128 BPM = 10 min.
    const tracks = Array.from({ length: 11 }, () => ({ durationSeconds: 360, bpm: 128 }))

    expect(estimateSetDuration(tracks)).toMatchObject({
      method: "measured",
      minutes: 56,
      transitions: 10,
      estimatedTransitions: 0,
    })
  })

  it("counts how many transitions were guessed", () => {
    const tracks = [
      { durationSeconds: 360, bpm: null },
      { durationSeconds: 360, bpm: null },
      { durationSeconds: 360, bpm: 128 },
    ]

    expect(estimateSetDuration(tracks).estimatedTransitions).toBe(1)
  })

  it("drops to 22 tracks an hour, said as rough, below the length coverage", () => {
    const tracks = Array.from({ length: 44 }, (_, i) => ({ durationSeconds: i < 30 ? 360 : null, bpm: 128 }))

    expect(ROUGH_TRACKS_PER_HOUR).toBe(22)
    expect(estimateSetDuration(tracks)).toMatchObject({ method: "rough", minutes: 120 })
  })
})

describe("when to ask, and what to offer", () => {
  const minutes = (value: number) => ({
    method: "measured" as const,
    minutes: value,
    coverage: 1,
    transitions: 0,
    estimatedTransitions: 0,
  })

  it("does not ask for a list of about an hour", () => {
    expect(SPLIT_OFFER_ABOVE_MINUTES).toBe(66)
    expect(shouldOfferSplit(minutes(66))).toBe(false)
    expect(splitCountOptions(minutes(64), 20)).toEqual([])
  })

  it("offers only the counts that leave each set near an hour, not every number", () => {
    expect(splitCountOptions(minutes(120), 40)).toEqual([2])
    expect(splitCountOptions(minutes(150), 50)).toEqual([2, 3])
    // 67 and 50 minutes: both within a quarter of an hour, so both are offered.
    expect(splitCountOptions(minutes(200), 70)).toEqual([3, 4])
    expect(splitCountOptions(minutes(100), 40)).toEqual([2])
    expect(splitCountOptions(minutes(80), 30)).toEqual([2])
  })

  it("never offers a count that would leave a set with a handful of tracks", () => {
    expect(splitCountOptions(minutes(130), 7)).toEqual([])
  })
})
