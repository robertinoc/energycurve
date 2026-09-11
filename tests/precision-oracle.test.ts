import { describe, expect, it } from "vitest"

import {
  energyScoreFromBpm,
  energyScoreFromBpmUniversal,
  estimatedScoreFromPosition,
  OPEN_BAND_ANCHORS,
} from "@/lib/engine/energy-score"
import {
  BPM_PROFILE_EDGE_RAMP,
  CONTEXT_ENGINE_V1,
  ENERGY_SCORE_BPM_BANDS,
  ENERGY_SCORE_RANGE,
  GENRE_BPM_PROFILES_V2,
  SET_SCORE_WEIGHTS_V2,
  SUPPORTED_GENRES,
  type SupportedGenre,
} from "@/lib/product/strategy"

/**
 * Phase F5 — data accuracy, checked against an independent oracle.
 *
 * The energy score is the product. Every downstream number — the curve, the set
 * score, which fixes get offered, whether a reorder is worth suggesting — is a
 * function of it, so an error here is invisible and total: the app still draws a
 * confident curve, it is just the wrong one.
 *
 * The oracle below is written from the **specification**, not from the code. It
 * hardcodes the band table, the genre profiles and the ramp width as literals
 * rather than importing them, and implements the arithmetic in a deliberately
 * different shape (explicit branches, no shared `lerp`/`clamp` helpers). A test
 * that imported the same constants and called the same helpers would agree with
 * the implementation by construction and prove nothing.
 *
 * That gives two guarantees for the price of one:
 *
 * 1. **The maths is right** — the product agrees with an independent
 *    calculation across a dense sweep, at tolerance zero.
 * 2. **The frozen constants stay frozen** — AGENTS.md requires engines to be
 *    implemented "strictly against the frozen constants in
 *    `lib/product/strategy.ts`". If a band edge or a genre's BPM range is ever
 *    edited, the literals below stop matching and this file fails. Changing a
 *    score changes what someone already paid for; it should take two deliberate
 *    edits, not one.
 */

// ── The specification, transcribed by hand ──────────────────────────────────

/** V1 universal bands: [lowest BPM, highest BPM, score at low, score at high]. */
const SPEC_BANDS: Array<[number | null, number | null, number, number]> = [
  [null, 114.99, 3, 4],
  [115, 122, 4, 5],
  [122.01, 128, 5, 7],
  [128.01, 135, 6, 8],
  [135.01, null, 7, 10],
]

/** Open-band anchors: below/above these the first and last bands clamp. */
const SPEC_LOW_ANCHOR = 105
const SPEC_HIGH_ANCHOR = 150

/** Genre bands: within [low, high] energy runs 3→9. */
const SPEC_GENRE_BANDS: Record<string, [number, number]> = {
  house: [118, 128],
  "deep-house": [112, 124],
  "organic-house": [108, 122],
  "disco-house": [112, 126],
  "tech-house": [120, 130],
  techno: [125, 140],
  "hard-techno": [138, 158],
  "melodic-techno": [116, 126],
  progressive: [116, 126],
  trance: [130, 142],
  "psy-trance": [136, 148],
  bounce: [124, 136],
}

/** BPM distance past a genre band over which energy slides to 1 or 10. */
const SPEC_EDGE_RAMP = 20

const SPEC_SCORE_MIN = 1
const SPEC_SCORE_MAX = 10

const SPEC_WEIGHTS = { shape: 0.5, dynamics: 0.35, ending: 0.15 }

// ── The oracle ──────────────────────────────────────────────────────────────

/**
 * One decimal, rounding halves up.
 *
 * The tie-break is part of the specification and had to be pinned down here:
 * the first version of this oracle used `toFixed(1)`, which disagreed with the
 * product on every value that lands exactly halfway — 1.15, 1.45, 1.65, 1.95 —
 * and that is not rare, it is one BPM in every two across the whole ramp. The
 * spec text says only "rounded to one decimal", so both readings were
 * defensible and the disagreement was in the prose, not in either program.
 *
 * Written as an explicit floor rather than reusing `Math.round` so the oracle
 * still expresses the rule independently instead of calling the same function
 * the implementation does.
 */
function round1(value: number): number {
  return Math.floor(value * 10 + 0.5) / 10
}

