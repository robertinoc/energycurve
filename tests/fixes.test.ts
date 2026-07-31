import { describe, expect, it } from "vitest"

import { analyzePlaylist } from "@/lib/engine/analysis"
import {
  deriveFixes,
  deriveOrder,
  potentialScore,
  scoreOrder,
  type SetFix,
} from "@/lib/engine/fixes"
import type { DetectedIssue, ResolvedTrackEnergy } from "@/types/analysis"

/** Synthetic resolved energies for a given score curve (manual source). */
function energiesOf(scores: number[]): ResolvedTrackEnergy[] {
  return scores.map((score, index) => ({
    trackId: `t${index + 1}`,
    position: index + 1,
    score,
    source: "manual" as const,
    bpm: null,
    camelot: null,
  }))
}

function idsOf(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `t${index + 1}`)
}

function fix(overrides: Partial<SetFix>): SetFix {
  return {
    id: "f1",
    issueType: "abrupt_drop",
    severity: "penalty",
    markerPosition: 1,
    tracks: [],
    delta: null,
    points: 0,
    operations: [],
    ...overrides,
  }
}

describe("deriveOrder", () => {
  const original = ["a", "b", "c", "d", "e"]

  it("returns the original order when nothing is applied", () => {
    expect(deriveOrder(original, [], new Set())).toEqual(original)
  })

  it("applies a fix's operations sequentially and deterministically", () => {
    const fixes = [
      fix({ id: "f1", operations: [{ trackId: "e", toIndex: 1 }] }),
      fix({ id: "f2", operations: [{ trackId: "a", toIndex: 4 }] }),
    ]

    // Only f1 applied.
    expect(deriveOrder(original, fixes, new Set(["f1"]))).toEqual([
      "a",
      "e",
      "b",
      "c",
      "d",
    ])
    // Both applied, in fixes-array order (never in application-click order).
    expect(deriveOrder(original, fixes, new Set(["f2", "f1"]))).toEqual([
      "e",
      "b",
      "c",
      "d",
      "a",
    ])
  })

  it("undo is exact: removing a fix re-derives the previous order", () => {
    const fixes = [
      fix({ id: "f1", operations: [{ trackId: "e", toIndex: 0 }] }),
      fix({ id: "f2", operations: [{ trackId: "b", toIndex: 3 }] }),
    ]

    const both = deriveOrder(original, fixes, new Set(["f1", "f2"]))
    expect(both).not.toEqual(original)

    const withoutF2 = deriveOrder(original, fixes, new Set(["f1"]))
    expect(withoutF2).toEqual(deriveOrder(original, fixes, new Set(["f1"])))

    expect(deriveOrder(original, fixes, new Set())).toEqual(original)
  })

  it("never mutates the original array", () => {
    const frozen = Object.freeze(["a", "b", "c"]) as unknown as string[]
    const fixes = [fix({ id: "f1", operations: [{ trackId: "c", toIndex: 0 }] })]

    expect(() => deriveOrder(frozen, fixes, new Set(["f1"]))).not.toThrow()
    expect(frozen).toEqual(["a", "b", "c"])
  })
})

describe("scoreOrder", () => {
  it("matches the engine's own score for the same curve", () => {
    const scores = [3, 4, 5, 6, 7, 8, 9, 8]
    const energies = energiesOf(scores)
    const ids = idsOf(scores.length)

    const direct = analyzePlaylist({
      curve: scores,
      genre: "hard-techno",
      context: "main",
      trackMeta: energies.map((entry) => ({
        source: entry.source,
        bpm: entry.bpm,
      })),
    }).setScore

    expect(scoreOrder(ids, ids, energies, "hard-techno", "main")).toBe(direct)
  })

  it("scores a reordered list on its reordered curve", () => {
    // Descending order should score worse than ascending for a main set.
    const scores = [3, 4, 5, 6, 7, 8, 9]
    const energies = energiesOf(scores)
    const ids = idsOf(scores.length)
    const reversed = [...ids].reverse()

    const ascending = scoreOrder(ids, ids, energies, "hard-techno", "main")
    const descending = scoreOrder(reversed, ids, energies, "hard-techno", "main")

    expect(descending).toBeLessThan(ascending)
  })
})

describe("potentialScore", () => {
  const fixes = [
    fix({ id: "f1", points: 0.8, operations: [{ trackId: "a", toIndex: 1 }] }),
    fix({ id: "f2", points: 0.5, operations: [{ trackId: "b", toIndex: 2 }] }),
    fix({ id: "advice", points: 0, operations: [] }),
  ]

  it("sums non-discarded actionable fixes onto the base", () => {
    expect(potentialScore(6.7, fixes, new Set())).toBe(8)
  })

  it("drops discarded fixes from the potential", () => {
    expect(potentialScore(6.7, fixes, new Set(["f2"]))).toBe(7.5)
  })

  it("caps at 10", () => {
    expect(potentialScore(9.8, fixes, new Set())).toBe(10)
  })
})

