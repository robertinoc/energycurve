import {
  camelotToMusical,
  camelotToOpenKey,
  detectKeyNotation,
  harmonicMove,
  parseCamelot,
  semitonesForTempoChange,
  toCamelot,
  transposeCamelot,
  type HarmonicMove,
  type HarmonicTier,
} from "@/lib/music/camelot"
import {
  HARMONIC_BPM_MARGIN,
  HARMONIC_TRANSITION_TABLE,
  type HarmonicLevel,
  tempoGap,
  type TempoGap,
} from "@/lib/music/harmonic-transitions"

/**
 * The two harmonic tools, built on the engine rather than beside it.
 *
 * **Not one new rule about what mixes.** Every verdict here comes from
 * `harmonicMove`, which reads the transition table the reorder optimizer scores
 * against — so the wheel, the calculator and the app cannot disagree about
 * whether 8A into 5A works. `tests/harmonic-tools.test.ts` asserts that across
 * all 576 pairs by comparing against `assessHarmony` itself.
 *
 * What is new is presentation: which keys to light up, and what to call a
 * tempo change.
 */

/** Every Camelot code, in wheel order: 1A, 1B, 2A, 2B … 12B. */
export const ALL_CAMELOT: readonly string[] = Array.from(
  { length: 12 },
  (_, index) => index + 1
).flatMap((num) => [`${num}A`, `${num}B`])

// --- The wheel --------------------------------------------------------------

export interface WheelNeighbour {
  camelot: string
  /** The transition table's own name for the move — `perfect`, `boost_2`, … */
  level: HarmonicLevel
  tier: HarmonicTier
  /** The table's parenthesised second choice for that level. */
  secondary: boolean
}

/**
 * The keys the table offers from `camelot`, grouped by what kind of move they
 * are.
 *
 * Read straight out of `HARMONIC_TRANSITION_TABLE` rather than recomputed from
 * wheel distance, because distance is what the table replaced: the same number
 * of hours means different things on the two rings, and the old heuristic
 * called half the valid moves a clash.
 */
export function compatibleKeys(camelot: string): WheelNeighbour[] {
  const row = HARMONIC_TRANSITION_TABLE[toCamelot(camelot) ?? ""]

  if (!row) {
    return []
  }

  const seen = new Set<string>()
  const out: WheelNeighbour[] = []

  for (const [level, targets] of Object.entries(row) as Array<
    [HarmonicLevel, readonly string[]]
  >) {
    for (const raw of targets) {
      // The table marks a level's fallback in parentheses: "3A, (8A)".
      const secondary = raw.startsWith("(")
      const target = raw.replace(/[()]/g, "")

      // A key can appear under two levels; the first wins, and the table is
      // declared best-move-first.
      if (seen.has(target)) {
        continue
      }

      seen.add(target)
      out.push({
        camelot: target,
        level,
        tier: harmonicMove(camelot, target).tier,
        secondary,
      })
    }
  }

  return out
}

export interface KeyRow {
  camelot: string
  openKey: string
  /** The compact spelling DJ software writes: `Am`, `Abm`, `C`. */
  abbreviation: string
  minor: boolean
  /** Index into the twelve note names, for the spoken name in each language. */
  noteIndex: number
}

/**
 * The 24 keys, with every notation a DJ might be reading.
 *
 * Built from the converters rather than typed out: a hand-written table of 24
 * rows in four notations is 96 chances to make a typo that nobody notices until
 * a DJ trusts it.
 */
export function keyTable(): KeyRow[] {
  return ALL_CAMELOT.map((camelot) => {
    const abbreviation = camelotToMusical(camelot) ?? camelot
    const minor = abbreviation.endsWith("m")
    const root = minor ? abbreviation.slice(0, -1) : abbreviation

    return {
      camelot,
      openKey: camelotToOpenKey(camelot) ?? camelot,
      abbreviation,
      minor,
      noteIndex: noteIndexOf(root),
    }
  })
}

/**
 * The twelve roots, in semitone order from C.
 *
 * Mostly flats, because that is what `camelotToMusical` returns — but not
 * uniformly: the engine's table declares `F#` before `Gb` and `F#m` before
 * `Gbm`, so those two codes come back sharp. Both spellings map to the same
 * index here rather than assuming a convention the data doesn't keep.
 */
const NOTE_ORDER = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const

