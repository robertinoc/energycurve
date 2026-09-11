import { describe, expect, it } from "vitest"

import {
  energyCoverageOf,
  INVENTED_SHARE_THRESHOLD,
  scoreIsMeaningful,
} from "@/lib/engine/energy-coverage"
import { assessSlotFit, resolveSetTiming } from "@/lib/engine/set-timing"
import type { EnergySource, TrackEnergyMeta } from "@/types/analysis"

/**
 * Phase F5 — reconciliation. The plan asked for "daily/monthly/yearly
 * aggregations"; this product has two aggregates that a person reads and acts
 * on, and both are claims about evidence rather than about time:
 *
 * - **How long the set is**, which decides whether it fills a booked slot.
 * - **How much of the curve is real**, which decides whether the score means
 *   anything at all.
 *
 * The property both must hold is the same one a ledger must hold: the total has
 * to be the parts. Where the parts are missing, the total has to say so rather
 * than quietly absorb a guess — because the number is identical either way, and
 * only one of them is honest.
 */

/**
 * Fully-formed rows rather than a cast.
 *
 * The first version cast a partial object and `tsc` rejected it, correctly: an
 * `as` here would have let the shape drift from the real one without anything
 * noticing, which in a test about *reconciliation* would be its own small joke.
 */
function meta(sources: EnergySource[]): TrackEnergyMeta[] {
  return sources.map((source, index) => ({
    trackId: `t${index}`,
    position: index + 1,
    score: 5,
    source,
    bpm: 128,
  }))
}

describe("set length reconciles with the durations it came from", () => {
  it("is exactly the sum when every track is measured", () => {
    // Six five-minute tracks is thirty minutes. Not about thirty.
    const timing = resolveSetTiming(Array.from({ length: 6 }, () => 300))

    expect(timing.totalMinutes).toBe(30)
    expect(timing.coverage).toBe(1)
    expect(timing.unknownCount).toBe(0)
    expect(timing.measured).toBe(true)
  })

  it("adds up with mixed real lengths, to the minute", () => {
    const seconds = [312, 405, 288, 501, 360]
    const expected = Math.round(seconds.reduce((a, b) => a + b, 0) / 60)

    expect(resolveSetTiming(seconds).totalMinutes).toBe(expected)
  })

  it("counts every unknown, so the total can be read with its caveat", () => {
    const timing = resolveSetTiming([300, null, 300, undefined, 300])

    expect(timing.unknownCount).toBe(2)
    expect(timing.coverage).toBeCloseTo(3 / 5, 10)
    // The parts that are real are still real: the three known tracks are 15
    // minutes, and the fill for the other two is stated separately rather than
    // blended into a number that looks measured.
    expect(timing.totalMinutes).toBeGreaterThanOrEqual(15)
  })

  it("degrades per track rather than all-or-nothing", () => {
    // One untagged file in thirty must not throw away twenty-nine real numbers.
    const durations: (number | null)[] = Array.from({ length: 30 }, () => 300)
    durations[7] = null

    const timing = resolveSetTiming(durations)

    expect(timing.unknownCount).toBe(1)
    expect(timing.coverage).toBeCloseTo(29 / 30, 10)
    expect(timing.measured).toBe(true)
    // The median of twenty-nine five-minute tracks is five minutes, so the fill
    // is the only defensible one and the total lands where it should.
    expect(timing.totalMinutes).toBe(150)
  })

  it("an empty set is zero minutes and not measured, rather than an error", () => {
    expect(resolveSetTiming([])).toEqual({
      totalMinutes: 0,
      coverage: 0,
      measured: false,
      unknownCount: 0,
    })
  })
})

describe("outliers must not define the fill for everyone else", () => {
  it("ignores a duration longer than any track", () => {
    // A six-hour "track" is a bad tag — a whole DJ set exported as one file, or
    // a corrupt field. Letting it into the median would inflate the fill for
    // every untagged track in the playlist.
    const withGarbage = resolveSetTiming([300, 300, 300, 6 * 60 * 60, null])
    const withoutIt = resolveSetTiming([300, 300, 300, null])

    expect(withGarbage.unknownCount).toBe(2)
    // The three real tracks are 15 minutes; the two fills are five each.
    expect(withGarbage.totalMinutes).toBe(withoutIt.totalMinutes + 5)
  })

  it("ignores zero, negative and non-finite durations", () => {
    const timing = resolveSetTiming([300, 0, -60, Number.NaN, Number.POSITIVE_INFINITY, 300])

    expect(timing.unknownCount).toBe(4)
    expect(timing.coverage).toBeCloseTo(2 / 6, 10)
  })

  it("uses the median and not the mean, so one bad value cannot drag the fill", () => {
    // Four four-minute tracks and one twenty-minute one. The mean is 7.2; the
    // median is 4. The unknown should be filled with what a track actually
    // looks like in this set.
    const timing = resolveSetTiming([240, 240, 240, 240, 1200, null])

    // 4+4+4+4+20 = 36 real minutes, plus a 4-minute median fill.
    expect(timing.totalMinutes).toBe(40)
  })
})

