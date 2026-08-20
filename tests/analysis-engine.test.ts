import { describe, expect, it } from "vitest"

import { analyzePlaylist, computeSetScore } from "@/lib/engine/analysis"
import { resolveSlot } from "@/lib/engine/slot"
import { buildTargetCurve } from "@/lib/engine/target-curve"
import type { TrackEnergyMeta } from "@/types/analysis"

describe("analyzePlaylist — V2 scoring", () => {
  it("scores a set that rides its ideal curve at 10 with no penalties", () => {
    const curve = buildTargetCurve(12, "opening", "house")
    const analysis = analyzePlaylist({ curve, genre: "house", context: "opening" })

    expect(analysis.setScore).toBe(10)
    expect(analysis.breakdown.shapeFit).toBe(10)
    expect(analysis.breakdown.dynamicsQuality).toBe(10)
    expect(analysis.breakdown.endingQuality).toBe(10)
    expect(
      analysis.issues.filter((issue) => issue.severity === "penalty")
    ).toEqual([])
  })

  it("exposes the target curve and a breakdown whose weights sum to 1", () => {
    const curve = [6, 7, 8, 9, 9, 8.8]
    const analysis = analyzePlaylist({ curve, genre: "techno", context: "main" })

    expect(analysis.targetCurve).toHaveLength(curve.length)
    const { weights } = analysis.breakdown
    expect(weights.shape + weights.dynamics + weights.ending).toBeCloseTo(1)
    expect(analysis.breakdown.finalScore).toBe(analysis.setScore)
  })

  it("penalizes a cliff drop proportionally and reports it", () => {
    const clean = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9, 9, 9, 9, 9]
    const withCliff = [...clean]
    withCliff[5] = 4.5 // 8 → 4.5 is a −3.5 cliff, then a +4.5 spike back

    const cleanScore = computeSetScore(clean, "house", "main")
    const cliffScore = computeSetScore(withCliff, "house", "main")

    expect(cliffScore).toBeLessThan(cleanScore - 1)

    const analysis = analyzePlaylist({
      curve: withCliff,
      genre: "house",
      context: "main",
    })
    expect(analysis.issues.some((issue) => issue.type === "abrupt_drop")).toBe(
      true
    )
  })

  it("does not penalize jumps within the genre tolerance", () => {
    // Δ+3 is comfortable for melodic-techno (rise tolerance 3)...
    const melodic = analyzePlaylist({
      curve: [6, 9, 9.2, 8.9, 9.2, 9],
      genre: "melodic-techno",
      context: "main",
    })
    expect(
      melodic.issues.filter((issue) => issue.type === "abrupt_spike")
    ).toEqual([])

    // ...but exceeds progressive's rise tolerance of 1.5.
    const progressive = analyzePlaylist({
      curve: [6, 9, 9.2, 8.9, 9.2, 9],
      genre: "progressive",
      context: "main",
    })
    expect(
      progressive.issues.some((issue) => issue.type === "abrupt_spike")
    ).toBe(true)
  })

  it("treats a controlled post-peak step down as a breather, not a flaw", () => {
    const withBreather = [6, 7, 8, 8.5, 9, 6.5, 7.5, 8.5, 9, 9.2, 8.9, 9.2]
    const analysis = analyzePlaylist({
      curve: withBreather,
      genre: "house",
      context: "main",
    })

    const breather = analysis.issues.find(
      (issue) => issue.type === "good_breather"
    )
    expect(breather).toBeDefined()
    expect(breather?.severity).toBe("positive")
    expect(breather?.penaltyApplied).toBe(0)
    expect(
      analysis.issues.some((issue) => issue.type === "abrupt_drop")
    ).toBe(false)
    // A single breather is not "too many rests".
    expect(
      analysis.issues.some((issue) => issue.type === "too_many_rests")
    ).toBe(false)
  })

  it("does not extend the breather exception to real crashes", () => {
    // −4.5 down to 4.5 after a peak is a cliff, not a breather.
    const curve = [6, 7, 8, 8.5, 9, 4.5, 7.5, 8.5, 9, 9.2, 8.9, 9.2]
    const analysis = analyzePlaylist({ curve, genre: "house", context: "main" })

    expect(analysis.issues.some((issue) => issue.type === "abrupt_drop")).toBe(
      true
    )
    expect(
      analysis.issues.some((issue) => issue.type === "good_breather")
    ).toBe(false)
  })

  it("flags near-flat zones without requiring exact equality", () => {
    const curve = [6, 6.1, 6, 6.2, 6.1, 6, 6.1, 6, 6.2, 6.1, 6, 6.1]
    const analysis = analyzePlaylist({ curve, genre: "house", context: "main" })

    expect(analysis.issues.some((issue) => issue.type === "flat_zone")).toBe(
      true
    )
  })

  it("exempts a plateau that rides the target's own plateau", () => {
    // Hard-techno main target ramps 7 → 9.5 then holds; a set sitting on
    // that plateau is craft, not monotony.
    const curve = buildTargetCurve(12, "main", "hard-techno")
    const analysis = analyzePlaylist({
      curve,
      genre: "hard-techno",
      context: "main",
    })

    expect(analysis.issues.some((issue) => issue.type === "flat_zone")).toBe(
      false
    )
    expect(analysis.setScore).toBe(10)
  })

  it("reports a missing climax when the set never approaches the target peak", () => {
    const curve = [6, 6.1, 6, 6.2, 6.1, 6, 6.1, 6, 6.2, 6.1, 6, 6.1]
    const analysis = analyzePlaylist({ curve, genre: "house", context: "main" })

    const noClimax = analysis.issues.find(
      (issue) => issue.type === "no_climax"
    )
    expect(noClimax).toBeDefined()
    expect(noClimax?.severity).toBe("penalty")
    expect(noClimax?.penaltyApplied).toBeGreaterThan(0)
  })

  it("derives a weak ending proportionally instead of a fixed −2", () => {
    const curve = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9, 9, 8, 6, 5]
    const analysis = analyzePlaylist({ curve, genre: "techno", context: "main" })

    const weakEnding = analysis.issues.find(
      (issue) => issue.type === "weak_ending"
    )
    expect(weakEnding).toBeDefined()
    expect(weakEnding?.trackPositions).toEqual([curve.length])
    expect(analysis.breakdown.endingQuality).toBeLessThan(8.5)
  })

  it("marks an early peak as penalty for slow-build genres and info otherwise", () => {
    // 9.5 at position 2 is the set's max, inside the first third.
    const curve = [5.5, 9.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.2, 8.9, 9.2]

    const progressive = analyzePlaylist({
      curve,
      genre: "progressive",
      context: "main",
    })
    const progressiveEarlyPeak = progressive.issues.find(
      (issue) => issue.type === "early_peak"
    )
    expect(progressiveEarlyPeak?.severity).toBe("penalty")

    const techno = analyzePlaylist({ curve, genre: "techno", context: "main" })
    const technoEarlyPeak = techno.issues.find(
      (issue) => issue.type === "early_peak"
    )
    expect(technoEarlyPeak?.severity).toBe("info")
    expect(technoEarlyPeak?.penaltyApplied).toBe(0)
  })

  it("keeps duration hints informational", () => {
    const shortSet = analyzePlaylist({
      curve: [3, 4, 5, 6],
      genre: "house",
      context: "opening",
    })
    const shortHint = shortSet.issues.find(
      (issue) => issue.type === "set_too_short"
    )
    expect(shortHint?.severity).toBe("info")
    expect(shortHint?.penaltyApplied).toBe(0)

    const longSet = analyzePlaylist({
      curve: Array.from({ length: 51 }, (_, i) => 6 + (i % 3) * 0.5),
      genre: "house",
      context: "main",
    })
    expect(longSet.issues.some((issue) => issue.type === "set_too_long")).toBe(
      true
    )
  })

  it("never scores below 1 even for a disastrous set", () => {
    const curve = [9, 2, 9, 2, 9, 2, 9, 2, 9, 2, 9, 2]
    const score = computeSetScore(curve, "trance", "opening")

    expect(score).toBeGreaterThanOrEqual(1)
    expect(score).toBeLessThanOrEqual(10)
  })

  it("scores the same curve under all contexts and picks the best fit", () => {
    const openingRamp = buildTargetCurve(12, "opening", "house")
    const analysis = analyzePlaylist({
      curve: openingRamp,
      genre: "house",
      context: "main",
    })

    expect(Object.keys(analysis.contextScores).sort()).toEqual([
      "closing",
      "main",
      "opening",
    ])
    expect(analysis.bestFitContext).toBe("opening")
    expect(analysis.contextScores.opening).toBeGreaterThan(
      analysis.contextScores.main
    )
  })

  it("suppresses flat zones that BPM-only data can't support (B13)", () => {
    // All energies derived from near-identical BPMs: identical values prove
    // nothing about real monotony, so no flat_zone penalty — instead a
    // low_energy_confidence heads-up.
    const curve = [9.1, 9.1, 9.2, 9.1, 9.1, 9.2, 9.1, 9.1, 9.2, 9.1, 9.1, 9.2]
    const trackMeta: TrackEnergyMeta[] = curve.map((_, i) => ({
      source: "bpm",
      bpm: 158 + (i % 3),
    }))

    const withMeta = analyzePlaylist({
      curve,
      genre: "hard-techno",
      context: "main",
      trackMeta,
    })

    expect(withMeta.issues.some((issue) => issue.type === "flat_zone")).toBe(
      false
    )
    expect(
      withMeta.issues.some((issue) => issue.type === "low_energy_confidence")
    ).toBe(true)

    // Without meta (or with manual energies) the same curve is judged as-is.
    const withoutMeta = analyzePlaylist({
      curve,
      genre: "hard-techno",
      context: "main",
    })
    expect(
      withoutMeta.issues.some(
        (issue) => issue.type === "low_energy_confidence"
      )
    ).toBe(false)
  })

  it("does not suppress flat zones backed by manual energies", () => {
    const curve = [6, 6.1, 6, 6.2, 6.1, 6, 6.1, 6, 6.2, 6.1, 6, 6.1]
    const trackMeta: TrackEnergyMeta[] = curve.map(() => ({
      source: "manual",
      bpm: null,
    }))

    const analysis = analyzePlaylist({
      curve,
      genre: "house",
      context: "main",
      trackMeta,
    })

    expect(analysis.issues.some((issue) => issue.type === "flat_zone")).toBe(
      true
    )
    expect(
      analysis.issues.some((issue) => issue.type === "low_energy_confidence")
    ).toBe(false)
  })

  it("suppresses no_climax when the whole curve is low-confidence BPM data", () => {
    const curve = Array.from({ length: 12 }, () => 6.5)
    const trackMeta: TrackEnergyMeta[] = curve.map(() => ({
      source: "bpm",
      bpm: 124,
    }))

    const suppressed = analyzePlaylist({
      curve,
      genre: "house",
      context: "main",
      trackMeta,
    })
    expect(
      suppressed.issues.some((issue) => issue.type === "no_climax")
    ).toBe(false)

    const judged = analyzePlaylist({ curve, genre: "house", context: "main" })
    expect(judged.issues.some((issue) => issue.type === "no_climax")).toBe(
      true
    )
    // Suppression is worth points: the low-confidence read scores higher.
    expect(suppressed.setScore).toBeGreaterThan(judged.setScore)
  })

  it("orders issues penalty-first and attributes traceable point costs", () => {
    const curve = [6, 6.5, 7, 7.5, 8, 4, 7.5, 8, 8.5, 9, 9.2, 8.9]
    const analysis = analyzePlaylist({ curve, genre: "house", context: "main" })

    const severities = analysis.issues.map((issue) => issue.severity)
    const firstInfo = severities.indexOf("info")
    const lastPenalty = severities.lastIndexOf("penalty")
    if (firstInfo !== -1 && lastPenalty !== -1) {
      expect(lastPenalty).toBeLessThan(firstInfo)
    }

    const attributed = analysis.issues.reduce(
      (sum, issue) => sum + issue.penaltyApplied,
      0
    )
    const lost = 10 - analysis.setScore

    // Attribution is an explanation layer: meaningful, and in the same
    // ballpark as the actual points lost (rounding gives it slack).
    expect(attributed).toBeGreaterThan(0)
    expect(attributed).toBeLessThanOrEqual(lost + 1.5)
  })
})

