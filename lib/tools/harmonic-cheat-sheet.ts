import { LEVEL_COPY, spokenKeyName } from "@/lib/content/harmonic-tools-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import {
  HARMONIC_LEVELS,
  HARMONIC_TRANSITION_TABLE,
  type HarmonicLevel,
} from "@/lib/music/harmonic-transitions"
import { keyTable } from "@/lib/tools/harmonic-tools"

/**
 * The harmonic cheat sheet, as data.
 *
 * Lote 13. People search for the table itself — "harmonic mixing cheat
 * sheet", "rueda camelot notas" — and the site's rule has always been that the
 * harmonic rules live in `lib/music/harmonic-transitions.ts` and are not
 * repeated in content. This is the one page that publishes the table, and it
 * keeps the rule by **generating** every cell from the constant rather than
 * writing a copy of it. A hand-written table would be right today and
 * silently wrong the first time the constant changes; this one cannot be
 * wrong in a way the constant is not.
 *
 * Everything here is pure and synchronous so a test can render it and compare
 * it, cell by cell, against the table it claims to show.
 */

export interface CheatSheetKeyRow {
  camelot: string
  openKey: string
  /** `Am`, `Abm`, `C` — the spelling DJ software writes. */
  abbreviation: string
  /** "A minor" / "La menor". */
  spoken: string
  minor: boolean
}

/** The 24 keys with every notation a DJ reads, spoken in the page's language. */
export function cheatSheetKeys(locale: SiteLocale): CheatSheetKeyRow[] {
  return keyTable().map((row) => ({
    camelot: row.camelot,
    openKey: row.openKey,
    abbreviation: row.abbreviation,
    spoken: spokenKeyName(row.noteIndex, row.minor, locale),
    minor: row.minor,
  }))
}

export interface CheatSheetMove {
  camelot: string
  /** The table's parenthesised fallback for that level. */
  secondary: boolean
}

export interface CheatSheetMovesRow {
  from: string
  /** One entry per level, in `HARMONIC_LEVELS` order; empty when the table has no target. */
  moves: Record<HarmonicLevel, CheatSheetMove[]>
}

/**
 * The transition table, row by row, exactly as `HARMONIC_TRANSITION_TABLE`
 * declares it — same rows, same order, same cells, parentheses read into a
 * flag. This is the data the page renders and the data the test compares.
 */
export function cheatSheetMoves(): CheatSheetMovesRow[] {
  // The constant's own row order — the A ring, then the B ring — not the
  // wheel order the key table uses. This page is the constant, so it reads
  // like the constant.
  return Object.entries(HARMONIC_TRANSITION_TABLE).map(([from, row]) => {
    const moves = Object.fromEntries(
      HARMONIC_LEVELS.map((level) => [
        level,
        row[level].map((cell) => ({
          camelot: cell.replace(/[()]/g, ""),
          secondary: cell.startsWith("("),
        })),
      ])
    ) as Record<HarmonicLevel, CheatSheetMove[]>

    return { from, moves }
  })
}

/** The column headings, in the table's own vocabulary and order. */
export function cheatSheetLevels(locale: SiteLocale): { level: HarmonicLevel; name: string }[] {
  return HARMONIC_LEVELS.map((level) => ({
    level,
    name: LEVEL_COPY[level].name[locale],
  }))
}

/**
 * A cell as the page prints it: `3A (8A)`. One function, used by the page and
 * by the test, so the two cannot format the same cell two ways.
 */
export function formatMoves(moves: CheatSheetMove[]): string {
  return moves
    .map((move) => (move.secondary ? `(${move.camelot})` : move.camelot))
    .join(", ")
}

/**
 * The numbers the prose quotes, computed rather than typed. The test asserts
 * the copy mentions exactly these, so a change to the table that alters them
 * fails the page instead of aging it.
 */
export function cheatSheetCounts(): {
  keys: number
  levels: number
  /** Recommended targets per key, which the table keeps constant. */
  targetsPerKey: number
  /** All recommended moves across the wheel. */
  totalMoves: number
} {
  const rows = cheatSheetMoves()
  const perKey = rows.map((row) =>
    HARMONIC_LEVELS.reduce((sum, level) => sum + row.moves[level].length, 0)
  )
  const targetsPerKey = perKey.every((count) => count === perKey[0]) ? perKey[0] : NaN

  return {
    keys: rows.length,
    levels: HARMONIC_LEVELS.length,
    targetsPerKey,
    totalMoves: perKey.reduce((sum, count) => sum + count, 0),
  }
}
