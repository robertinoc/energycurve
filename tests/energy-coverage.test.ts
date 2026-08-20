import { describe, expect, it } from "vitest"

import {
  INVENTED_SHARE_THRESHOLD,
  INVENTED_SHARE_WARN,
  energyCoverageOf,
} from "@/lib/engine/energy-coverage"
import type { EnergySource } from "@/types/analysis"

const from = (...sources: EnergySource[]) =>
  energyCoverageOf(sources.map((source) => ({ source, bpm: null })))

const repeat = (source: EnergySource, count: number): EnergySource[] =>
  Array.from({ length: count }, () => source)

describe("energyCoverageOf", () => {
  it("calls a fully analysed set measured", () => {
    const coverage = from(...repeat("audio", 10))

    expect(coverage.verdict).toBe("measured")
    expect(coverage.measuredShare).toBe(1)
    expect(coverage.inventedCount).toBe(0)
  })

  it("treats the DJ's own ear as measurement", () => {
    // A manual score is the most authoritative value in the ladder — it's the
    // thing the audio model is being calibrated to.
    expect(from(...repeat("manual", 10)).verdict).toBe("measured")
  })

  it("calls a BPM-only set inferred, not measured", () => {
    // Real tags, but tempo is a proxy for energy rather than a reading of it.
    const coverage = from(...repeat("bpm", 8), ...repeat("bpm_loudness", 2))

    expect(coverage.verdict).toBe("inferred")
    expect(coverage.inferredShare).toBe(1)
  })

  it("calls a set with no data at all invented", () => {
    // The case that motivated this module: a plain text tracklist scores 9.2/10
    // because the curve it grades is the ideal ramp the engine drew itself.
    const coverage = from(...repeat("estimated", 20))

    expect(coverage.verdict).toBe("invented")
    expect(coverage.inventedShare).toBe(1)
    expect(coverage.inventedCount).toBe(20)
  })

  it("calls a half-and-half set mixed, and still flags it as worth warning", () => {
    // Half its shape really is the DJ's, so `invented` would overstate it. But the
    // fabricated half is shaped like the target and props the score up, which is
    // what the lower warn threshold is for. Both facts, separately.
    const coverage = from(...repeat("audio", 5), ...repeat("estimated", 5))

    expect(coverage.verdict).toBe("mixed")
    expect(coverage.inventedShare).toBeGreaterThanOrEqual(INVENTED_SHARE_WARN)
  })

  it("keeps the warn threshold below the verdict threshold", () => {
    // If these ever cross, the warning becomes unreachable for anything the
    // verdict doesn't already call invented.
    expect(INVENTED_SHARE_WARN).toBeLessThan(INVENTED_SHARE_THRESHOLD)
  })

  it("puts the invented threshold exactly where the constant says", () => {
    // 2 of 3 invented is over the line; 1 of 3 is not.
    expect(from("estimated", "estimated", "audio").verdict).toBe("invented")
    expect(from("estimated", "audio", "audio").verdict).not.toBe("invented")
    expect(INVENTED_SHARE_THRESHOLD).toBeLessThan(1)
  })

  it("reports a genuinely mixed set as mixed", () => {
    const coverage = from(
      ...repeat("audio", 5),
      ...repeat("bpm", 4),
      "estimated"
    )

    expect(coverage.verdict).toBe("mixed")
    expect(coverage.inventedShare).toBeCloseTo(0.1)
  })

  it("refuses to default an empty set to measured", () => {
    // There is no curve, so there is certainly no evidence behind one. Defaulting
    // the other way is the single mistake this module exists to prevent.
    for (const coverage of [energyCoverageOf([]), energyCoverageOf(undefined)]) {
      expect(coverage.verdict).toBe("invented")
      expect(coverage.trackCount).toBe(0)
    }
  })

  it("keeps the three shares summing to one", () => {
    const coverage = from("manual", "audio", "bpm", "bpm_loudness", "estimated")

    expect(
      coverage.measuredShare + coverage.inferredShare + coverage.inventedShare
    ).toBeCloseTo(1)
  })
})
