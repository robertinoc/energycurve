import type { PlaylistContext, SupportedGenre } from "@/lib/product/strategy"

/**
 * THE EXAMPLE SET shown on the dashboard to someone who hasn't imported anything
 * yet (docs/conversion-plan.md, step 1.1). Data only: the screen that shows it is
 * components/dashboard/example-set-preview.tsx, and the analysis is the real
 * engine, run over these rows by lib/product/example-set-analysis.ts.
 *
 * ── How to replace it ─────────────────────────────────────────────────────────
 * 1. Replace the rows in EXAMPLE_SET_TRACKS with the real set, in playing order:
 *    artist, track name, BPM, key in Camelot ("8A"), energy 1–10 as your DJ
 *    software tags it, and length in seconds. Leave a cell `null` only if the
 *    real file has no value — the example should show the good case.
 * 2. Set EXAMPLE_SET_GENRE and EXAMPLE_SET_CONTEXT to how that set is played.
 * 3. Set EXAMPLE_SET_IS_PLACEHOLDER to false.
 * 4. Run `npx vitest run tests/example-set.test.ts`: it checks the rows are
 *    plausible and that the engine still finds something worth showing.
 * Nothing else changes: the curve, the score and the problems are recomputed.
 *
 * ── What is here now ──────────────────────────────────────────────────────────
 * A PLACEHOLDER, to be replaced before this ships. Invented and illustrative on
 * purpose: generic names that are nobody's tracklist and attribute nothing to
 * any real artist. The numbers are not: a house main-time set of fourteen
 * tracks, 122 → 126 BPM, six-to-seven-minute tracks, keys that mostly move one
 * step on the wheel, with the flaws a real set has — a jump too early and a
 * stretch that stalls. A demo that scores 9.8 draws a chart and teaches nothing.
 */

export const EXAMPLE_SET_IS_PLACEHOLDER = true

export const EXAMPLE_SET_GENRE: SupportedGenre = "house"
export const EXAMPLE_SET_CONTEXT: PlaylistContext = "main"

export interface ExampleSetTrack {
  artist: string
  name: string
  bpm: number | null
  /** Camelot notation, e.g. "8A". */
  key: string | null
  /** 1–10, as the DJ software tags it. */
  energy: number | null
  durationSeconds: number | null
}

const row = (
  n: number,
  bpm: number,
  key: string,
  energy: number,
  durationSeconds: number
): ExampleSetTrack => ({
  artist: "Example artist",
  name: `Example track ${String(n).padStart(2, "0")}`,
  bpm,
  key,
  energy,
  durationSeconds,
})

export const EXAMPLE_SET_TRACKS: ExampleSetTrack[] = [
  row(1, 122, "8A", 6, 412),
  row(2, 122, "8A", 6, 388),
  row(3, 123, "9A", 9, 371),
  row(4, 123, "9A", 7, 395),
  row(5, 124, "10A", 7, 402),
  row(6, 124, "10A", 7, 366),
  row(7, 124, "10A", 7, 418),
  row(8, 125, "11A", 7, 379),
  row(9, 125, "11A", 8, 391),
  row(10, 125, "12A", 8, 384),
  row(11, 126, "12A", 9, 405),
  row(12, 126, "1A", 9, 372),
  row(13, 125, "1A", 8, 398),
  row(14, 124, "12A", 7, 421),
]
