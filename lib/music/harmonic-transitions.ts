/**
 * The harmonic transition table (2026-09-16), and the BPM margin that goes
 * with it.
 *
 * Contributed by the alpha user who sent the wheel palette, from the reference
 * file he mixes by. He is explicit about its status: it "sustituye cualquier
 * heurística de distancia en el círculo Camelot" — it replaces the
 * clockwise/anticlockwise distance rule, it does not decorate it.
 *
 * We audited it before adopting it (`docs/feedback-2026-09-16-jordi-harmony-table.md`):
 * 24 rows, 12 recommended targets each, the relation is symmetric, and every
 * cell falls out of one rule — **the column is the pitch shift of the tonic**:
 *
 * | Column          | Move (from A minor)        | Shift            |
 * |-----------------|----------------------------|------------------|
 * | Perfect match   | Am → Am, Am → G            | same, or one accidental away |
 * | Energy Boost +  | Am → C, Am → Em            | relative major, or up a fifth |
 * | Energy Boost ++ | Am → Cm                    | +3 semitones     |
 * | Energy Boost +++| Am → Bm, (Am → A#m)        | +2, secondary +1 |
 * | Energy Drop -   | Am → Dm                    | down a fifth     |
 * | Energy Drop --  | Am → F#m                   | −3 semitones     |
 * | Energy Drop --- | Am → Gm, (Am → G#m)        | −2, secondary −1 |
 * | Mood Change     | Am → A                     | parallel major   |
 *
 * That is why the table is worth adopting whole rather than cherry-picking:
 * it is one coherent model, and the wheel-distance heuristic it replaces was a
 * lossy approximation of it. Against our previous rules it adds 144 of the 288
 * recommended moves — **half the harmonically valid mixes in the wheel were
 * reported as clashes** — and removes none.
 *
 * The table is transcribed literally, parentheses and all, so it can be diffed
 * against his markdown by eye. Nothing here is derived from a formula: the
 * formula is in the tests, where it belongs as a check.
 */

/** The eight columns of the table, in the order he wrote them. */
export type HarmonicLevel =
  | "perfect"
  | "boost_1"
  | "boost_2"
  | "boost_3"
  | "drop_1"
  | "drop_2"
  | "drop_3"
  | "mood"

export const HARMONIC_LEVELS: readonly HarmonicLevel[] = [
  "perfect",
  "boost_1",
  "boost_2",
  "boost_3",
  "drop_1",
  "drop_2",
  "drop_3",
  "mood",
]

/**
 * Which option within a column a move is.
 *
 * The table marks the second choice of a level in parentheses — `3A, (8A)` —
 * and it matters: both are that level, but the parenthesised one is the
 * fallback when the primary isn't in the crate. Reported, never scored
 * differently.
 */
export type HarmonicOption = "primary" | "secondary"

export interface HarmonicTableMove {
  level: HarmonicLevel
  option: HarmonicOption
}

export type HarmonicTableRow = Readonly<Record<HarmonicLevel, readonly string[]>>

/**
 * Section 2.2 of his file, verbatim. Row = the key playing now, cell = the
 * keys to go to for that level.
 */
export const HARMONIC_TRANSITION_TABLE: Readonly<
  Record<string, HarmonicTableRow>
