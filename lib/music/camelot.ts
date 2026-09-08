/**
 * Musical key → Camelot wheel notation.
 *
 * DJ software stores keys in different notations (Rekordbox "Tonality" tends to
 * be musical like "Bbm" or Open Key; Traktor is usually musical too). DJs read
 * either musical or Camelot depending on habit, so the tracklist shows both. This
 * is a pure lookup with no coloring — Camelot is displayed as neutral text on
 * purpose (see decision: sorting by key must not imply a "harmonically optimal"
 * set through color).
 *
 * Returns null when the key is empty/unrecognized (e.g. already-Camelot values
 * like "8A", or unknown strings) so the caller can fall back to showing the raw
 * value.
 */

const MUSICAL_TO_CAMELOT: Record<string, string> = {
  // Minor keys → "A" ring
  "Abm": "1A", "G#m": "1A",
  "Ebm": "2A", "D#m": "2A",
  "Bbm": "3A", "A#m": "3A",
  "Fm": "4A",
  "Cm": "5A",
  "Gm": "6A",
  "Dm": "7A",
  "Am": "8A",
  "Em": "9A",
  "Bm": "10A",
  "F#m": "11A", "Gbm": "11A",
  "Dbm": "12A", "C#m": "12A",
  // Major keys → "B" ring
  "B": "1B",
  "F#": "2B", "Gb": "2B",
  "Db": "3B", "C#": "3B",
  "Ab": "4B", "G#": "4B",
  "Eb": "5B", "D#": "5B",
  "Bb": "6B", "A#": "6B",
  "F": "7B",
  "C": "8B",
  "G": "9B",
  "D": "10B",
  "A": "11B",
  "E": "12B",
}

/**
 * True when a value is already Camelot notation (e.g. "8A", "12B", "8 A").
 *
 * The optional space is deliberate: taggers write "8 A" and this used to fall
 * through to the raw string. Spotted by comparing against an alpha user's own
 * `key_normalizer.py`, whose regexes allowed `\s*` between the number and the
 * mode where ours did not.
 */
export function isCamelot(value: string): boolean {
  return /^(?:[1-9]|1[0-2])\s*[AB]$/i.test(value.trim())
}

/**
 * Traktor exports keys in Open Key notation: 1–12 + "m" (minor) / "d" (dur =
 * major), e.g. "11m", "9d". Same wheel as Camelot, rotated by 7: Open Key 1d
 * = C major = Camelot 8B, Open Key 1m = A minor = Camelot 8A.
 */
const OPEN_KEY_PATTERN = /^(?:[1-9]|1[0-2])\s*[md]$/i

function openKeyToCamelot(value: string): string | null {
  const match = value.trim().match(/^([1-9]|1[0-2])\s*([md])$/i)

  if (!match) {
    return null
  }

  const openNumber = Number.parseInt(match[1], 10)
  const camelotNumber = ((openNumber + 6) % 12) + 1
  const ring = match[2].toLowerCase() === "m" ? "A" : "B"

  return `${camelotNumber}${ring}`
}

/**
 * Normalizes a musical key string ("A minor", "Am", "AMin", "Amin", "AB MINOR",
 * "F#m") to the compact form used by the lookup ("Am", "F#m").
 *
 * Works on the space-free form rather than on word boundaries. The previous
 * version anchored the mode suffix with `\b`, so "A min" resolved and "Amin"
 * did not — there is no boundary inside a single word. Both spellings are in
 * the wild, and a DJ who writes one has no way to know we only read the other.
 */
function normalizeMusicalKey(raw: string): string {
  const compact = raw.trim().replace(/\s+/g, "")
  const suffix = compact.match(/(minor|min|major|maj)$/i)

  const isMinor = suffix
    ? /^min/i.test(suffix[1])
    : // No spelled-out mode: a trailing "m" is the compact minor marker.
      /m$/i.test(compact)

  const stem = suffix
    ? compact.slice(0, -suffix[1].length)
    : compact.replace(/m$/i, "")

  // Canonical case for a note plus optional accidental: "AB" → "Ab", "bb" →
  // "Bb". Lowercasing the tail is safe because a stem is at most two
  // characters, and "#" is unaffected by case.
  const key =
    stem.length > 0 ? stem[0].toUpperCase() + stem.slice(1).toLowerCase() : stem

  return isMinor ? key + "m" : key
}

/**
 * Traktor's numeric MUSICAL_KEY VALUE (0–23): 0–11 are majors C, Db, D … B;
 * 12–23 are minors C, Db, D … B. Verified against 24 real tracks carrying
 * both the numeric value and a text key (B17). Returned as Open Key text
 * (Traktor's own display notation), which toCamelot converts.
 */