/**
 * Universal mapping, computed band by band with the gap rule spelled out:
 * a BPM that lands between two bands (115 ends at 122, the next starts at
 * 122.01, so 122.005 belongs to neither) is scored by the band below it.
 */
function oracleUniversal(bpm: number): number {
  let chosen: [number | null, number | null, number, number] | null = null

  for (const band of SPEC_BANDS) {
    const [low, high] = band
    const aboveFloor = low === null || bpm >= low
    const belowCeiling = high === null || bpm <= high

    if (aboveFloor && belowCeiling) {
      chosen = band
      break
    }
  }

  if (!chosen) {
    // In a gap: take the last band whose ceiling is below this BPM.
    for (let index = SPEC_BANDS.length - 1; index >= 0; index -= 1) {
      const high = SPEC_BANDS[index][1]
      if (high !== null && high < bpm) {
        chosen = SPEC_BANDS[index]
        break
      }
    }
  }

  if (!chosen) chosen = SPEC_BANDS[0]

  const [low, high, scoreLow, scoreHigh] = chosen
  const from = low ?? SPEC_LOW_ANCHOR
  const to = high ?? SPEC_HIGH_ANCHOR

  if (to === from) return round1(scoreLow)

  let position = (bpm - from) / (to - from)
  if (position < 0) position = 0
  if (position > 1) position = 1

  return round1(scoreLow + position * (scoreHigh - scoreLow))
}

/**
 * Genre-relative mapping: 3→9 inside the band, then sliding to 1 below and 10
 * above across the ramp, clamping past it.
 */
function oracleGenre(bpm: number, genre: string): number {
  const [low, high] = SPEC_GENRE_BANDS[genre]

  if (bpm < low) {
    const distance = low - bpm
    const fraction = distance >= SPEC_EDGE_RAMP ? 1 : distance / SPEC_EDGE_RAMP
    return round1(3 - fraction * (3 - SPEC_SCORE_MIN))
  }

  if (bpm > high) {
    const distance = bpm - high
    const fraction = distance >= SPEC_EDGE_RAMP ? 1 : distance / SPEC_EDGE_RAMP
    return round1(9 + fraction * (SPEC_SCORE_MAX - 9))
  }

  if (high === low) return round1(3)

  return round1(3 + ((bpm - low) / (high - low)) * 6)
}

// ── The frozen-constants guard ──────────────────────────────────────────────

describe("the frozen constants are still the ones this oracle was written against", () => {
  it("keeps the five universal BPM bands exactly as specified", () => {
    const actual = ENERGY_SCORE_BPM_BANDS.map((band) => [
      "minBpmInclusive" in band ? band.minBpmInclusive : null,
      Number.isFinite(band.maxBpmInclusive) ? band.maxBpmInclusive : null,
      band.scoreMin,
      band.scoreMax,
    ])

    expect(actual).toEqual(SPEC_BANDS)
  })

  it("keeps every genre's BPM range", () => {
    const actual = Object.fromEntries(
      Object.entries(GENRE_BPM_PROFILES_V2).map(([genre, profile]) => [
        genre,
        [profile.bpmLow, profile.bpmHigh],
      ])
    )

    expect(actual).toEqual(SPEC_GENRE_BANDS)
  })

  it("keeps the ramp width, the score range and the open-band anchors", () => {
    expect(BPM_PROFILE_EDGE_RAMP).toBe(SPEC_EDGE_RAMP)
    expect(ENERGY_SCORE_RANGE.min).toBe(SPEC_SCORE_MIN)
    expect(ENERGY_SCORE_RANGE.max).toBe(SPEC_SCORE_MAX)
    expect(OPEN_BAND_ANCHORS.lowBpm).toBe(SPEC_LOW_ANCHOR)
    expect(OPEN_BAND_ANCHORS.highBpm).toBe(SPEC_HIGH_ANCHOR)
  })

  it("keeps the set-score weights summing to exactly one", () => {
    expect(SET_SCORE_WEIGHTS_V2).toEqual(SPEC_WEIGHTS)

    const total = Object.values(SET_SCORE_WEIGHTS_V2).reduce((a, b) => a + b, 0)
    expect(Math.abs(total - 1)).toBeLessThan(1e-9)
  })

  it("covers every supported genre, so a new one cannot ship unscored", () => {
    expect(Object.keys(SPEC_GENRE_BANDS).sort()).toEqual([...SUPPORTED_GENRES].sort())
  })
})

