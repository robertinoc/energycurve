import { describe, expect, it } from "vitest"

import { formatTemplate, ISSUE_COPY } from "@/lib/content/analysis-copy"
import { analyzePlaylist } from "@/lib/engine/analysis"
import {
  buildRecommendations,
  suggestReorder,
} from "@/lib/engine/recommendations"
import type { ResolvedTrackEnergy } from "@/types/analysis"

function energies(scores: number[]): ResolvedTrackEnergy[] {
  return scores.map((score, index) => ({
    trackId: `t${index + 1}`,
    position: index + 1,
    score,
    source: "manual" as const,
    bpm: null,
    camelot: null,
  }))
}

describe("ISSUE_COPY", () => {
  it("has non-empty EN and ES strings for every issue type", () => {
    for (const [type, copy] of Object.entries(ISSUE_COPY)) {
      for (const locale of ["en", "es"] as const) {
        expect(copy.title[locale], `${type} title ${locale}`).toBeTruthy()
        expect(copy.body[locale], `${type} body ${locale}`).toBeTruthy()
        expect(
          copy.recommendation[locale],
          `${type} recommendation ${locale}`
        ).toBeTruthy()
      }
    }
  })
})

describe("formatTemplate", () => {
  it("interpolates named slots", () => {
    expect(formatTemplate("Track {from} to {to}: {delta}", {
      from: 2,
      to: 3,
      delta: 4,
    })).toBe("Track 2 to 3: 4")
  })

  it("leaves unknown slots visible", () => {
    expect(formatTemplate("Hello {missing}", {})).toBe("Hello {missing}")
  })
})

describe("buildRecommendations", () => {
  it("maps every detected issue to localized copy with interpolated values", () => {
    const analysis = analyzePlaylist({
      // 9 → 4.5 is a −4.5 cliff for house (drop tolerance 2).
      curve: [6.5, 7.5, 9, 4.5, 6, 7, 8, 9, 9.2, 8.9, 9.1, 9],
      genre: "house",
      context: "main",
    })

    const en = buildRecommendations(analysis, "en")
    const es = buildRecommendations(analysis, "es")

    expect(en).toHaveLength(analysis.issues.length)
    expect(es).toHaveLength(analysis.issues.length)

    const drop = en.find((r) => r.issue.type === "abrupt_drop")
    expect(drop?.body).toContain("4.5 points")
    expect(drop?.body).toContain("tracks 3 and 4")

    const dropEs = es.find((r) => r.issue.type === "abrupt_drop")
    expect(dropEs?.body).toContain("4.5 puntos")

    for (const recommendation of [...en, ...es]) {
      expect(recommendation.title).not.toMatch(/\{\w+\}/)
      expect(recommendation.body).not.toMatch(/\{\w+\}/)
      expect(recommendation.action).not.toMatch(/\{\w+\}/)
    }
  })

  it("localizes the positive breather copy too", () => {
    const analysis = analyzePlaylist({
      curve: [6, 7, 8, 8.5, 9, 6.5, 7.5, 8.5, 9, 9.2, 8.9, 9.2],
      genre: "house",
      context: "main",
    })

    const es = buildRecommendations(analysis, "es")
    const breather = es.find((r) => r.issue.type === "good_breather")

    expect(breather?.title).toBe("Respiro bien ubicado")
    expect(breather?.body).not.toMatch(/\{\w+\}/)
  })
})

describe("suggestReorder", () => {
  it("suggests the optimized order when it meaningfully improves the score", () => {
    const scores = [9, 3, 6, 4, 8, 5]
    const input = energies(scores)
    const original = analyzePlaylist({
      curve: scores,
      genre: "house",
      context: "opening",
    })

    const suggestion = suggestReorder(
      input,
      "house",
      "opening",
      original.setScore,
      "en"
    )

    expect(suggestion).not.toBeNull()
    expect(suggestion?.suggestedAnalysis.setScore).toBeGreaterThanOrEqual(
      original.setScore + 0.5
    )
    // The suggested order is a permutation of the original positions.
    expect([...(suggestion?.suggestedOrder ?? [])].sort((a, b) => a - b)).toEqual(
      [1, 2, 3, 4, 5, 6]
    )
    expect(suggestion?.rationale).toContain("opening")
  })

  it("returns null when the set already follows its ideal curve", () => {
    const scores = [3, 3.5, 4.2, 4.8, 5.5, 6]
    const input = energies(scores)
    const original = analyzePlaylist({
      curve: scores,
      genre: "house",
      context: "opening",
    })

    expect(
      suggestReorder(input, "house", "opening", original.setScore, "en")
    ).toBeNull()
  })

  it("localizes the rationale", () => {
    const scores = [9, 3, 6, 4, 8, 5]
    const suggestion = suggestReorder(
      energies(scores),
      "house",
      "opening",
      1,
      "es"
    )

    expect(suggestion?.rationale).toContain("curva ideal")
  })

  it("returns null for fewer than two tracks", () => {
    expect(suggestReorder(energies([7]), "house", "main", 5, "en")).toBeNull()
  })
})