> = {
  "1A":  { perfect: ["1A", "2B"],   boost_1: ["1B", "2A"],   boost_2: ["10A"], boost_3: ["3A", "(8A)"],   drop_1: ["12A"],        drop_2: ["4A"],  drop_3: ["11A", "(6A)"],  mood: ["4B"] },
  "2A":  { perfect: ["2A", "3B"],   boost_1: ["2B", "3A"],   boost_2: ["11A"], boost_3: ["4A", "(9A)"],   drop_1: ["1A"],         drop_2: ["5A"],  drop_3: ["12A", "(7A)"],  mood: ["5B"] },
  "3A":  { perfect: ["3A", "4B"],   boost_1: ["3B", "4A"],   boost_2: ["12A"], boost_3: ["5A", "(10A)"],  drop_1: ["2A"],         drop_2: ["6A"],  drop_3: ["1A", "(8A)"],   mood: ["6B"] },
  "4A":  { perfect: ["4A", "5B"],   boost_1: ["4B", "5A"],   boost_2: ["1A"],  boost_3: ["6A", "(11A)"],  drop_1: ["3A"],         drop_2: ["7A"],  drop_3: ["2A", "(9A)"],   mood: ["7B"] },
  "5A":  { perfect: ["5A", "6B"],   boost_1: ["5B", "6A"],   boost_2: ["2A"],  boost_3: ["7A", "(12A)"],  drop_1: ["4A"],         drop_2: ["8A"],  drop_3: ["3A", "(10A)"],  mood: ["8B"] },
  "6A":  { perfect: ["6A", "7B"],   boost_1: ["6B", "7A"],   boost_2: ["3A"],  boost_3: ["8A", "(1A)"],   drop_1: ["5A"],         drop_2: ["9A"],  drop_3: ["4A", "(11A)"],  mood: ["9B"] },
  "7A":  { perfect: ["7A", "8B"],   boost_1: ["7B", "8A"],   boost_2: ["4A"],  boost_3: ["9A", "(2A)"],   drop_1: ["6A"],         drop_2: ["10A"], drop_3: ["5A", "(12A)"],  mood: ["10B"] },
  "8A":  { perfect: ["8A", "9B"],   boost_1: ["8B", "9A"],   boost_2: ["5A"],  boost_3: ["10A", "(3A)"],  drop_1: ["7A"],         drop_2: ["11A"], drop_3: ["6A", "(1A)"],   mood: ["11B"] },
  "9A":  { perfect: ["9A", "10B"],  boost_1: ["9B", "10A"],  boost_2: ["6A"],  boost_3: ["11A", "(4A)"],  drop_1: ["8A"],         drop_2: ["12A"], drop_3: ["7A", "(2A)"],   mood: ["12B"] },
  "10A": { perfect: ["10A", "11B"], boost_1: ["10B", "11A"], boost_2: ["7A"],  boost_3: ["12A", "(5A)"],  drop_1: ["9A"],         drop_2: ["1A"],  drop_3: ["8A", "(3A)"],   mood: ["1B"] },
  "11A": { perfect: ["11A", "12B"], boost_1: ["11B", "12A"], boost_2: ["8A"],  boost_3: ["1A", "(6A)"],   drop_1: ["10A"],        drop_2: ["2A"],  drop_3: ["9A", "(4A)"],   mood: ["2B"] },
  "12A": { perfect: ["12A", "1B"],  boost_1: ["12B", "1A"],  boost_2: ["9A"],  boost_3: ["2A", "(7A)"],   drop_1: ["11A"],        drop_2: ["3A"],  drop_3: ["10A", "(5A)"],  mood: ["3B"] },
  "1B":  { perfect: ["1B", "12A"],  boost_1: ["2B"],         boost_2: ["10B"], boost_3: ["3B", "(8B)"],   drop_1: ["1A", "12B"],  drop_2: ["4B"],  drop_3: ["11B", "(6B)"],  mood: ["10A"] },
  "2B":  { perfect: ["2B", "1A"],   boost_1: ["3B"],         boost_2: ["11B"], boost_3: ["4B", "(9B)"],   drop_1: ["2A", "1B"],   drop_2: ["5B"],  drop_3: ["12B", "(7B)"],  mood: ["11A"] },
  "3B":  { perfect: ["3B", "2A"],   boost_1: ["4B"],         boost_2: ["12B"], boost_3: ["5B", "(10B)"],  drop_1: ["3A", "2B"],   drop_2: ["6B"],  drop_3: ["1B", "(8B)"],   mood: ["12A"] },
  "4B":  { perfect: ["4B", "3A"],   boost_1: ["5B"],         boost_2: ["1B"],  boost_3: ["6B", "(11B)"],  drop_1: ["4A", "3B"],   drop_2: ["7B"],  drop_3: ["2B", "(9B)"],   mood: ["1A"] },
  "5B":  { perfect: ["5B", "4A"],   boost_1: ["6B"],         boost_2: ["2B"],  boost_3: ["7B", "(12B)"],  drop_1: ["5A", "4B"],   drop_2: ["8B"],  drop_3: ["3B", "(10B)"],  mood: ["2A"] },
  "6B":  { perfect: ["6B", "5A"],   boost_1: ["7B"],         boost_2: ["3B"],  boost_3: ["8B", "(1B)"],   drop_1: ["6A", "5B"],   drop_2: ["9B"],  drop_3: ["4B", "(11B)"],  mood: ["3A"] },
  "7B":  { perfect: ["7B", "6A"],   boost_1: ["8B"],         boost_2: ["4B"],  boost_3: ["9B", "(2B)"],   drop_1: ["7A", "6B"],   drop_2: ["10B"], drop_3: ["5B", "(12B)"],  mood: ["4A"] },
  "8B":  { perfect: ["8B", "7A"],   boost_1: ["9B"],         boost_2: ["5B"],  boost_3: ["10B", "(3B)"],  drop_1: ["8A", "7B"],   drop_2: ["11B"], drop_3: ["6B", "(1B)"],   mood: ["5A"] },
  "9B":  { perfect: ["9B", "8A"],   boost_1: ["10B"],        boost_2: ["6B"],  boost_3: ["11B", "(4B)"],  drop_1: ["9A", "8B"],   drop_2: ["12B"], drop_3: ["7B", "(2B)"],   mood: ["6A"] },
  "10B": { perfect: ["10B", "9A"],  boost_1: ["11B"],        boost_2: ["7B"],  boost_3: ["12B", "(5B)"],  drop_1: ["10A", "9B"],  drop_2: ["1B"],  drop_3: ["8B", "(3B)"],   mood: ["7A"] },
  "11B": { perfect: ["11B", "10A"], boost_1: ["12B"],        boost_2: ["8B"],  boost_3: ["1B", "(6B)"],   drop_1: ["11A", "10B"], drop_2: ["2B"],  drop_3: ["9B", "(4B)"],   mood: ["8A"] },
  "12B": { perfect: ["12B", "11A"], boost_1: ["1B"],         boost_2: ["9B"],  boost_3: ["2B", "(7B)"],   drop_1: ["12A", "11B"], drop_2: ["3B"],  drop_3: ["10B", "(5B)"],  mood: ["9A"] },
}

