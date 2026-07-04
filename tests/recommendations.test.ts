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
      curve: [8, 5, 6, 7],
      genre: "house",
      context: "main",
    })

    const en = buildRecommendations(analysis, "en")
    const es = buildRecommendations(analysis, "es")

    expect(en).toHaveLength(analysis.issues.length)
    expect(es).toHaveLength(analysis.issues.length)

    const drop = en.find((r) => r.issue.type === "abrupt_drop")
    expect(drop?.body).toContain("3 points")
    expect(drop?.body).toContain("tracks 1 and 2")

    const dropEs = es.find((r) => r.issue.type === "abrupt_drop")
    expect(dropEs?.body).toContain("3 puntos")

    for (const recommendation of [...en, ...es]) {
      expect(recommendation.title).not.toMatch(/\{\w+\}/)
      expect(recommendation.body).not.toMatch(/\{\w+\}/)
      expect(recommendation.action).not.toMatch(/\{\w+\}/)
    }
  })
})

describe("suggestReorder", () => {
  it("suggests an ascending order when it strictly improves the score", () => {
    const input = energies([8, 3, 6])
    const original = analyzePlaylist({
      curve: [8, 3, 6],
      genre: "house",
      context: "main",
    })

    const suggestion = suggestReorder(
      input,
      "house",
      "main",
      original.setScore,
      "en"
    )

    expect(suggestion).not.toBeNull()
    expect(suggestion?.suggestedOrder).toEqual([2, 3, 1])
    expect(suggestion?.suggestedAnalysis.setScore).toBeGreaterThan(
      original.setScore
    )
    expect(suggestion?.rationale).toBeTruthy()
  })

  it("returns null when the set is already optimal", () => {
    const input = energies([6, 7, 8, 9])
    const original = analyzePlaylist({
      curve: [6, 7, 8, 9],
      genre: "techno",
      context: "main",
    })

    expect(
      suggestReorder(input, "techno", "main", original.setScore, "en")
    ).toBeNull()
  })

  it("keeps equal scores in their original relative order (stable sort)", () => {
    const input = energies([7, 7, 3])
    const suggestion = suggestReorder(input, "house", "main", 1, "en")

    expect(suggestion?.suggestedOrder).toEqual([3, 1, 2])
  })

  it("returns null for fewer than two tracks", () => {
    expect(suggestReorder(energies([7]), "house", "main", 5, "en")).toBeNull()
  })
})
