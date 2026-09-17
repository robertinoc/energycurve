import { describe, expect, it } from "vitest"

import { assessHarmony } from "@/lib/engine/harmony"
import {
  camelotToMusical,
  camelotToOpenKey,
  detectKeyNotation,
  harmonicMove,
  parseCamelot,
  semitonesForTempoChange,
  toCamelot,
  transposeCamelot,
} from "@/lib/music/camelot"
import { HARMONIC_BPM_MARGIN } from "@/lib/music/harmonic-transitions"
import {
  ALL_CAMELOT,
  checkCompatibility,
  compatibleKeys,
  keyTable,
  readKey,
} from "@/lib/tools/harmonic-tools"

describe("the key table", () => {
  const rows = keyTable()

  it("has all 24 keys, once each, in wheel order", () => {
    expect(rows).toHaveLength(24)
    expect(new Set(rows.map((row) => row.camelot)).size).toBe(24)
    expect(rows.slice(0, 4).map((row) => row.camelot)).toEqual([
      "1A",
      "1B",
      "2A",
      "2B",
    ])
  })

  it("gives every row a distinct Open Key and abbreviation", () => {
    expect(new Set(rows.map((row) => row.openKey)).size).toBe(24)
    expect(new Set(rows.map((row) => row.abbreviation)).size).toBe(24)
  })

  it("names a root for every row", () => {
    // noteIndex === -1 would mean a spelling the note list doesn't have, which
    // is how a key ends up rendered as "undefined menor".
    for (const row of rows) {
      expect(row.noteIndex, row.camelot).toBeGreaterThanOrEqual(0)
      expect(row.noteIndex, row.camelot).toBeLessThan(12)
    }
  })

  it("puts the minor keys on the A ring and the major keys on B", () => {
    for (const row of rows) {
      expect(row.minor, row.camelot).toBe(row.camelot.endsWith("A"))
    }
  })

  it("round-trips every notation back to the same Camelot code", () => {
    for (const row of rows) {
      expect(toCamelot(row.abbreviation), row.abbreviation).toBe(row.camelot)
      expect(readKey(row.camelot), row.camelot).toBe(row.camelot)
      expect(readKey(row.abbreviation), row.abbreviation).toBe(row.camelot)
      expect(readKey(row.openKey), row.openKey).toBe(row.camelot)

      // And each notation is recognised as itself.
      expect(detectKeyNotation(row.camelot)).toBe("camelot")
      expect(detectKeyNotation(row.openKey)).toBe("open_key")
      expect(detectKeyNotation(row.abbreviation)).toBe("musical")
    }
  })

  it("agrees with the converters it was built from", () => {
    for (const row of rows) {
      expect(camelotToOpenKey(row.camelot)).toBe(row.openKey)
      expect(camelotToMusical(row.camelot)).toBe(row.abbreviation)
    }
  })
})

describe("the calculator uses the engine's verdict, not its own", () => {
  /**
   * The rule the whole batch rests on: the wheel, the calculator and the app
   * must not be able to disagree about whether two keys mix.
   *
   * Compared against `assessHarmony` itself — the function the set analysis
   * calls — rather than against `harmonicMove`, so this would still fail if
   * someone changed how the engine folds a move into a verdict.
   */
  it("matches assessHarmony on all 576 pairs", () => {
    for (const from of ALL_CAMELOT) {
      for (const to of ALL_CAMELOT) {
        const result = checkCompatibility(
          { key: from, bpm: "128" },
          { key: to, bpm: "128" }
        )
        const engine = assessHarmony([from, to])

        expect(result.move, `${from} → ${to}`).not.toBeNull()
        expect(result.move!.tier, `${from} → ${to}`).toBe(engine.tiers[0])
      }
    }
  })

  it("matches for keys typed in any notation", () => {
    for (const row of keyTable()) {
      for (const written of [row.camelot, row.openKey, row.abbreviation]) {
        const result = checkCompatibility(
          { key: "8A", bpm: "" },
          { key: written, bpm: "" }
        )

        expect(result.move?.tier, written).toBe(
          harmonicMove("8A", row.camelot).tier
        )
      }
    }
  })

  it("reports no verdict rather than a clash when a key is unreadable", () => {
    for (const bad of ["", "   ", "13A", "Hm", "banana", "0A"]) {
      expect(readKey(bad), bad).toBeNull()
      expect(
        checkCompatibility({ key: bad, bpm: "128" }, { key: "8A", bpm: "128" })
          .move,
        bad
      ).toBeNull()
    }
  })
})

describe("the wheel offers what the table offers", () => {
  it("gives every key a set of compatible keys, with no repeats", () => {
    for (const camelot of ALL_CAMELOT) {
      const neighbours = compatibleKeys(camelot)

      expect(neighbours.length, camelot).toBeGreaterThan(0)
      expect(
        new Set(neighbours.map((n) => n.camelot)).size,
        camelot
      ).toBe(neighbours.length)

      for (const neighbour of neighbours) {
        expect(parseCamelot(neighbour.camelot), neighbour.camelot).not.toBeNull()
        // Everything the table offers must be a move the engine also rates as
        // usable. A "compatible" key the app would call a clash is the exact
        // contradiction this batch exists to avoid.
        expect(neighbour.tier, `${camelot} → ${neighbour.camelot}`).not.toBe(
          "clash"
        )
      }
    }
  })

  it("always offers the key itself as perfect", () => {
    for (const camelot of ALL_CAMELOT) {
      const self = compatibleKeys(camelot).find((n) => n.camelot === camelot)

      expect(self?.level, camelot).toBe("perfect")
    }
  })
})

