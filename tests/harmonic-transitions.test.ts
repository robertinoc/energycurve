import { describe, expect, it } from "vitest"

import { harmonicMove, type HarmonicTier } from "@/lib/music/camelot"
import {
  HARMONIC_BPM_MARGIN,
  HARMONIC_LEVELS,
  HARMONIC_TRANSITION_TABLE,
  harmonicIndex,
  harmonicTableMove,
  harmonicTableMoveAt,
  tempoGap,
  type HarmonicLevel,
} from "@/lib/music/harmonic-transitions"

const CODES = Array.from({ length: 12 }, (_, i) => i + 1).flatMap((num) => [
  `${num}A`,
  `${num}B`,
])

const wrap = (n: number) => ((n - 1 + 120) % 12) + 1
const at = (n: number, ring: "A" | "B") => `${wrap(n)}${ring}`

function targetsOf(code: string): string[] {
  return HARMONIC_LEVELS.flatMap((level) =>
    HARMONIC_TRANSITION_TABLE[code][level].map((cell) =>
      cell.replace(/[()]/g, "")
    )
  )
}

/**
 * The table as it was transcribed, against the rule it turned out to follow.
 *
 * This is the audit that decided we could adopt it wholesale: every one of the
 * 192 cells falls out of one offset model, so there is no typo hiding in the
 * transcription and no row that is special. If someone edits a cell by hand,
 * this fails — which is the point, because the table is now scoring input.
 */
describe("the transition table is the one he sent", () => {
  it("has all 24 rows with all 8 levels", () => {
    expect(Object.keys(HARMONIC_TRANSITION_TABLE).sort()).toEqual(
      [...CODES].sort()
    )

    for (const code of CODES) {
      for (const level of HARMONIC_LEVELS) {
        expect(
          HARMONIC_TRANSITION_TABLE[code][level].length,
          `${code} ${level}`
        ).toBeGreaterThan(0)
      }
    }
  })

  it("matches the offset model cell for cell", () => {
    for (const code of CODES) {
      const n = Number.parseInt(code, 10)
      const minor = code.endsWith("A")

      const expected: Record<HarmonicLevel, string[]> = minor
        ? {
            // Same key, and the one-accidental neighbour (Am → G).
            perfect: [at(n, "A"), at(n + 1, "B")],
            // Relative major, and up a fifth.
            boost_1: [at(n, "B"), at(n + 1, "A")],
            // +3 semitones.
            boost_2: [at(n - 3, "A")],
            // +2 semitones, then +1.
            boost_3: [at(n + 2, "A"), `(${at(n + 7, "A")})`],
            // Down a fifth.
            drop_1: [at(n - 1, "A")],
            // −3 semitones.
            drop_2: [at(n + 3, "A")],
            // −2 semitones, then −1.
            drop_3: [at(n - 2, "A"), `(${at(n + 5, "A")})`],
            // Parallel major.
            mood: [at(n + 3, "B")],
          }
        : {
            perfect: [at(n, "B"), at(n - 1, "A")],
            boost_1: [at(n + 1, "B")],
            boost_2: [at(n - 3, "B")],
            boost_3: [at(n + 2, "B"), `(${at(n + 7, "B")})`],
            // Relative minor, and down a fifth.
            drop_1: [at(n, "A"), at(n - 1, "B")],
            drop_2: [at(n + 3, "B")],
            drop_3: [at(n - 2, "B"), `(${at(n + 5, "B")})`],
            // Parallel minor.
            mood: [at(n - 3, "A")],
          }

      for (const level of HARMONIC_LEVELS) {
        expect(
          HARMONIC_TRANSITION_TABLE[code][level],
          `${code} ${level}`
        ).toEqual(expected[level])
      }
    }
  })

  it("recommends 12 of the 24 keys per row, each exactly once", () => {
    for (const code of CODES) {
      const targets = targetsOf(code)

      expect(new Set(targets).size, `${code} duplicates a target`).toBe(
        targets.length
      )
      expect(targets, `${code}`).toHaveLength(12)
    }
  })

  it("is symmetric — if you can go there, you can come back", () => {
    for (const from of CODES) {
      for (const to of targetsOf(from)) {
        expect(targetsOf(to), `${to} -> ${from}`).toContain(from)
      }
    }
  })

  it("reaches the same row by code and by lane index", () => {
    for (const from of CODES) {
      for (const to of CODES) {
        const num = Number.parseInt(from, 10)
        const toNum = Number.parseInt(to, 10)

        expect(harmonicTableMove(from, to)).toEqual(
          harmonicTableMoveAt(
            harmonicIndex(num, from.endsWith("B") ? "B" : "A"),
            harmonicIndex(toNum, to.endsWith("B") ? "B" : "A")
          )
        )
      }
    }
  })
})