const NOTE_BY_INDEX = [
  "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B",
] as const

const OPEN_KEY_MAJOR: Record<string, string> = {
  C: "1d", G: "2d", D: "3d", A: "4d", E: "5d", B: "6d",
  Gb: "7d", Db: "8d", Ab: "9d", Eb: "10d", Bb: "11d", F: "12d",
}

const OPEN_KEY_MINOR: Record<string, string> = {
  A: "1m", E: "2m", B: "3m", Gb: "4m", Db: "5m", Ab: "6m",
  Eb: "7m", Bb: "8m", F: "9m", C: "10m", G: "11m", D: "12m",
}

export function musicalKeyValueToOpenKey(value: number): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 23) {
    return null
  }

  const note = NOTE_BY_INDEX[value % 12]

  return value < 12 ? OPEN_KEY_MAJOR[note] : OPEN_KEY_MINOR[note]
}

/**
 * Inverse of musicalKeyValueToOpenKey, derived from the SAME tables so the
 * round-trip is exact by construction. Traktor's Key column reads the numeric
 * MUSICAL_KEY VALUE — a text-only `INFO KEY` renders as an empty Key column,
 * which is why exported NMLs showed no keys in Traktor.
 */
const TRAKTOR_VALUE_BY_CAMELOT: Record<string, number> = (() => {
  const map: Record<string, number> = {}

  NOTE_BY_INDEX.forEach((note, index) => {
    const major = toCamelot(OPEN_KEY_MAJOR[note])
    const minor = toCamelot(OPEN_KEY_MINOR[note])

    if (major) {
      map[major] = index
    }

    if (minor) {
      map[minor] = index + 12
    }
  })

  return map
})()

/** Any key notation (Camelot "8A", Open Key "11m", musical "Am") → Traktor's
 * numeric MUSICAL_KEY VALUE (0–23), or null when unmappable. */
export function musicalKeyToTraktorValue(
  key: string | null | undefined
): number | null {
  const camelot = toCamelot(key)

  return camelot ? (TRAKTOR_VALUE_BY_CAMELOT[camelot] ?? null) : null
}

export interface CamelotPosition {
  /** 1–12 wheel position. */
  num: number
  /** A = minor ring, B = major ring. */
  ring: "A" | "B"
}

/** Parses a Camelot code ("8A", "12b") into its wheel position, else null. */
export function parseCamelot(value: string | null | undefined): CamelotPosition | null {
  if (!value) {
    return null
  }

  const match = value.trim().match(/^([1-9]|1[0-2])\s*([AB])$/i)

  if (!match) {
    return null
  }

  return {
    num: Number.parseInt(match[1], 10),
    ring: match[2].toUpperCase() as "A" | "B",
  }
}

export type HarmonicTier = "perfect" | "smooth" | "boost" | "clash" | "unknown"

/**
 * Harmonic compatibility of a transition on the Camelot wheel (B18):
 * - perfect: same key
 * - smooth: ±1 on the same ring (wrapping 12↔1) or the relative major/minor
 *   (same number, other ring) — the classic harmonic-mixing moves
 * - boost: +2 on the same ring (the "energy boost" jump — usable, not seamless)
 * - clash: everything else
 * - unknown: either key missing/unparseable
 */
export function harmonicTier(
  from: string | null | undefined,
  to: string | null | undefined
): HarmonicTier {
  const a = parseCamelot(from ? toCamelot(from) : null)
  const b = parseCamelot(to ? toCamelot(to) : null)

  if (!a || !b) {
    return "unknown"
  }

  const wheelDistance = Math.min(
    (a.num - b.num + 12) % 12,
    (b.num - a.num + 12) % 12
  )

  if (wheelDistance === 0) {
    return a.ring === b.ring ? "perfect" : "smooth"
  }

  if (wheelDistance === 1 && a.ring === b.ring) {
    return "smooth"
  }

  if (wheelDistance === 2 && a.ring === b.ring) {
    return "boost"
  }

  return "clash"
}

/**
 * Converts a musical key to Camelot, or returns null when it can't be mapped.
 * If the input is already Camelot it is returned uppercased.
 */
export function toCamelot(musicalKey: string | null | undefined): string | null {
  if (!musicalKey) {
    return null
  }

  const raw = musicalKey.trim()
  if (!raw) {
    return null
  }

  if (isCamelot(raw)) {
    // Rebuilt rather than uppercased, so an accepted "8 a" comes back as "8A"
    // instead of carrying its space into every comparison downstream.
    const position = parseCamelot(raw)

    return position ? `${position.num}${position.ring}` : null
  }

  if (OPEN_KEY_PATTERN.test(raw)) {
    return openKeyToCamelot(raw)
  }

  return MUSICAL_TO_CAMELOT[normalizeMusicalKey(raw)] ?? null
}