// ── The sweep ───────────────────────────────────────────────────────────────

describe("the universal mapping matches the oracle at tolerance zero", () => {
  it("agrees across 60–220 BPM in hundredths", () => {
    const disagreements: Array<{ bpm: number; product: number; oracle: number }> = []

    for (let hundredths = 6000; hundredths <= 22000; hundredths += 1) {
      const bpm = hundredths / 100
      const product = energyScoreFromBpmUniversal(bpm)
      const oracle = oracleUniversal(bpm)

      if (product !== oracle) disagreements.push({ bpm, product, oracle })
    }

    expect(disagreements.slice(0, 5)).toEqual([])
    expect(disagreements).toHaveLength(0)
  })

  it("agrees on the band edges themselves, where an off-by-one hides", () => {
    const edges = [
      114.98, 114.99, 115, 121.99, 122, 122.005, 122.01, 127.99, 128, 128.005,
      128.01, 134.99, 135, 135.005, 135.01,
    ]

    for (const bpm of edges) {
      expect(energyScoreFromBpmUniversal(bpm), `at ${bpm} BPM`).toBe(
        oracleUniversal(bpm)
      )
    }
  })

  it("clamps rather than extrapolating at the open ends", () => {
    // A 40 BPM tag and a 300 BPM tag are both real — a half-time detection and
    // a drum-and-bass tag. Neither may produce a score outside 1–10.
    for (const bpm of [1, 20, 40, 60, 104, 105, 150, 151, 200, 300, 999]) {
      const score = energyScoreFromBpmUniversal(bpm)

      expect(score, `at ${bpm} BPM`).toBe(oracleUniversal(bpm))
      expect(score).toBeGreaterThanOrEqual(SPEC_SCORE_MIN)
      expect(score).toBeLessThanOrEqual(SPEC_SCORE_MAX)
    }
  })
})

describe("the genre mapping matches the oracle at tolerance zero", () => {
  for (const genre of SUPPORTED_GENRES) {
    it(`agrees across 60–220 BPM for ${genre}`, () => {
      const disagreements: number[] = []

      for (let tenths = 600; tenths <= 2200; tenths += 1) {
        const bpm = tenths / 10

        if (energyScoreFromBpm(bpm, genre) !== oracleGenre(bpm, genre)) {
          disagreements.push(bpm)
        }
      }

      expect(disagreements).toEqual([])
    })
  }

  it("never leaves 1–10, for any genre at any tempo", () => {
    for (const genre of SUPPORTED_GENRES) {
      for (const bpm of [1, 40, 60, 100, 128, 160, 200, 300, 999]) {
        const score = energyScoreFromBpm(bpm, genre)

        expect(score, `${genre} at ${bpm}`).toBeGreaterThanOrEqual(SPEC_SCORE_MIN)
        expect(score, `${genre} at ${bpm}`).toBeLessThanOrEqual(SPEC_SCORE_MAX)
      }
    }
  })

  it("falls back to the universal mapping when the genre is unknown", () => {
    for (let tenths = 600; tenths <= 2200; tenths += 7) {
      const bpm = tenths / 10
      expect(energyScoreFromBpm(bpm, null)).toBe(oracleUniversal(bpm))
    }
  })
})

