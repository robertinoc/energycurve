import { describe, expect, it } from "vitest"

import { computeAnalysisInputHash } from "@/lib/analytics/analysis-hash"

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