describe("analyzePlaylist — slot awareness", () => {
  /** A curve with an early maximum: the warm-up failure this feature exists for. */
  const EARLY_PEAK = [4, 10, 5, 5, 4, 4, 4, 4, 4, 4]

  it("reports a mistimed peak as advice that costs the set nothing", () => {
    // The whole point of severity "info" here: an identical set with no slot
    // declared would otherwise outscore one that filled the field in, which
    // punishes the user for giving us more information.
    const withoutSlot = analyzePlaylist({
      curve: EARLY_PEAK,
      genre: "house",
      context: "opening",
    })
    const withSlot = analyzePlaylist({
      curve: EARLY_PEAK,
      genre: "house",
      context: "opening",
      slot: resolveSlot(60, 180),
    })

    expect(withSlot.setScore).toBe(withoutSlot.setScore)

    const timing = withSlot.issues.find(
      (issue) => issue.type === "peak_too_early_for_slot"
    )
    expect(timing?.severity).toBe("info")
    expect(timing?.penaltyApplied).toBe(0)
    expect(timing?.trackPositions).toEqual([2])
  })

  it("says nothing about timing when the peak lands where it should", () => {
    const analysis = analyzePlaylist({
      curve: [4, 5, 5, 6, 6, 7, 8, 10, 8, 6],
      genre: "house",
      context: "main",
      slot: resolveSlot(60, 180),
    })

    expect(
      analysis.issues.filter((issue) => issue.type.endsWith("_for_slot"))
    ).toEqual([])
    expect(analysis.slot?.verdict).toBe("well_placed")
  })

  it("carries no slot assessment when the DJ never declared one", () => {
    const analysis = analyzePlaylist({
      curve: EARLY_PEAK,
      genre: "house",
      context: "opening",
    })

    expect(analysis.slot).toBeNull()
    expect(
      analysis.issues.some((issue) => issue.type.endsWith("_for_slot"))
    ).toBe(false)
  })
})

