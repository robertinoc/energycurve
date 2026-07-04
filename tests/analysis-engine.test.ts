import { describe, expect, it } from "vitest"

import { analyzePlaylist, computeSetScore } from "@/lib/engine/analysis"

describe("analyzePlaylist", () => {
  it("scores a clean progressive main-time build as a perfect 10", () => {
    const analysis = analyzePlaylist({
      curve: [6, 7, 8, 9],
      genre: "techno",
      context: "main",
    })

    expect(analysis.issues.filter((i) => i.severity === "penalty")).toHaveLength(0)
    expect(analysis.setScore).toBe(10)
  })

  it("analyzes the strategy-doc example curve under main context", () => {
    const analysis = analyzePlaylist({
      curve: [3, 4, 5, 6, 7, 6, 8, 9],
      genre: "techno",
      context: "main",
    })

    // No adjacent delta reaches ±3, so no drops or spikes.
    expect(analysis.issues.some((i) => i.type === "abrupt_drop")).toBe(false)
    expect(analysis.issues.some((i) => i.type === "abrupt_spike")).toBe(false)
    // Tracks 1-3 (3, 4, 5) fall below main's 6-9 band → 3 context errors.
    const contextIssues = analysis.issues.filter(
      (i) => i.penaltyCategory === "context"
    )
    expect(contextIssues).toHaveLength(3)
    expect(analysis.breakdown.contextPenalty).toBe(6)
    expect(analysis.setScore).toBe(4)
  })

  it("detects flat zones of 3+ equal scores but not 2", () => {
    const flat = analyzePlaylist({
      curve: [5, 5, 5, 6],
      genre: "melodic-techno",
      context: "opening",
    })
    const flatIssue = flat.issues.find((i) => i.type === "flat_zone")

    expect(flatIssue).toBeDefined()
    expect(flatIssue?.trackPositions).toEqual([1, 2, 3])
    expect(flat.breakdown.flatZonePenalty).toBe(1)

    const notFlat = analyzePlaylist({
      curve: [5, 5, 6, 6],
      genre: "melodic-techno",
      context: "opening",
    })
    expect(notFlat.issues.some((i) => i.type === "flat_zone")).toBe(false)
  })

  it("penalizes drops only for genres with penalizeAbruptDrop", () => {
    const house = analyzePlaylist({
      curve: [8, 5, 6, 7],
      genre: "house",
      context: "main",
    })
    const houseDrop = house.issues.find((i) => i.type === "abrupt_drop")
    expect(houseDrop?.severity).toBe("penalty")
    expect(houseDrop?.penaltyApplied).toBe(1)

    const melodic = analyzePlaylist({
      curve: [8, 5, 6, 7],
      genre: "melodic-techno",
      context: "main",
    })
    const melodicDrop = melodic.issues.find((i) => i.type === "abrupt_drop")
    expect(melodicDrop?.severity).toBe("info")
    expect(melodicDrop?.penaltyApplied).toBe(0)
  })

  it("counts spikes as genre errors only for gradual-progression genres", () => {
    const house = analyzePlaylist({
      curve: [6, 9, 8, 7],
      genre: "house",
      context: "main",
    })
    const houseSpike = house.issues.find((i) => i.type === "abrupt_spike")
    expect(houseSpike?.penaltyCategory).toBe("genre")
    expect(house.breakdown.genrePenalty).toBeGreaterThanOrEqual(1)

    const techno = analyzePlaylist({
      curve: [6, 9, 8, 7],
      genre: "techno",
      context: "main",
    })
    const technoSpike = techno.issues.find((i) => i.type === "abrupt_spike")
    expect(technoSpike?.severity).toBe("info")
    expect(technoSpike?.penaltyApplied).toBe(0)
  })

  it("flags early peaks and penalizes them only for progressive", () => {
    const progressive = analyzePlaylist({
      curve: [8, 6, 6.5, 7, 7.5],
      genre: "progressive",
      context: "main",
    })
    const progressivePeak = progressive.issues.find(
      (i) => i.type === "early_peak"
    )
    expect(progressivePeak?.severity).toBe("penalty")
    expect(progressivePeak?.penaltyCategory).toBe("genre")
    expect(progressivePeak?.trackPositions).toEqual([1])

    const techno = analyzePlaylist({
      curve: [8, 6, 6.5, 7, 7.5],
      genre: "techno",
      context: "main",
    })
    const technoPeak = techno.issues.find((i) => i.type === "early_peak")
    expect(technoPeak?.severity).toBe("info")
  })

  it("does not flag a peak outside the first third", () => {
    const analysis = analyzePlaylist({
      curve: [6, 6.5, 7, 9],
      genre: "progressive",
      context: "main",
    })

    expect(analysis.issues.some((i) => i.type === "early_peak")).toBe(false)
  })

  it("labels disallowed high peaks in opening context", () => {
    const analysis = analyzePlaylist({
      curve: [4, 8, 5, 6],
      genre: "techno",
      context: "opening",
    })

    const highPeak = analysis.issues.find(
      (i) => i.type === "context_high_peak"
    )
    expect(highPeak?.trackPositions).toEqual([2])
    expect(highPeak?.penaltyApplied).toBe(2)
    // The same track contributes exactly one context error.
    const trackTwoContextIssues = analysis.issues.filter(
      (i) => i.penaltyCategory === "context" && i.trackPositions.includes(2)
    )
    expect(trackTwoContextIssues).toHaveLength(1)
  })

  it("dedupes weak ending with the final track's context violation", () => {
    const analysis = analyzePlaylist({
      curve: [7, 8, 6],
      genre: "techno",
      context: "closing",
    })

    // Track 3 (energy 6) is below closing's 7-9 band → one context error.
    // The weak ending must stay visible but add no second penalty.
    const weakEnding = analysis.issues.find((i) => i.type === "weak_ending")
    expect(weakEnding).toBeDefined()
    expect(weakEnding?.severity).toBe("info")
    expect(weakEnding?.penaltyApplied).toBe(0)
    expect(analysis.breakdown.contextPenalty).toBe(2)
    expect(analysis.setScore).toBe(8)
  })

  it("penalizes a weak ending that is inside the context band", () => {
    // Main context: threshold is max(5, 6) = 6... a last track of 6 is not
    // weak. Opening: threshold max(5, 3) = 5, so a last track at 4 inside
    // 3-6 is weak without being out of range.
    const analysis = analyzePlaylist({
      curve: [3, 5, 6, 4],
      genre: "techno",
      context: "opening",
    })

    const weakEnding = analysis.issues.find((i) => i.type === "weak_ending")
    expect(weakEnding?.severity).toBe("penalty")
    expect(weakEnding?.penaltyApplied).toBe(2)
  })

  it("emits informational no-progression and too-many-rests hints", () => {
    const analysis = analyzePlaylist({
      curve: [8, 6, 8, 6, 8, 6],
      genre: "melodic-techno",
      context: "main",
    })

    const noProgression = analysis.issues.find(
      (i) => i.type === "no_progression"
    )
    expect(noProgression?.severity).toBe("info")

    const rests = analysis.issues.find((i) => i.type === "too_many_rests")
    expect(rests?.severity).toBe("info")
    expect(rests?.trackPositions).toEqual([2, 4, 6])
  })

  it("clamps the final score at 1", () => {
    const analysis = analyzePlaylist({
      curve: [9, 9, 9, 9, 9, 9],
      genre: "techno",
      context: "opening",
    })

    expect(analysis.breakdown.rawScore).toBeLessThan(1)
    expect(analysis.setScore).toBe(1)
  })

  it("scores the same curve under all contexts and picks the best fit", () => {
    const analysis = analyzePlaylist({
      curve: [6, 7, 8, 9],
      genre: "techno",
      context: "opening",
    })

    expect(analysis.contextScores.main).toBe(10)
    expect(analysis.contextScores.main).toBeGreaterThan(
      analysis.contextScores.opening
    )
    expect(analysis.bestFitContext).toBe("main")
  })
})

describe("computeSetScore", () => {
  it("returns a full-score breakdown with no issues", () => {
    const breakdown = computeSetScore([])

    expect(breakdown).toMatchObject({
      startingScore: 10,
      dropPenalty: 0,
      flatZonePenalty: 0,
      contextPenalty: 0,
      genrePenalty: 0,
      rawScore: 10,
      finalScore: 10,
    })
  })
})