/**
 * Position of a Camelot code in a 24-slot lane: `(num - 1) * 2`, +1 on the B
 * ring. Used to reach the lookup by integer arithmetic.
 *
 * The reorder optimizer evaluates transitions inside an O(n³) search, and the
 * last round of this work (#224) was spent removing string parsing from that
 * loop. Adopting a lookup table must not put it back: no string is built and
 * no map is hashed per comparison, only two integers and an array read.
 */
export function harmonicIndex(num: number, ring: "A" | "B"): number {
  return (num - 1) * 2 + (ring === "B" ? 1 : 0)
}

/** 24×24 grid of `harmonicIndex(from)` → `harmonicIndex(to)` → the move. */
const MOVE_BY_INDEX: Array<Array<HarmonicTableMove | null>> = (() => {
  const grid: Array<Array<HarmonicTableMove | null>> = Array.from(
    { length: 24 },
    () => Array.from({ length: 24 }, () => null)
  )

  for (const [from, row] of Object.entries(HARMONIC_TRANSITION_TABLE)) {
    const fromIndex = indexOfCode(from)

    for (const level of HARMONIC_LEVELS) {
      for (const cell of row[level]) {
        const option: HarmonicOption = cell.startsWith("(")
          ? "secondary"
          : "primary"

        grid[fromIndex][indexOfCode(cell.replace(/[()]/g, ""))] = {
          level,
          option,
        }
      }
    }
  }

  return grid
})()

