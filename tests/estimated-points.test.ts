import { describe, expect, it } from "vitest"

import {
  estimatedPointIndices,
  shouldMarkEstimated,
} from "@/lib/charts/estimated-points"
import type { EnergySource } from "@/types/analysis"

const sources = (...values: EnergySource[]) => values

describe("estimatedPointIndices", () => {
  it("finds the points interpolated from position", () => {
    expect(
      estimatedPointIndices(sources("audio", "estimated", "bpm", "estimated"))
    ).toEqual([1, 3])
  })

  it("does not mark BPM as invented", () => {
    // Weak but real: a tempo the DJ's software wrote. Marking it would cry wolf
    // on the majority of imported sets.
    expect(
      estimatedPointIndices(sources("bpm", "bpm_loudness", "manual", "audio"))
    ).toEqual([])
  })

  it("returns nothing for an empty curve", () => {
    expect(estimatedPointIndices([])).toEqual([])
  })
})

describe("shouldMarkEstimated", () => {
  it("marks a partially invented curve", () => {
    expect(shouldMarkEstimated(3, 10)).toBe(true)
  })

  it("marks nothing when nothing is invented", () => {
    expect(shouldMarkEstimated(0, 10)).toBe(false)
  })

  it("marks nothing when everything is invented", () => {
    // A chart where every point is hollow has a uniform texture, which reads as
    // decoration rather than warning — and that case is already covered louder by
    // withholding the score entirely.
    expect(shouldMarkEstimated(10, 10)).toBe(false)
  })

  it("handles an empty curve without claiming anything", () => {
    expect(shouldMarkEstimated(0, 0)).toBe(false)
  })
})
