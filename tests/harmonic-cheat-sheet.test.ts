import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { describe, expect, it } from "vitest"

import { GET as camelotWheelSvg } from "@/app/camelot-wheel.svg/route"
import { CheatSheetTables } from "@/components/marketing/harmonic-cheat-sheet-page"
import {
  CHEAT_SHEET_COPY,
  fillCounts,
} from "@/lib/content/harmonic-cheat-sheet-copy"
import { localizedPath } from "@/lib/content/locale-routing"
import { supportedLocales } from "@/lib/content/site-copy"
import {
  HARMONIC_LEVELS,
  HARMONIC_TRANSITION_TABLE,
} from "@/lib/music/harmonic-transitions"
import { renderCamelotWheelSvg } from "@/lib/tools/camelot-wheel-svg"
import {
  cheatSheetCounts,
  cheatSheetKeys,
  cheatSheetMoves,
} from "@/lib/tools/harmonic-cheat-sheet"

/**
 * Lote 13 — the harmonic cheat sheet.
 *
 * Two things are defended here, and they are different.
 *
 * **The key column is right.** Jordi's reference file, which the transition
 * table was adopted from, has 10 of its 24 tonality labels wrong (rows 3A to
 * 7B — `docs/feedback-2026-09-16-jordi-harmony-table.md`). The page must not
 * inherit that, so the 24 rows are checked against the circle of fifths
 * itself, derived here from nothing but arithmetic: 8B is C major, each step
 * clockwise is a perfect fifth, and the relative minor sits three semitones
 * below. Nothing in this derivation reads the app's converters.
 *
 * **The page is the constant.** The tables are generated, not written, and the
 * test that proves it renders the component and compares every cell against
 * `HARMONIC_TRANSITION_TABLE`. Hard-code one cell in the page and this fails,
 * which is the failure mode "generate, don't copy" exists to make loud.
 */

/** Pitch class of every spelling the converters can emit. C = 0. */
const PITCH_CLASS: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
}

/** Camelot number → pitch class of the major key on ring B, by fifths from C at 8. */
function majorPitchClass(num: number): number {
  return (((num - 8) * 7) % 12 + 12) % 12
}

describe("the 24 keys, checked against the circle of fifths", () => {
  const rows = cheatSheetKeys("en")

  it("has every Camelot code once, in wheel order", () => {
    expect(rows.map((row) => row.camelot)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1).flatMap((num) => [
        `${num}A`,
        `${num}B`,
      ])
    )
  })

  it("puts the major key a fifth up per number on ring B, and its relative minor on ring A", () => {
    for (const row of rows) {
      const num = Number.parseInt(row.camelot, 10)
      const ring = row.camelot.endsWith("B") ? "B" : "A"
      const root = row.minor ? row.abbreviation.slice(0, -1) : row.abbreviation
      const expectedMinor = ring === "A"
      // Relative minor: three semitones below the major, i.e. +9 mod 12.
      const expectedPitch =
        ring === "B" ? majorPitchClass(num) : (majorPitchClass(num) + 9) % 12

      expect(row.minor, `${row.camelot} mode`).toBe(expectedMinor)
      expect(PITCH_CLASS[root], `${row.camelot} → ${row.abbreviation}`).toBe(
        expectedPitch
      )
    }
  })

  /** The rows Jordi's 2.1 table gets wrong, spelled out, so a regression names them. */
  it("gets the ten rows right that the reference file gets wrong", () => {
    const byCode = new Map(rows.map((row) => [row.camelot, row.abbreviation]))

    expect(byCode.get("3A")).toBe("Bbm")
    expect(byCode.get("3B")).toBe("Db")
    expect(byCode.get("4A")).toBe("Fm")
    expect(byCode.get("4B")).toBe("Ab")
    expect(byCode.get("5A")).toBe("Cm")
    expect(byCode.get("5B")).toBe("Eb")
    expect(byCode.get("6A")).toBe("Gm")
    expect(byCode.get("6B")).toBe("Bb")
    expect(byCode.get("7A")).toBe("Dm")
    expect(byCode.get("7B")).toBe("F")
  })

  it("is Open Key rotated by five, with d for major and m for minor", () => {
    for (const row of rows) {
      const num = Number.parseInt(row.camelot, 10)
      const openNumber = ((num + 4) % 12) + 1

      expect(row.openKey).toBe(`${openNumber}${row.minor ? "m" : "d"}`)
    }
  })

  it("speaks each key in the page's language", () => {
    const spanish = cheatSheetKeys("es")

    expect(rows.find((row) => row.camelot === "8A")?.spoken).toBe("A minor")
    expect(spanish.find((row) => row.camelot === "8A")?.spoken).toBe("La menor")
    expect(rows.find((row) => row.camelot === "8B")?.spoken).toBe("C major")
    expect(spanish.find((row) => row.camelot === "8B")?.spoken).toBe("Do mayor")
  })
})

