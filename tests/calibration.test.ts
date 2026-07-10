import { describe, expect, it } from "vitest"

import { analyzePlaylist, computeSetScore } from "@/lib/engine/analysis"
import { resolveTrackEnergies } from "@/lib/engine/energy-score"
import { buildTargetCurve } from "@/lib/engine/target-curve"
import { detectGenres } from "@/lib/playlists/parse-import"
import type { ImportedTrack } from "@/lib/playlists/imported-track"

/**
 * Product-level score invariants (V2 calibration). These assert RANGES, not
 * exact numbers, so the constants in strategy.ts can be tuned without
 * rewriting tests — as long as the product promises hold:
 * beginner-friendly scores for decent sets, clear separation for real flaws.
 */
describe("V2 score calibration", () => {
  it("a clean progressive main-time build scores at least 8.5", () => {
    const curve = [6, 6.4, 6.8, 7.1, 7.5, 7.9, 8.2, 8.6, 9, 9, 9, 8.8]

    expect(computeSetScore(curve, "progressive", "main")).toBeGreaterThanOrEqual(
      8.5
    )
  })

  it("a hard-techno set holding a high plateau is rewarded, not punished", () => {
    const curve = [7, 7.5, 8, 8.5, 9, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5, 9.5]

    expect(
      computeSetScore(curve, "hard-techno", "main")
    ).toBeGreaterThanOrEqual(8)
  })

  it("an opening that ramps 3 → 6 scores at least 8.5", () => {
    const curve = buildTargetCurve(12, "opening", "house")

    expect(computeSetScore(curve, "house", "opening")).toBeGreaterThanOrEqual(
      8.5
    )
  })

  it("an opening that overshoots to 9 is penalized but not destroyed", () => {
    const curve = [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.8, 8.5, 9]
    const score = computeSetScore(curve, "house", "opening")
    const cleanScore = computeSetScore(
      buildTargetCurve(12, "opening", "house"),
      "house",
      "opening"
    )

    expect(score).toBeLessThan(cleanScore)
    expect(score).toBeGreaterThanOrEqual(5)
  })

  it("a mid-set cliff clearly costs points versus the same set without it", () => {
    const clean = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.2, 8.9, 9.2, 9, 9.1]
    const withCliff = [...clean]
    withCliff[6] = 5 // 8.5 → 5 without a preceding sustained peak

    const cleanScore = computeSetScore(clean, "house", "main")
    const cliffScore = computeSetScore(withCliff, "house", "main")

    expect(cliffScore).toBeLessThanOrEqual(cleanScore - 1)
  })

  it("a post-peak breather never scores worse than grinding flat at the top", () => {
    const withBreather = [6, 7, 8, 9, 9.2, 6.5, 7.5, 8.5, 9, 9.2, 9, 9.2]
    const withoutBreather = [6, 7, 8, 9, 9.2, 9, 9.1, 9, 9.2, 9, 9.1, 9.2]

    expect(
      computeSetScore(withBreather, "house", "main")
    ).toBeGreaterThanOrEqual(computeSetScore(withoutBreather, "house", "main") - 0.3)
  })

  it("a completely flat set scores 4 or less", () => {
    const curve = Array.from({ length: 12 }, () => 6)

    expect(computeSetScore(curve, "house", "main")).toBeLessThanOrEqual(4)
  })

  it("scores are length-invariant for equally good patterns", () => {
    const short = buildTargetCurve(12, "main", "house")
    const long = buildTargetCurve(24, "main", "house")

    const shortScore = computeSetScore(short, "house", "main")
    const longScore = computeSetScore(long, "house", "main")

    expect(Math.abs(shortScore - longScore)).toBeLessThanOrEqual(0.5)
  })

  it("scores a real hard-techno NML import fairly end-to-end (V3 regression)", () => {
    // Modeled on the first real production import ("ENJOY THE HARD #7"):
    // 21 tracks, BPMs 155–160, no Mixed In Key energies, Beatport-style
    // genre tags. V2 detected "techno", clamped every energy to 10, and
    // punished the flat artifact down to 5.5.
    const spec: Array<[number, string | null]> = [
      [155, "Psy-Trance"],
      [160, "Techno (Peak Time / Driving)"],
      [160, "Techno (Peak Time / Driving)"],
      [160, "Hard Techno"],
      [155, "Techno (Peak Time / Driving)"],
      [156, "Techno (Peak Time / Driving)"],
      [160, "Techno (Peak Time / Driving)"],
      [160, "Hard Techno"],
      [160, "Techno (Peak Time / Driving)"],
      [155, null],
      [155, "Techno (Peak Time / Driving)"],
      [155, "Techno (Peak Time / Driving)"],
      [160, "Hard Techno"],
      [158, "Techno (Peak Time / Driving)"],
      [156, "Techno (Peak Time / Driving)"],
      [160, "Techno (Peak Time / Driving)"],
      [155, "Techno (Peak Time / Driving)"],
      [160, "Hard Techno"],
      [158, "Techno (Peak Time / Driving)"],
      [160, "Techno (Peak Time / Driving)"],
      [155, "Techno (Peak Time / Driving)"],
    ]

    const imported: ImportedTrack[] = spec.map(([bpm, genre], index) => ({
      artist: `Artist ${index + 1}`,
      name: `Track ${index + 1}`,
      bpm,
      key: null,
      genre,
      energy: null,
      sourceUri: null,
      comment: null,
      durationSeconds: null,
    }))

    // 1. Genre detection: BPMs at 155–160 overrule the plain-techno tags.
    const { dominant } = detectGenres(imported)
    expect(dominant).toBe("hard-techno")

    // 2. Energy resolution: no more everything-at-10 flat line.
    const energies = resolveTrackEnergies(
      imported.map((track, index) => ({
        id: String(index + 1),
        position: index + 1,
        bpm: track.bpm,
        energy_score: null,
        genre: track.genre,
      })),
      "main",
      dominant
    )
    const scores = energies.map((entry) => entry.score)

    expect(scores.some((score) => score !== 10)).toBe(true)
    expect(Math.max(...scores) - Math.min(...scores)).toBeGreaterThan(0.5)

    // 3. Analysis: an honest score with a confidence heads-up instead of
    // penalties for artifacts the data can't support.
    const analysis = analyzePlaylist({
      curve: scores,
      genre: dominant!,
      context: "main",
      trackMeta: energies.map((entry) => ({
        source: entry.source,
        bpm: entry.bpm,
      })),
    })

    expect(analysis.setScore).toBeGreaterThanOrEqual(7.5)
    expect(
      analysis.issues.filter(
        (issue) => issue.type === "flat_zone" && issue.severity === "penalty"
      )
    ).toEqual([])
    expect(
      analysis.issues.some((issue) => issue.type === "low_energy_confidence")
    ).toBe(true)
  })

  it("a realistic imperfect-but-decent set lands in the encouraging middle", () => {
    // Slightly wavy build with one soft spot — the kind of set a beginner
    // uploads. V1 scored these 1–3/10; V2 should encourage, not punish.
    const curve = [5.5, 6.5, 6, 7, 7.5, 6.8, 8, 8.5, 8, 9, 8.5, 9]
    const score = computeSetScore(curve, "house", "main")

    expect(score).toBeGreaterThanOrEqual(6)
    expect(score).toBeLessThan(10)
  })
})