describe("properties the mapping must hold whatever the numbers are", () => {
  it("is monotonic for every genre: a faster track is never less energetic", () => {
    for (const genre of SUPPORTED_GENRES) {
      let previous = -Infinity

      for (let tenths = 600; tenths <= 2200; tenths += 1) {
        const score = energyScoreFromBpm(tenths / 10, genre)

        expect(score, `${genre} went down at ${tenths / 10} BPM`).toBeGreaterThanOrEqual(
          previous
        )

        previous = score
      }
    }
  })

  /**
   * The universal fallback is **not** monotonic, and this test exists to say so
   * out loud rather than to let it pass unnoticed.
   *
   * The V1 bands overlap in score: band 3 (122.01–128) ends at 7 while band 4
   * (128.01–135) starts at 6, and band 4 ends at 8 while band 5 starts at 7. So
   * crossing 128 or 135 drops a full point — a track at 128 BPM scores 7 and one
   * at 129 scores 6.3. Speed up, and the app reports the energy fell.
   *
   * Reachable in production only where no genre resolves: playlists created
   * before genre became required, which read paths still tolerate (decision 23).
   * Everything created since goes through the genre mapping, which is monotonic.
   *
   * Not fixed here on purpose. These are frozen scoring constants, and changing
   * them changes the score on sets people already analysed and paid for. Written
   * up in `docs/qa/findings-f5-precision.md` for a product decision.
   *
   * The assertion is exact: these two drops, at these two BPMs, of this size.
   * A third discontinuity, or a change to either of these, fails the test.
   */
  it("has exactly two known discontinuities in the universal fallback, and no more", () => {
    const drops: Array<{ from: number; to: number; size: number }> = []
    let previous = energyScoreFromBpmUniversal(60)

    for (let hundredths = 6001; hundredths <= 22000; hundredths += 1) {
      const bpm = hundredths / 100
      const score = energyScoreFromBpmUniversal(bpm)

      if (score < previous) {
        drops.push({
          from: Number(((hundredths - 1) / 100).toFixed(2)),
          to: bpm,
          size: Number((previous - score).toFixed(1)),
        })
      }

      previous = score
    }

    expect(drops).toEqual([
      { from: 128, to: 128.01, size: 1 },
      { from: 135, to: 135.01, size: 1 },
    ])
  })

  it("puts the middle of every genre band at the middle of 3–9", () => {
    for (const genre of SUPPORTED_GENRES) {
      const [low, high] = SPEC_GENRE_BANDS[genre]

      expect(energyScoreFromBpm(low, genre), `${genre} floor`).toBe(3)
      expect(energyScoreFromBpm(high, genre), `${genre} ceiling`).toBe(9)
      expect(energyScoreFromBpm((low + high) / 2, genre), `${genre} middle`).toBe(6)
    }
  })

  it("reaches the extremes exactly one ramp width outside the band", () => {
    for (const genre of SUPPORTED_GENRES) {
      const [low, high] = SPEC_GENRE_BANDS[genre]

      expect(energyScoreFromBpm(low - SPEC_EDGE_RAMP, genre)).toBe(SPEC_SCORE_MIN)
      expect(energyScoreFromBpm(high + SPEC_EDGE_RAMP, genre)).toBe(SPEC_SCORE_MAX)
    }
  })

  it("always returns one decimal place, never a float artefact", () => {
    // 4.300000000000001 rendered in a tooltip is a bug report.
    for (const genre of [...SUPPORTED_GENRES, null] as Array<SupportedGenre | null>) {
      for (let tenths = 600; tenths <= 2200; tenths += 3) {
        const score = energyScoreFromBpm(tenths / 10, genre)

        expect(Number.isInteger(score * 10), `${genre} at ${tenths / 10}`).toBe(true)
      }
    }
  })
})

describe("the position fallback, for a track with no BPM at all", () => {
  it("spans exactly the context's expected range, first track to last", () => {
    for (const context of ["opening", "main", "closing"] as const) {
      const { expectedEnergyMin, expectedEnergyMax } = CONTEXT_ENGINE_V1[context]

      expect(estimatedScoreFromPosition(0, 10, context)).toBe(expectedEnergyMin)
      expect(estimatedScoreFromPosition(9, 10, context)).toBe(expectedEnergyMax)
    }
  })

  it("puts a lone track in the middle rather than at either end", () => {
    for (const context of ["opening", "main", "closing"] as const) {
      const { expectedEnergyMin, expectedEnergyMax } = CONTEXT_ENGINE_V1[context]
      const middle = Number(
        ((expectedEnergyMin + expectedEnergyMax) / 2).toFixed(1)
      )

      expect(estimatedScoreFromPosition(0, 1, context)).toBe(middle)
    }
  })

  it("stays inside 1–10 for every context and position", () => {
    for (const context of ["opening", "main", "closing", null] as const) {
      for (let index = 0; index < 40; index += 1) {
        const score = estimatedScoreFromPosition(index, 40, context)

        expect(score).toBeGreaterThanOrEqual(SPEC_SCORE_MIN)
        expect(score).toBeLessThanOrEqual(SPEC_SCORE_MAX)
      }
    }
  })
})