describe("the page is the transition table, cell for cell", () => {
  /** `data-from`/`data-level` cells out of the rendered moves table. */
  function renderedCells(locale: "en" | "es"): Map<string, string> {
    const html = renderToStaticMarkup(createElement(CheatSheetTables, { locale }))
    const cells = new Map<string, string>()

    for (const match of html.matchAll(
      /<td[^>]*data-from="([^"]+)"[^>]*data-level="([^"]+)"[^>]*>([^<]*)<\/td>/g
    )) {
      cells.set(`${match[1]}|${match[2]}`, match[3])
    }

    return cells
  }

  it.each(supportedLocales)("renders every cell the constant declares (%s)", (locale) => {
    const cells = renderedCells(locale)
    const expectedCells = Object.keys(HARMONIC_TRANSITION_TABLE).length * HARMONIC_LEVELS.length

    expect(cells.size).toBe(expectedCells)

    for (const [from, row] of Object.entries(HARMONIC_TRANSITION_TABLE)) {
      for (const level of HARMONIC_LEVELS) {
        expect(cells.get(`${from}|${level}`), `${from} ${level}`).toBe(
          row[level].join(", ")
        )
      }
    }
  })

  it("keeps the rows in the constant's order", () => {
    expect(cheatSheetMoves().map((row) => row.from)).toEqual(
      Object.keys(HARMONIC_TRANSITION_TABLE)
    )
  })

  it("quotes only numbers it computed, never ones typed into the copy", () => {
    const counts = cheatSheetCounts()

    // The table's own invariants, which the prose relies on.
    expect(counts.keys).toBe(24)
    expect(counts.levels).toBe(8)
    expect(Number.isNaN(counts.targetsPerKey)).toBe(false)

    for (const locale of supportedLocales) {
      for (const text of [
        CHEAT_SHEET_COPY.lede[locale],
        CHEAT_SHEET_COPY.movesNote[locale],
        CHEAT_SHEET_COPY.source[locale],
        CHEAT_SHEET_COPY.downloadNote[locale],
      ]) {
        // Placeholders in the source text, never a bare count.
        expect(text, text).not.toMatch(/\b(24|288|12)\b/)

        const filled = fillCounts(text, counts)

        expect(filled).not.toContain("{")
      }

      expect(fillCounts(CHEAT_SHEET_COPY.source[locale], counts)).toContain(
        String(counts.totalMoves)
      )
    }
  })
})

describe("the downloadable wheel", () => {
  it("is an SVG carrying all 24 codes, their spellings and their Open Key codes", () => {
    const svg = renderCamelotWheelSvg()

    expect(svg.startsWith('<?xml version="1.0"')).toBe(true)
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')

    for (const row of cheatSheetKeys("en")) {
      expect(svg).toContain(`>${row.camelot}<`)
      expect(svg).toContain(`>${row.abbreviation}<`)
      expect(svg).toContain(`>${row.openKey}<`)
    }
  })

  it("is served as an SVG image with a filename", async () => {
    const response = camelotWheelSvg()

    expect(response.headers.get("Content-Type")).toBe("image/svg+xml; charset=utf-8")
    expect(response.headers.get("Content-Disposition")).toContain("camelot-wheel.svg")
    expect(await response.text()).toBe(renderCamelotWheelSvg())
  })
})

describe("the page's URLs", () => {
  it("has a Spanish slug of its own", () => {
    expect(localizedPath("/harmonic-mixing-cheat-sheet", "en")).toBe(
      "/harmonic-mixing-cheat-sheet"
    )
    expect(localizedPath("/harmonic-mixing-cheat-sheet", "es")).toBe(
      "/es/tabla-de-mezcla-armonica"
    )
  })
})