describe("tempo", () => {
  it("reads a percentage difference the way the engine does", () => {
    const result = checkCompatibility(
      { key: "", bpm: "128" },
      { key: "", bpm: "136" }
    )

    expect(result.tempo?.relation).toBe("same")
    expect(result.tempo!.ratio * 100).toBeCloseTo(6.25, 2)
  })

  it.each([
    ["87 into 174", "174", "87", "half"],
    ["174 into 87", "87", "174", "double"],
    ["172 into 86", "86", "172", "double"],
    ["128 into 128", "128", "128", "same"],
  ])("detects %s", (_label, fromBpm, toBpm, relation) => {
    const result = checkCompatibility(
      { key: "", bpm: fromBpm },
      { key: "", bpm: toBpm }
    )

    expect(result.tempo?.relation).toBe(relation)
    // A matched half/double is a zero-percent move, not a 50% one.
    expect(Math.abs(result.tempo!.ratio)).toBeLessThan(0.01)
  })

  it("keeps the fader range and the engine's margin apart", () => {
    // 7.5% fits a ±8 fader and is still past the engine's 7% crossfade margin.
    // One verdict for both would be wrong in both directions.
    const result = checkCompatibility(
      { key: "", bpm: "100" },
      { key: "", bpm: "107.5" }
    )

    expect(result.withinPitchRange![8]).toBe(true)
    expect(result.withinPitchRange![6]).toBe(false)
    expect(result.tempo!.beyondMargin).toBe(true)
    expect(HARMONIC_BPM_MARGIN).toBe(0.07)
  })

  it.each([
    ["exactly 6%", "100", "106", true],
    ["5.9%", "100", "105.9", true],
    ["6.1%", "100", "106.1", false],
  ])("a ±6 fader, %s", (_label, fromBpm, toBpm, fits) => {
    const result = checkCompatibility(
      { key: "", bpm: fromBpm },
      { key: "", bpm: toBpm }
    )

    expect(result.withinPitchRange![6]).toBe(fits)
  })
})

describe("pitching without key lock", () => {
  it("moves a semitone at 5.9463%, which is where the semitone is", () => {
    expect(semitonesForTempoChange(0.0594631)).toBeCloseTo(1, 4)
    expect(semitonesForTempoChange(0)).toBe(0)
  })

  it("drops the key when the incoming track has to slow down", () => {
    // 136 pulled back to 128 is about a semitone down: Am → Abm.
    const result = checkCompatibility(
      { key: "8A", bpm: "128" },
      { key: "8A", bpm: "136" }
    )

    expect(result.pitchedKey!.semitones).toBeLessThan(0)
    expect(result.pitchedKey!.camelot).toBe("1A")
  })

  it("raises it when the incoming track has to speed up", () => {
    const result = checkCompatibility(
      { key: "8A", bpm: "128" },
      { key: "8A", bpm: "120" }
    )

    expect(result.pitchedKey!.semitones).toBeGreaterThan(0)
    expect(result.pitchedKey!.camelot).toBe("3A")
  })

  it("leaves the key alone at a matched tempo, including half-time", () => {
    for (const [a, b] of [
      ["128", "128"],
      ["174", "87"],
    ]) {
      const result = checkCompatibility({ key: "8A", bpm: a }, { key: "8A", bpm: b })

      expect(result.pitchedKey!.camelot).toBe("8A")
      expect(result.pitchedKey!.approximate).toBe(false)
    }
  })

  it("says so when the shift lands between two keys", () => {
    // ~3% is half a semitone: the result is not a key, it is out of tune.
    const result = checkCompatibility(
      { key: "8A", bpm: "100" },
      { key: "8A", bpm: "103" }
    )

    expect(result.pitchedKey!.approximate).toBe(true)
  })

  it("holds the key when key lock is on", () => {
    const result = checkCompatibility(
      { key: "8A", bpm: "128" },
      { key: "8A", bpm: "136" },
      { pitchLock: true }
    )

    expect(result.pitchedKey).toBeNull()
  })
})

describe("transposeCamelot", () => {
  it("moves seven positions per semitone, staying on its ring", () => {
    expect(transposeCamelot("8A", 1)).toBe("3A")
    expect(transposeCamelot("8A", -1)).toBe("1A")
    expect(transposeCamelot("8B", 1)).toBe("3B")
  })

  it("returns to the start after twelve semitones, in both directions", () => {
    for (const camelot of ALL_CAMELOT) {
      expect(transposeCamelot(camelot, 12), camelot).toBe(camelot)
      expect(transposeCamelot(camelot, -12), camelot).toBe(camelot)
      expect(transposeCamelot(camelot, 0), camelot).toBe(camelot)
    }
  })

  it("agrees with the note names it should land on", () => {
    // Am up a semitone is Bbm; C up a semitone is Db.
    expect(camelotToMusical(transposeCamelot("8A", 1))).toBe("Bbm")
    expect(camelotToMusical(transposeCamelot("8B", 1))).toBe("Db")
  })

  it("refuses a key it cannot read", () => {
    expect(transposeCamelot("13A", 1)).toBeNull()
    expect(transposeCamelot(null, 1)).toBeNull()
  })
})
