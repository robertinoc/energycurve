import { describe, expect, it } from "vitest"

import { computeAnalysisInputHash } from "@/lib/analytics/analysis-hash"
import { CURRENT_ANALYSIS_ALGORITHM_VERSION } from "@/lib/product/strategy"

describe("computeAnalysisInputHash", () => {
  it("is deterministic for the same input", () => {
    const input = { curve: [4, 5.5, 7], genre: "house", context: "opening" }

    expect(computeAnalysisInputHash(input)).toBe(
      computeAnalysisInputHash({ ...input, curve: [...input.curve] })
    )
  })

  it("changes when the curve changes", () => {
    const base = { curve: [4, 5, 6], genre: "house", context: "main" }

    expect(computeAnalysisInputHash(base)).not.toBe(
      computeAnalysisInputHash({ ...base, curve: [4, 5, 7] })
    )
  })

  it("changes when genre or context change", () => {
    const base = { curve: [4, 5, 6], genre: "house", context: "main" }

    expect(computeAnalysisInputHash(base)).not.toBe(
      computeAnalysisInputHash({ ...base, genre: "techno" })
    )
    expect(computeAnalysisInputHash(base)).not.toBe(
      computeAnalysisInputHash({ ...base, context: "closing" })
    )
  })

  it("changes when the algorithm version changes", () => {
    const base = { curve: [4, 5, 6], genre: "house", context: "main" }

    expect(
      computeAnalysisInputHash({ ...base, algorithmVersion: 1 })
    ).not.toBe(computeAnalysisInputHash({ ...base, algorithmVersion: 2 }))
  })

  it("defaults to the current algorithm version", () => {
    const base = { curve: [4, 5, 6], genre: "house", context: "main" }

    expect(computeAnalysisInputHash(base)).toBe(
      computeAnalysisInputHash({
        ...base,
        algorithmVersion: CURRENT_ANALYSIS_ALGORITHM_VERSION,
      })
    )
  })

  it("is order-sensitive for the curve", () => {
    expect(
      computeAnalysisInputHash({ curve: [4, 6], genre: "house", context: "main" })
    ).not.toBe(
      computeAnalysisInputHash({ curve: [6, 4], genre: "house", context: "main" })
    )
  })

  it("returns a stable 8-char hex string", () => {
    const hash = computeAnalysisInputHash({
      curve: [],
      genre: "progressive",
      context: "closing",
    })

    expect(hash).toMatch(/^[0-9a-f]{8}$/)
  })
})

describe("computeAnalysisInputHash — target shape", () => {
  const base = { curve: [4, 6, 8], genre: "house", context: "main" }

  it("changes when the declared shape changes", () => {
    // The shape changes the score, so re-analyzing after switching it has to
    // record a fresh history row instead of deduping against the old one.
    expect(computeAnalysisInputHash(base)).not.toBe(
      computeAnalysisInputHash({ ...base, targetShape: "after_hours" })
    )
    expect(
      computeAnalysisInputHash({ ...base, targetShape: "after_hours" })
    ).not.toBe(computeAnalysisInputHash({ ...base, targetShape: "landing" }))
  })

  it("treats an absent shape and an explicit null as the same input", () => {
    expect(computeAnalysisInputHash(base)).toBe(
      computeAnalysisInputHash({ ...base, targetShape: null })
    )
  })
})
