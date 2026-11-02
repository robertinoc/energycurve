import { describe, expect, it } from "vitest"

import { SCORE_GAIN_FRESH_MS, scoreGain, type RecordedAnalysis } from "@/lib/product/score-gain"

const NOW = new Date("2026-11-02T12:00:00Z")

const current = {
  inputHash: "new",
  setScore: 7.1,
  curve: [3, 5, 7, 9, 6],
  genre: "house",
  context: "main",
  algorithmVersion: 4,
}

function row(overrides: Partial<RecordedAnalysis> = {}): RecordedAnalysis {
  return {
    inputHash: "old",
    setScore: 6.4,
    curve: [9, 3, 7, 5, 6],
    genre: "house",
    context: "main",
    algorithmVersion: 4,
    createdAt: "2026-11-01T12:00:00Z",
    ...overrides,
  }
}

describe("a re-analysis that raised the score", () => {
  it("is the moment itself on the render that records it", () => {
    expect(scoreGain(current, [row()], NOW)).toEqual({ from: 6.4, to: 7.1, fresh: true })
  })

  it("still holds on a refresh within the hour, compared with the row before", () => {
    const recorded = row({ inputHash: "new", setScore: 7.1, curve: current.curve, createdAt: "2026-11-02T11:30:00Z" })

    expect(scoreGain(current, [recorded, row()], NOW)).toEqual({ from: 6.4, to: 7.1, fresh: false })
  })

  it("is not news an hour later", () => {
    const createdAt = new Date(NOW.getTime() - SCORE_GAIN_FRESH_MS - 1000).toISOString()
    const recorded = row({ inputHash: "new", setScore: 7.1, curve: current.curve, createdAt })

    expect(scoreGain(current, [recorded, row()], NOW)).toBeNull()
  })
})

describe("what is not a gain the DJ made", () => {
  it("a first analysis has nothing to beat", () => {
    expect(scoreGain(current, [], NOW)).toBeNull()
  })

  it("equal or lower shows nothing", () => {
    expect(scoreGain(current, [row({ setScore: 7.1 })], NOW)).toBeNull()
    expect(scoreGain(current, [row({ setScore: 7.8 })], NOW)).toBeNull()
  })

  it("float noise is not a gain", () => {
    expect(scoreGain({ ...current, setScore: 6.4 + 1e-9 }, [row()], NOW)).toBeNull()
  })

  it("a rescoring release moved the number, not the DJ", () => {
    expect(scoreGain(current, [row({ algorithmVersion: 3 })], NOW)).toBeNull()
  })

  it("switching the genre or the context moved the number, not the set", () => {
    expect(scoreGain(current, [row({ genre: "techno" })], NOW)).toBeNull()
    expect(scoreGain(current, [row({ context: "warmup" })], NOW)).toBeNull()
  })

  it("the same curve under a new target shape is not a better set", () => {
    expect(scoreGain(current, [row({ curve: current.curve })], NOW)).toBeNull()
  })
})