function indexOfCode(code: string): number {
  const num = Number.parseInt(code, 10)

  return harmonicIndex(num, code.endsWith("B") ? "B" : "A")
}

/**
 * The table's verdict for a move, by lane index, or null for a key that does
 * not appear in that row at all — "no recomendada", in his words.
 */
export function harmonicTableMoveAt(
  fromIndex: number,
  toIndex: number
): HarmonicTableMove | null {
  return MOVE_BY_INDEX[fromIndex]?.[toIndex] ?? null
}

/** The same lookup from Camelot codes, for callers outside the hot loop. */
export function harmonicTableMove(
  from: string,
  to: string
): HarmonicTableMove | null {
  const fromIndex = indexOfCode(from)
  const toIndex = indexOfCode(to)

  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) {
    return null
  }

  return harmonicTableMoveAt(fromIndex, toIndex)
}

// --- Section 2.3: the BPM margin -------------------------------------------

/**
 * "En toda mezcla armónica (crossfade), la diferencia entre el BPM de la pista
 * actual y el de la siguiente no puede superar el ±7%."
 *
 * Deliberately **not** in `lib/product/strategy.ts`: that file holds the frozen
 * constants the energy and reorder scores are computed from, and this changes
 * no score. It is reported next to a transition, the way a key is — a DJ can
 * see a 9% jump and decide, which is more use than a silently worse number.
 */
export const HARMONIC_BPM_MARGIN = 0.07

/**
 * How the incoming track's tempo was read, named from the DJ's side of the
 * booth: "half" means the next track is at half the tempo of the one playing
 * (174 into 87), whatever arithmetic we did to notice it.
 */
export type TempoRelation = "same" | "double" | "half"

export interface TempoGap {
  /**
   * Signed difference as a share of the outgoing track's BPM: +0.09 is "the
   * next track is 9% faster". That denominator is the one the DJ is working
   * against — the deck that is already playing.
   */
  ratio: number
  relation: TempoRelation
  /** True when |ratio| is past HARMONIC_BPM_MARGIN. */
  beyondMargin: boolean
}

/**
 * The tempo distance between two tracks, or null when either BPM is missing.
 *
 * Half- and double-time are matched rather than flagged. 174 into 87 is one
 * beat against two, not an 50% tempo jump, and a rule that calls every
 * drum'n'bass-into-halftime mix impossible would be wrong in exactly the sets
 * where it is loudest. His margin then applies to the matched tempo, which is
 * the number the crossfade actually has to survive.
 */
export function tempoGap(
  fromBpm: number | null | undefined,
  toBpm: number | null | undefined
): TempoGap | null {
  if (
    fromBpm == null ||
    toBpm == null ||
    !Number.isFinite(fromBpm) ||
    !Number.isFinite(toBpm) ||
    fromBpm <= 0 ||
    toBpm <= 0
  ) {
    return null
  }

  const candidates: Array<{ bpm: number; relation: TempoRelation }> = [
    { bpm: toBpm, relation: "same" },
    // Doubling the incoming BPM to reach the outgoing one means the next track
    // is the slow one.
    { bpm: toBpm * 2, relation: "half" },
    { bpm: toBpm / 2, relation: "double" },
  ]

  const closest = candidates.reduce((best, candidate) =>
    Math.abs(candidate.bpm - fromBpm) < Math.abs(best.bpm - fromBpm)
      ? candidate
      : best
  )

  const ratio = (closest.bpm - fromBpm) / fromBpm

  return {
    ratio,
    relation: closest.relation,
    beyondMargin: Math.abs(ratio) > HARMONIC_BPM_MARGIN,
  }
}