describe("set length from real track durations", () => {
  /** A gentle 20-track ramp: no curve problems, so only length advice can fire. */
  const curve = Array.from({ length: 20 }, (_, i) => 6 + (i / 19) * 3)
  const seconds = (each: number) => curve.map(() => each)

  it("stops calling a long set short because the tracks aren't 3 minutes", () => {
    // 20 × 7 min = 140 minutes of music. The old guess (20 × 3 = 60) put this
    // under the 45-minute floor's neighbour and fired "short set" at exactly the
    // DJs whose tracks are longest.
    const analysis = analyzePlaylist({
      curve,
      genre: "progressive",
      context: "main",
      durationsSeconds: seconds(7 * 60),
    })

    expect(analysis.timing.totalMinutes).toBe(140)
    expect(analysis.timing.measured).toBe(true)
    expect(analysis.issues.some((issue) => issue.type === "set_too_short")).toBe(
      false
    )
  })

  it("still warns on a set that really is short", () => {
    const analysis = analyzePlaylist({
      curve: curve.slice(0, 8),
      genre: "house",
      context: "opening",
      durationsSeconds: Array(8).fill(3 * 60),
    })

    expect(analysis.timing.totalMinutes).toBe(24)
    expect(analysis.issues.some((issue) => issue.type === "set_too_short")).toBe(
      true
    )
  })

  it("falls back to the estimate when no durations are supplied", () => {
    // Every set imported before durations were read. Behaviour must not change.
    const analysis = analyzePlaylist({ curve, genre: "house", context: "main" })

    expect(analysis.timing.measured).toBe(false)
    expect(analysis.timing.totalMinutes).toBe(60)
  })

  it("measures against the declared slot instead of the generic guideline", () => {
    // 140 minutes of music, 240-minute slot: a full 100 minutes short. The generic
    // pair would have said nothing — 140 sits inside 45–150.
    const analysis = analyzePlaylist({
      curve,
      genre: "progressive",
      context: "main",
      durationsSeconds: seconds(7 * 60),
      slot: resolveSlot(60, 300),
    })

    expect(analysis.slotFit?.verdict).toBe("short")
    expect(analysis.issues.some((i) => i.type === "set_short_for_slot")).toBe(true)
    // Only one of the two pairs fires, so the DJ isn't told the same thing twice
    // against two different reference points.
    expect(analysis.issues.some((i) => i.type === "set_too_short")).toBe(false)
    expect(analysis.issues.some((i) => i.type === "set_too_long")).toBe(false)
  })

  it("flags more music than slot without calling it a problem", () => {
    const analysis = analyzePlaylist({
      curve,
      genre: "techno",
      context: "main",
      durationsSeconds: seconds(7 * 60),
      slot: resolveSlot(60, 150), // 90-minute slot, 140 minutes of music
    })

    expect(analysis.issues.some((i) => i.type === "set_over_slot")).toBe(true)
    // Informational: timing is a separate axis and must not move the score.
    expect(
      analysis.issues.find((i) => i.type === "set_over_slot")!.penaltyApplied
    ).toBe(0)
  })

  it("says nothing about fit when the length is only estimated", () => {
    // No durations + a slot. Answering here would be a guess wearing a number, on
    // a question someone acts on before a booking.
    const analysis = analyzePlaylist({
      curve,
      genre: "house",
      context: "main",
      slot: resolveSlot(60, 180),
    })

    expect(analysis.slotFit).toBeNull()
    expect(analysis.issues.some((i) => i.type.startsWith("set_"))).toBe(false)
  })
})