// --- Notation the DJ actually reads ----------------------------------------

/**
 * The three notations DJ software writes keys in.
 *
 * An alpha user asked for exactly this — "selección de modelo de Key (CAMELOT,
 * Open Key, Musical) o conversor interno" — and he was right that the second
 * half was missing. This file only ever converted *into* Camelot: it could read
 * any notation and show one. So a DJ who reads Open Key (what Traktor displays)
 * or musical notation had to translate every row in their head.
 *
 * `as_imported` is a real answer, not a cop-out: someone whose library is
 * already consistent may want to see their own strings back rather than ours.
 */
export type KeyNotation = "camelot" | "open_key" | "musical" | "as_imported"

export const KEY_NOTATIONS: KeyNotation[] = [
  "camelot",
  "open_key",
  "musical",
  "as_imported",
]

export const DEFAULT_KEY_NOTATION: KeyNotation = "camelot"

export function isKeyNotation(
  value: string | null | undefined
): value is KeyNotation {
  return KEY_NOTATIONS.includes(value as KeyNotation)
}

/**
 * Camelot → Open Key. Inverse of `openKeyToCamelot`, and derived by the same
 * rotation so the two can't disagree: Camelot 8 = Open Key 1.
 */
export function camelotToOpenKey(camelot: string | null | undefined): string | null {
  const position = parseCamelot(toCamelot(camelot))

  if (!position) {
    return null
  }

  const openNumber = ((position.num + 4) % 12) + 1

  return `${openNumber}${position.ring === "A" ? "m" : "d"}`
}

/**
 * Camelot → musical, built by inverting MUSICAL_TO_CAMELOT.
 *
 * Where two spellings share a Camelot code (Bbm and A#m are one key), the first
 * one declared wins, which is the flat spelling throughout — the convention
 * both Rekordbox and Mixed In Key display.
 */
const CAMELOT_TO_MUSICAL: Record<string, string> = (() => {
  const map: Record<string, string> = {}

  for (const [musical, camelot] of Object.entries(MUSICAL_TO_CAMELOT)) {
    if (!(camelot in map)) {
      map[camelot] = musical
    }
  }

  return map
})()

export function camelotToMusical(camelot: string | null | undefined): string | null {
  const normalized = toCamelot(camelot)

  return normalized ? (CAMELOT_TO_MUSICAL[normalized] ?? null) : null
}

/** Which notation a stored key string is written in. */
export function detectKeyNotation(
  value: string | null | undefined
): Exclude<KeyNotation, "as_imported"> | null {
  if (!value) {
    return null
  }

  const raw = value.trim()

  if (isCamelot(raw)) {
    return "camelot"
  }

  if (OPEN_KEY_PATTERN.test(raw)) {
    return "open_key"
  }

  return MUSICAL_TO_CAMELOT[normalizeMusicalKey(raw)] ? "musical" : null
}

/**
 * Renders a stored key in the notation the reader asked for.
 *
 * Returns the raw string unchanged when it can't be mapped — a key we don't
 * recognise is still the DJ's data, and blanking it would lose information to
 * make a column tidier. `as_imported` short-circuits to exactly that.
 */
export function formatKey(
  value: string | null | undefined,
  notation: KeyNotation
): string | null {
  if (!value?.trim()) {
    return null
  }

  const raw = value.trim()

  if (notation === "as_imported") {
    return raw
  }

  const converted =
    notation === "camelot"
      ? toCamelot(raw)
      : notation === "open_key"
        ? camelotToOpenKey(raw)
        : camelotToMusical(raw)

  return converted ?? raw
}

/**
 * A sortable index for a key: wheel position, then ring.
 *
 * Sorting the rendered strings would order "10A" before "2A" and put Open Key
 * and Camelot in different orders for the same set of tracks. Sorting by
 * position means "sort by key" groups harmonically compatible tracks together
 * in every notation, which is the only reason anyone sorts by key.
 *
 * Unmappable keys sort last rather than first: they are the rows a DJ wants to
 * find and fix, not the rows they want at the top of every sort.
 */
export function keySortIndex(value: string | null | undefined): number {
  const position = parseCamelot(toCamelot(value))

  if (!position) {
    return Number.MAX_SAFE_INTEGER
  }

  return position.num * 2 + (position.ring === "B" ? 1 : 0)
}
