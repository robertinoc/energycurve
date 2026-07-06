import { describe, expect, it } from "vitest"

import {
  energyScoreFromBpm,
  estimatedScoreFromPosition,
  estimateSetDurationMinutes,
  resolveTrackEnergies,
} from "@/lib/engine/energy-score"

describe("energyScoreFromBpm", () => {
  it("interpolates linearly inside each band and hits band edges", () => {
    // Band 1 (<115 → 3-4), anchored at 105.
    expect(energyScoreFromBpm(114.99)).toBe(4)
    // Band 2 (115-122 → 4-5).
    expect(energyScoreFromBpm(115)).toBe(4)
    expect(energyScoreFromBpm(122)).toBe(5)
    // Band 3 (122.01-128 → 5-7).
    expect(energyScoreFromBpm(122.01)).toBe(5)
    expect(energyScoreFromBpm(128)).toBe(7)
    // Band 4 (128.01-135 → 6-8).
    expect(energyScoreFromBpm(128.01)).toBe(6)
    expect(energyScoreFromBpm(135)).toBe(8)
    // Band 5 (135.01+ → 7-10), anchored at 150.
    expect(energyScoreFromBpm(135.01)).toBe(7)
    expect(energyScoreFromBpm(150)).toBe(10)
  })

  it("clamps outside the open band anchors", () => {
    expect(energyScoreFromBpm(90)).toBe(3)
    expect(energyScoreFromBpm(160)).toBe(10)
  })

  it("rounds to one decimal", () => {
    // 125 in band 3: t = (125 - 122.01) / 5.99 ≈ 0.4992 → 5.998 → 6.0
    expect(energyScoreFromBpm(125)).toBe(6)
    // 118.5 in band 2: t = 0.5 → 4.5
    expect(energyScoreFromBpm(118.5)).toBe(4.5)
  })

  it("routes BPM in a band gap to the lower band", () => {
    // 122.005 sits between band 2 (max 122) and band 3 (min 122.01).
    expect(energyScoreFromBpm(122.005)).toBe(5)
  })
})

describe("energyScoreFromBpm — genre-relative (B1)", () => {
  it("maps the same BPM differently per genre", () => {
    // 126 BPM: peak-time house, warm-up hard techno.
    expect(energyScoreFromBpm(126, "house")).toBeGreaterThanOrEqual(7.5)
    expect(energyScoreFromBpm(126, "hard-techno")).toBeLessThanOrEqual(3)
  })

  it("interpolates 3 → 9 across the genre band", () => {
    // House band 118–128.
    expect(energyScoreFromBpm(118, "house")).toBe(3)
    expect(energyScoreFromBpm(123, "house")).toBe(6)
    expect(energyScoreFromBpm(128, "house")).toBe(9)
  })

  it("keeps sliding toward the extremes outside the band, then clamps", () => {
    expect(energyScoreFromBpm(133, "house")).toBe(9.5)
    expect(energyScoreFromBpm(138, "house")).toBe(10)
    expect(energyScoreFromBpm(200, "house")).toBe(10)
    expect(energyScoreFromBpm(113, "house")).toBe(2)
    expect(energyScoreFromBpm(90, "house")).toBe(1)
  })

  it("falls back to the universal V1 bands without a genre", () => {
    expect(energyScoreFromBpm(128)).toBe(energyScoreFromBpm(128, null))
    expect(energyScoreFromBpm(128)).toBe(7)
  })
})

describe("estimatedScoreFromPosition", () => {
  it("ramps across the context expected range", () => {
    expect(estimatedScoreFromPosition(0, 5, "opening")).toBe(3)
    expect(estimatedScoreFromPosition(4, 5, "opening")).toBe(6)
    expect(estimatedScoreFromPosition(2, 5, "opening")).toBe(4.5)
    expect(estimatedScoreFromPosition(0, 3, "main")).toBe(6)
    expect(estimatedScoreFromPosition(2, 3, "main")).toBe(9)
  })

  it("uses the midpoint for a single track", () => {
    expect(estimatedScoreFromPosition(0, 1, "opening")).toBe(4.5)
  })

  it("falls back to 4-8 without a context", () => {
    expect(estimatedScoreFromPosition(0, 2, null)).toBe(4)
    expect(estimatedScoreFromPosition(1, 2, null)).toBe(8)
  })
})

describe("resolveTrackEnergies", () => {
  it("uses the genre-relative mapping when a genre is provided", () => {
    const resolved = resolveTrackEnergies(
      [{ id: "a", position: 1, bpm: 128, energy_score: null }],
      "main",
      "house"
    )

    expect(resolved[0]).toMatchObject({ score: 9, source: "bpm" })
  })

  it("applies precedence manual > bpm > estimated", () => {
    const resolved = resolveTrackEnergies(
      [
        { id: "a", position: 1, bpm: 128, energy_score: 9 },
        { id: "b", position: 2, bpm: 128, energy_score: null },
        { id: "c", position: 3, bpm: null, energy_score: null },
      ],
      "main"
    )

    expect(resolved[0]).toMatchObject({ score: 9, source: "manual" })
    expect(resolved[1]).toMatchObject({ score: 7, source: "bpm" })
    expect(resolved[2]).toMatchObject({ score: 9, source: "estimated" })
  })

  it("clamps manual scores into the 1-10 range", () => {
    const resolved = resolveTrackEnergies(
      [{ id: "a", position: 1, bpm: null, energy_score: 15 }],
      null
    )

    expect(resolved[0]).toMatchObject({ score: 10, source: "manual" })
  })

  it("keeps playlist order and positions", () => {
    const resolved = resolveTrackEnergies(
      [
        { id: "a", position: 1, bpm: 120, energy_score: null },
        { id: "b", position: 2, bpm: 130, energy_score: null },
      ],
      "main"
    )

    expect(resolved.map((entry) => entry.position)).toEqual([1, 2])
    expect(resolved.map((entry) => entry.trackId)).toEqual(["a", "b"])
  })
})

describe("estimateSetDurationMinutes", () => {
  it("multiplies track count by the standard duration", () => {
    expect(estimateSetDurationMinutes(0)).toBe(0)
    expect(estimateSetDurationMinutes(10)).toBe(30)
  })
})