describe("deriveFixes", () => {
  // A main-set curve with a violent mid-set drop: 8 → 3 between positions 4-5.
  const scores = [4, 5, 7, 8, 3, 7.5, 8.5, 9]
  const energies = energiesOf(scores)
  const ids = idsOf(scores.length)
  const target = [4, 4.9, 5.7, 6.6, 7.4, 8.3, 9.1, 10]

  function derive(issues: DetectedIssue[]) {
    const baseScore = scoreOrder(ids, ids, energies, "hard-techno", "main")
    return deriveFixes({
      trackIds: ids,
      energies,
      issues,
      targetCurve: target,
      genre: "hard-techno",
      context: "main",
      baseScore,
    })
  }

  it("bridges an abrupt drop with the closest-to-midpoint track", () => {
    const [bridge] = derive([
      {
        type: "abrupt_drop",
        severity: "penalty",
        trackPositions: [4, 5],
        penaltyApplied: 1.2,
        penaltyCategory: null,
        delta: -5,
      },
    ])

    expect(bridge.markerPosition).toBe(4)
    expect(bridge.delta).toBe(-5)
    // Midpoint of 8 and 3 is 5.5: t2 (5) is the closest candidate.
    expect(bridge.operations).toEqual([{ trackId: "t2", toIndex: 3 }])
    // Applying only this fix must place t2 between t4 and t5.
    const order = deriveOrder(ids, [bridge], new Set([bridge.id]))
    expect(order.indexOf("t2")).toBe(order.indexOf("t4") + 1)
    expect(order.indexOf("t5")).toBe(order.indexOf("t2") + 1)
  })

  it("measures points with the engine (never negative)", () => {
    const [bridge] = derive([
      {
        type: "abrupt_drop",
        severity: "penalty",
        trackPositions: [4, 5],
        penaltyApplied: 1.2,
        penaltyCategory: null,
        delta: -5,
      },
    ])

    const base = scoreOrder(ids, ids, energies, "hard-techno", "main")
    const after = scoreOrder(
      deriveOrder(ids, [bridge], new Set([bridge.id])),
      ids,
      energies,
      "hard-techno",
      "main"
    )

    expect(bridge.points).toBe(Math.round(Math.max(0, after - base) * 10) / 10)
  })

  it("moves the strongest non-final track to the end for a weak ending", () => {
    // Ending curve where the last track sags below an earlier stronger one.
    const weakScores = [4, 5, 6, 9, 5]
    const weakEnergies = energiesOf(weakScores)
    const weakIds = idsOf(weakScores.length)

    const [ending] = deriveFixes({
      trackIds: weakIds,
      energies: weakEnergies,
      issues: [
        {
          type: "weak_ending",
          severity: "penalty",
          trackPositions: [5],
          penaltyApplied: 0.9,
          penaltyCategory: null,
        },
      ],
      targetCurve: [4, 5.5, 7, 8.5, 10],
      genre: "hard-techno",
      context: "main",
      baseScore: scoreOrder(weakIds, weakIds, weakEnergies, "hard-techno", "main"),
    })

    expect(ending.operations).toEqual([{ trackId: "t4", toIndex: 4 }])
  })

  it("collapses context_range into ONE fix with all offenders as chips", () => {
    const [rangeFix] = derive([
      {
        type: "context_range",
        severity: "penalty",
        trackPositions: [5, 1],
        penaltyApplied: 0.6,
        penaltyCategory: null,
      },
    ])

    expect(rangeFix.tracks.map((track) => track.position)).toEqual([5, 1])
  })

  it("keeps positives and advice-only issues without operations or points", () => {
    const fixes = derive([
      {
        type: "good_breather",
        severity: "positive",
        trackPositions: [5],
        penaltyApplied: 0,
        penaltyCategory: null,
        delta: -2,
      },
      {
        type: "set_too_short",
        severity: "info",
        trackPositions: [],
        penaltyApplied: 0,
        penaltyCategory: null,
      },
    ])

    for (const entry of fixes) {
      expect(entry.operations).toEqual([])
      expect(entry.points).toBe(0)
    }
    // No positions → marker anchors at 1 (set-level issue).
    expect(fixes[1].markerPosition).toBe(1)
  })

  it("produces stable ids so applied/discarded state survives re-derivation", () => {
    const issues: DetectedIssue[] = [
      {
        type: "abrupt_drop",
        severity: "penalty",
        trackPositions: [4, 5],
        penaltyApplied: 1.2,
        penaltyCategory: null,
        delta: -5,
      },
    ]

    expect(derive(issues)[0].id).toBe(derive(issues)[0].id)
    expect(derive(issues)[0].id).toBe("abrupt_drop-4.5")
  })
})