/** Sharp spellings to the flat they share a pitch with. */
const ENHARMONIC: Record<string, string> = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
}

function noteIndexOf(root: string): number {
  return NOTE_ORDER.indexOf(
    (ENHARMONIC[root] ?? root) as (typeof NOTE_ORDER)[number]
  )
}

// --- The calculator ---------------------------------------------------------

/** What a deck's pitch fader can do. A property of the equipment, not of music. */
export const PITCH_RANGES = [6, 8, 16] as const
export type PitchRange = (typeof PITCH_RANGES)[number]

export interface TrackInput {
  /** Any notation: Camelot, Open Key, or musical. Empty is allowed. */
  key: string
  /** As typed. Empty or unparseable reads as absent. */
  bpm: string
}

export interface PitchedKey {
  /** Exact semitones the pitch moves, signed. +6% is 1.0088, not 1. */
  semitones: number
  /** Where the key lands, rounded to the nearest whole semitone. */
  camelot: string | null
  /** True when the shift is far enough from a whole semitone to be out of tune. */
  approximate: boolean
}

export interface CompatibilityResult {
  from: { camelot: string | null; bpm: number | null }
  to: { camelot: string | null; bpm: number | null }
  /** Null when either key is missing or unreadable — unknown is not a clash. */
  move: HarmonicMove | null
  /** Null when either BPM is missing. */
  tempo: TempoGap | null
  /**
   * Whether the tempo change fits the fader, per range.
   *
   * Deliberately separate from `tempo.beyondMargin`, which is the engine's
   * judgement about what a crossfade survives. They answer different questions
   * and a 7.5% move can pass one and fail the other; folding them into one
   * verdict would be a lie in both directions.
   */
  withinPitchRange: Record<PitchRange, boolean> | null
  /** Where track B's key ends up if it is pitched to match A, with no key lock. */
  pitchedKey: PitchedKey | null
}

/** The engine's own crossfade margin, re-exported so a page can state it. */
export { HARMONIC_BPM_MARGIN }

function readBpm(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(",", "."))

  return Number.isFinite(parsed) && parsed > 0 && parsed < 400 ? parsed : null
}

/** A key in any notation, as Camelot — or null when it isn't a key we know. */
export function readKey(value: string): string | null {
  const trimmed = value.trim()

  if (!trimmed || !detectKeyNotation(trimmed)) {
    return null
  }

  const camelot = toCamelot(trimmed)

  return camelot && parseCamelot(camelot) ? camelot : null
}

export function checkCompatibility(
  a: TrackInput,
  b: TrackInput,
  { pitchLock = false }: { pitchLock?: boolean } = {}
): CompatibilityResult {
  const fromKey = readKey(a.key)
  const toKey = readKey(b.key)
  const fromBpm = readBpm(a.bpm)
  const toBpm = readBpm(b.bpm)

  const tempo = tempoGap(fromBpm, toBpm)
  const move = fromKey && toKey ? harmonicMove(fromKey, toKey) : null

  // Track B is the one being pitched to land on A, so the shift it undergoes is
  // the one that closes the gap — the negative of A-relative-to-B.
  const pitched: PitchedKey | null =
    tempo && toKey && !pitchLock
      ? (() => {
          // B plays `tempo.ratio` faster than A, so to sit on A it must change
          // by 1/(1+ratio) — i.e. by -ratio/(1+ratio). Slowing a record down
          // lowers its pitch, which is why this comes out negative for a B that
          // was too fast.
          const shift = -tempo.ratio / (1 + tempo.ratio)
          const semitones = semitonesForTempoChange(shift)
          const rounded = Math.round(semitones)

          return {
            semitones,
            camelot: transposeCamelot(toKey, rounded),
            // A quarter-tone off is audible; past that the "new key" is a
            // label for something between two keys.
            approximate: Math.abs(semitones - rounded) > 0.25,
          }
        })()
      : null

  return {
    from: { camelot: fromKey, bpm: fromBpm },
    to: { camelot: toKey, bpm: toBpm },
    move,
    tempo,
    withinPitchRange: tempo
      ? (Object.fromEntries(
          PITCH_RANGES.map((range) => [
            range,
            Math.abs(tempo.ratio) * 100 <= range,
          ])
        ) as Record<PitchRange, boolean>)
      : null,
    pitchedKey: pitched,
  }
}
