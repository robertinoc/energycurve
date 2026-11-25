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
 * A real set: tracks 18 to 28, in playing order, of Robertino's "MINITEL RBRTN
 * - FULL SET", loaded on 25/11/2026 from its Traktor NML export with the repo's
 * own reader (lib/playlists/parse-traktor.ts). Keys are Traktor's Open Key
 * converted with toCamelot (lib/music/camelot.ts); energy is the "Energy N" in
 * each track's comment; lengths are the file's own. Real tracks by their real
 * artists — which is the point: the example is a set somebody played, not a
 * made-up work under someone's name. Hard techno, the middle of the night.
 */

export const EXAMPLE_SET_IS_PLACEHOLDER = false

export const EXAMPLE_SET_GENRE: SupportedGenre = "hard-techno"
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

export const EXAMPLE_SET_TRACKS: ExampleSetTrack[] = [
  { artist: "Laxter", name: "Lick It Harder", bpm: 155, key: "7A", energy: 8, durationSeconds: 272 },
  { artist: "KX CHR", name: "JUMP (Original Mix)", bpm: 155, key: "1A", energy: 8, durationSeconds: 221 },
  { artist: "KX CHR", name: "DARK SIDE Original Mix", bpm: 155, key: "12B", energy: 8, durationSeconds: 291 },
  { artist: "Vortek's, OMAKS, ENERGIC", name: "Morning Rave (Original Mix) [ENERGIC]", bpm: 158, key: "7B", energy: 9, durationSeconds: 262 },
  { artist: "AREA ØNE", name: "Psychedelics (Original Mix)", bpm: 155, key: "7B", energy: 8, durationSeconds: 301 },
  { artist: "Avicii", name: "Levels (CIRCO Edit)", bpm: 150, key: "7B", energy: 7, durationSeconds: 231 },
  { artist: "Koffeintablette, THE MANAGER", name: "BANG (Master)", bpm: 160, key: "6A", energy: 9, durationSeconds: 308 },
  { artist: "Brutalismus 3000", name: "Satan Was a Baby Boomer", bpm: 155, key: "5A", energy: 8, durationSeconds: 427 },
  { artist: "Timmy Trumpet, BENNETT (DE)", name: "Diamond Heart (Extended Mix)", bpm: 155, key: "5A", energy: 8, durationSeconds: 205 },
  { artist: "Bassjackers", name: "Beethoven's Aria Fur Elise (Extended Mix)", bpm: 145, key: "2A", energy: 5, durationSeconds: 241 },
  { artist: "Binary Squad", name: "Reincarnate (Original Mix) [No Mercy]", bpm: 160, key: "11A", energy: 9, durationSeconds: 288 },
]