describe("what adopting the table changed", () => {
  /** The wheel-distance heuristic the table replaced, kept as the baseline. */
  function previousTier(from: string, to: string): HarmonicTier {
    const a = Number.parseInt(from, 10)
    const b = Number.parseInt(to, 10)
    const sameRing = from.slice(-1) === to.slice(-1)
    const forward = (b - a + 12) % 12
    const distance = Math.abs(forward <= 6 ? forward : forward - 12)

    if (distance === 0) {
      return sameRing ? "perfect" : "smooth"
    }

    if (distance === 1 && sameRing) {
      return "smooth"
    }

    return distance === 2 && sameRing ? "boost" : "clash"
  }

  it("never rejects a move the old rules accepted", () => {
    // The whole case for adopting his table rests on this: it only widens what
    // is playable. If a future edit made it narrower, a DJ would lose mixes the
    // product had already told them were fine.
    for (const from of CODES) {
      for (const to of CODES) {
        if (previousTier(from, to) === "clash") {
          continue
        }

        expect(harmonicMove(from, to).tier, `${from} -> ${to}`).not.toBe(
          "clash"
        )
      }
    }
  })

  it("rescues exactly half of the wheel from the clash bucket", () => {
    const rescued: string[] = []

    for (const from of CODES) {
      for (const to of CODES) {
        if (
          previousTier(from, to) === "clash" &&
          harmonicMove(from, to).tier !== "clash"
        ) {
          rescued.push(`${from}->${to}`)
        }
      }
    }

    // 24 rows × 6 moves the old rules called a clash: the diagonal perfect
    // match, ±3 and ±1 semitones, and the parallel major/minor.
    expect(rescued).toHaveLength(144)
  })

  it("keeps the classic moves in the tiers the costs were written for", () => {
    expect(harmonicMove("8A", "8A").tier).toBe("perfect")
    expect(harmonicMove("8A", "9A").tier).toBe("smooth") // up a fifth
    expect(harmonicMove("8A", "7A").tier).toBe("smooth") // down a fifth
    expect(harmonicMove("8A", "8B").tier).toBe("smooth") // relative major
    expect(harmonicMove("8A", "10A").tier).toBe("boost") // +2 semitones
    expect(harmonicMove("8A", "6A").tier).toBe("boost") // −2 semitones
  })

  it("reads direction from the table, not from the wheel", () => {
    // The move that made this necessary: relative major and minor travel zero
    // hours on the wheel, and one lifts while the other releases.
    expect(harmonicMove("8A", "8B")).toMatchObject({
      level: "boost_1",
      direction: "up",
      steps: 0,
    })
    expect(harmonicMove("8B", "8A")).toMatchObject({
      level: "drop_1",
      direction: "down",
      steps: 0,
    })
  })

  it("still calls a key outside the row a clash", () => {
    // 4A is in no column of row 8A: "no recomendada", in his words.
    expect(harmonicMove("8A", "4A")).toMatchObject({
      tier: "clash",
      level: null,
      option: null,
    })
    expect(harmonicMove("8A", "2B").tier).toBe("clash")
  })

  it("names the level of every recommended move", () => {
    for (const from of CODES) {
      for (const to of targetsOf(from)) {
        expect(harmonicMove(from, to).level, `${from} -> ${to}`).not.toBeNull()
      }
    }
  })
})

describe("tempoGap", () => {
  it("measures the next track against the one playing", () => {
    expect(tempoGap(128, 128)?.ratio).toBe(0)
    expect(tempoGap(100, 107)).toMatchObject({
      ratio: 0.07,
      beyondMargin: false,
    })
    // The margin is "no puede superar" — 7% exactly is still inside it.
    expect(HARMONIC_BPM_MARGIN).toBe(0.07)
    expect(tempoGap(100, 108)?.beyondMargin).toBe(true)
    expect(tempoGap(100, 92)?.beyondMargin).toBe(true)
  })

  it("matches half and double time instead of flagging them", () => {
    // Named from the booth: at 174, a track tagged 87 is the halftime one.
    expect(tempoGap(174, 87)).toMatchObject({ relation: "half", ratio: 0 })
    expect(tempoGap(87, 174)).toMatchObject({ relation: "double", ratio: 0 })
    // Still measured once matched: 174 into 90 is 180 against 174.
    expect(tempoGap(174, 90)).toMatchObject({
      relation: "half",
      beyondMargin: false,
    })
  })

  it("says nothing when it doesn't know", () => {
    expect(tempoGap(null, 128)).toBeNull()
    expect(tempoGap(128, null)).toBeNull()
    expect(tempoGap(0, 128)).toBeNull()
    expect(tempoGap(128, Number.NaN)).toBeNull()
  })
})