describe("a set's fit in its slot is only claimed when the length is known", () => {
  it("refuses to answer from a mostly guessed total", () => {
    // Advice someone acts on at 02:40 must not be computed from a guess wearing
    // a number.
    const guessed = resolveSetTiming([300, null, null, null, null])

    expect(guessed.measured).toBe(false)
    expect(assessSlotFit(guessed, 120)).toBeNull()
  })

  it("answers when the length is real, and the arithmetic reconciles", () => {
    const timing = resolveSetTiming(Array.from({ length: 24 }, () => 300))
    const fit = assessSlotFit(timing, 120)

    expect(timing.totalMinutes).toBe(120)
    expect(fit).toMatchObject({ verdict: "fits", setMinutes: 120, slotMinutes: 120 })
    expect(fit!.differenceMinutes).toBe(0)
  })

  it("reports the gap as minutes, signed the way a person reads it", () => {
    const short = assessSlotFit(resolveSetTiming(Array.from({ length: 12 }, () => 300)), 120)

    expect(short!.verdict).toBe("short")
    // Sixty minutes of music in a two-hour slot: sixty minutes missing.
    expect(short!.differenceMinutes).toBe(-60)
  })
})

describe("energy coverage reconciles with where each value came from", () => {
  it("the three shares sum to exactly one", () => {
    // The invariant that makes the verdict trustworthy: no track is counted
    // twice and none is dropped.
    for (const sources of [
      ["manual", "audio", "bpm", "estimated"],
      ["estimated"],
      ["audio", "audio", "audio"],
      ["bpm", "bpm_loudness", "estimated", "manual", "audio", "bpm"],
    ] as EnergySource[][]) {
      const coverage = energyCoverageOf(meta(sources))
      const total =
        coverage.measuredShare + coverage.inferredShare + coverage.inventedShare

      expect(Math.abs(total - 1), sources.join(",")).toBeLessThan(1e-12)
    }
  })

  it("counts invented tracks, and the count agrees with the share", () => {
    const coverage = energyCoverageOf(
      meta(["audio", "estimated", "estimated", "bpm"])
    )

    expect(coverage.trackCount).toBe(4)
    expect(coverage.inventedCount).toBe(2)
    expect(coverage.inventedShare).toBeCloseTo(coverage.inventedCount / 4, 10)
  })

  it("an empty set is invented with zero counts, never measured", () => {
    // A default of "measured" on no evidence is the one mistake this module
    // exists to prevent.
    const coverage = energyCoverageOf([])

    expect(coverage.verdict).toBe("invented")
    expect(coverage.trackCount).toBe(0)
    expect(scoreIsMeaningful(coverage)).toBe(false)
  })
})

describe("the score is withheld exactly when the curve is mostly ours", () => {
  it("is meaningful while the invented share stays under the threshold", () => {
    // Two of six invented is one third — under two thirds, so the shape is
    // still largely the DJ's.
    const coverage = energyCoverageOf(
      meta(["audio", "audio", "bpm", "bpm", "estimated", "estimated"])
    )

    expect(coverage.inventedShare).toBeLessThan(INVENTED_SHARE_THRESHOLD)
    expect(scoreIsMeaningful(coverage)).toBe(true)
  })

  it("is withheld once the invented share reaches it", () => {
    // Four of six is two thirds exactly: at the threshold, not under it.
    const coverage = energyCoverageOf(
      meta(["audio", "bpm", "estimated", "estimated", "estimated", "estimated"])
    )

    expect(coverage.inventedShare).toBeGreaterThanOrEqual(INVENTED_SHARE_THRESHOLD)
    expect(coverage.verdict).toBe("invented")
    expect(scoreIsMeaningful(coverage)).toBe(false)
  })

  it("a set with no evidence at all never yields a score", () => {
    const coverage = energyCoverageOf(meta(Array(10).fill("estimated")))

    expect(coverage.inventedShare).toBe(1)
    expect(scoreIsMeaningful(coverage)).toBe(false)
  })

  it("the boundary is crossed by one track, and the verdict moves with it", () => {
    // Three of five invented is 0.6, under the threshold. Four of five is 0.8,
    // over it. The one-track step is what a DJ actually experiences when they
    // tag one more file, so it is worth pinning that it changes the answer.
    const under = energyCoverageOf(
      meta(["audio", "audio", "estimated", "estimated", "estimated"])
    )
    const over = energyCoverageOf(
      meta(["audio", "estimated", "estimated", "estimated", "estimated"])
    )

    expect(scoreIsMeaningful(under)).toBe(true)
    expect(scoreIsMeaningful(over)).toBe(false)
  })
})
