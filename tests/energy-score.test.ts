import { describe, expect, it } from "vitest"

import {
  correctBpmTagForGenre,
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
    // 20-BPM edge ramp (B14): out-of-band BPMs keep differentiating instead
    // of collapsing to the same clamped value.
    expect(energyScoreFromBpm(133, "house")).toBe(9.3)
    expect(energyScoreFromBpm(138, "house")).toBe(9.5)
    expect(energyScoreFromBpm(148, "house")).toBe(10)
    expect(energyScoreFromBpm(200, "house")).toBe(10)
    expect(energyScoreFromBpm(113, "house")).toBe(2.5)
    expect(energyScoreFromBpm(90, "house")).toBe(1)
  })

  it("differentiates nearby BPMs even under a wrong genre band (B14)", () => {
    // 155 vs 160 with the (mis-detected) techno band 125–140: both are far
    // above the band, but they must not both clamp to 10.
    expect(energyScoreFromBpm(155, "techno")).not.toBe(
      energyScoreFromBpm(160, "techno")
    )
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

    expect(resolved[0]).toMatchObject({ score: 9, source: "bpm", bpm: 128 })
  })

  it("anchors a track to its own genre tag over the playlist genre (B14)", () => {
    const resolved = resolveTrackEnergies(
      [
        // Psy-trance track inside a hard-techno set: judged on its own band.
        { id: "a", position: 1, bpm: 146, energy_score: null, genre: "Psy-Trance" },
        // Unmappable tag falls back to the playlist genre.
        { id: "b", position: 2, bpm: 146, energy_score: null, genre: "Reggaeton" },
      ],
      "main",
      "hard-techno"
    )

    // 146 in psy-trance's 136–148 band ≈ energy 8; in hard-techno's 138–158
    // band ≈ energy 5.4 — same BPM, different anchor.
    expect(resolved[0].score).toBeGreaterThan(7.5)
    expect(resolved[1].score).toBeLessThan(6)
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

describe("loudness as an energy signal (B19)", () => {
  const homogeneous = (dbs: (number | null)[]) =>
    dbs.map((db, i) => ({
      id: String(i + 1),
      position: i + 1,
      bpm: 150,
      energy_score: null,
      perceived_db: db,
    }))

  it("differentiates equal-BPM tracks by perceived loudness", () => {
    const resolved = resolveTrackEnergies(
      homogeneous([-5, -4, -3, -2, -1, 0]),
      "main",
      "hard-techno"
    )

    const scores = resolved.map((entry) => entry.score)
    expect(new Set(scores).size).toBeGreaterThan(1)
    // Louder track ends higher than the quietest one.
    expect(scores[5]).toBeGreaterThan(scores[0])
    expect(resolved.every((entry) => entry.source === "bpm_loudness")).toBe(true)
  })

  it("caps the adjustment at ±0.8 around the BPM anchor", () => {
    const resolved = resolveTrackEnergies(
      homogeneous([-10, -5, -4.8, -5.2, -5.1, 0]),
      "main",
      "hard-techno"
    )
    const base = resolveTrackEnergies(
      homogeneous([null, null, null, null, null, null]),
      "main",
      "hard-techno"
    )[0].score

    for (const entry of resolved) {
      expect(Math.abs(entry.score - base)).toBeLessThanOrEqual(0.8 + 0.05)
    }
  })

  it("applies no adjustment when the set is equally loud (spread < 1.5 dB)", () => {
    const resolved = resolveTrackEnergies(
      homogeneous([-3, -3.2, -2.9, -3.1, -3.3, -2.8]),
      "main",
      "hard-techno"
    )

    expect(new Set(resolved.map((entry) => entry.score)).size).toBe(1)
    expect(resolved.every((entry) => entry.source === "bpm")).toBe(true)
  })

  it("applies no adjustment with too few dB readings", () => {
    const resolved = resolveTrackEnergies(
      homogeneous([-5, 0, null, null, null, null]),
      "main",
      "hard-techno"
    )

    expect(resolved.every((entry) => entry.source === "bpm")).toBe(true)
  })

  it("resolves the camelot key from musical_key (B18)", () => {
    const resolved = resolveTrackEnergies(
      [
        { id: "a", position: 1, bpm: 150, energy_score: null, musical_key: "8m" },
        { id: "b", position: 2, bpm: 150, energy_score: null, musical_key: "Am" },
        { id: "c", position: 3, bpm: 150, energy_score: null },
      ],
      "main",
      "hard-techno"
    )

    expect(resolved.map((entry) => entry.camelot)).toEqual(["3A", "8A", null])
  })
})

describe("half/double-time BPM tag correction (B21)", () => {
  const hardTechno = { bpmLow: 138, bpmHigh: 158 }

  it("doubles a half-time tag that lands in the genre band", () => {
    // The real-world case: a ~160 BPM hard-techno track tagged "80".
    expect(correctBpmTagForGenre(80, hardTechno)).toBe(160)
  })

  it("halves a double-time tag that lands in the genre band", () => {
    expect(correctBpmTagForGenre(300, hardTechno)).toBe(150)
  })

  it("trusts in-band (and near-band) tags as-is", () => {
    expect(correctBpmTagForGenre(150, hardTechno)).toBe(150)
    // Within the ±8 anchor margin — not "outside" the band, no correction.
    expect(correctBpmTagForGenre(132, hardTechno)).toBe(132)
    expect(correctBpmTagForGenre(164, hardTechno)).toBe(164)
  })

  it("leaves genuinely out-of-band tags unchanged when no multiple fits", () => {
    // 100 → ×2 = 200 (too high), ×0.5 = 50 (too low): keep 100, low energy.
    expect(correctBpmTagForGenre(100, hardTechno)).toBe(100)
  })

  it("scores the SIKOTI case like its 160 BPM neighbours", () => {
    const resolved = resolveTrackEnergies(
      [
        { id: "a", position: 1, bpm: 160, energy_score: null },
        { id: "b", position: 2, bpm: 80, energy_score: null }, // half-time tag
        { id: "c", position: 3, bpm: 155, energy_score: null },
      ],
      "main",
      "hard-techno"
    )

    // Before B21 the 80-tag scored 1.0 (58 BPM below the band, full ramp).
    expect(resolved[1].score).toBe(resolved[0].score)
    expect(resolved[1].score).toBe(9.1)
    // Display BPM keeps the raw tag — the correction never mutates data.
    expect(resolved[1].bpm).toBe(80)
  })

  it("lets a corrected tempo anchor the track's own genre tag (B14 + B21)", () => {
    // Psy-trance band is 136–148: a "72"-tagged psy track inside a house set
    // corrects to 144 and anchors to psy-trance, not to the playlist genre.
    const [entry] = resolveTrackEnergies(
      [
        {
          id: "a",
          position: 1,
          bpm: 72,
          energy_score: null,
          genre: "Psytrance",
        },
      ],
      "main",
      "house"
    )

    // 144 in the 136–148 band → 3 + (8/12)·6 = 7.
    expect(entry.score).toBe(7)
  })

  it("does not correct when the playlist has no genre (universal bands)", () => {
    const [entry] = resolveTrackEnergies(
      [{ id: "a", position: 1, bpm: 80, energy_score: null }],
      "main",
      null
    )

    // No band to judge against — the raw tag maps through the V1 bands.
    expect(entry.score).toBe(3)
  })
})

describe("estimateSetDurationMinutes", () => {
  it("multiplies track count by the standard duration", () => {
    expect(estimateSetDurationMinutes(0)).toBe(0)
    expect(estimateSetDurationMinutes(10)).toBe(30)
  })
})
