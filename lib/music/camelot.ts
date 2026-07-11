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

/** True when a value is already Camelot notation (e.g. "8A", "12B"). */
export function isCamelot(value: string): boolean {
  return /^(?:[1-9]|1[0-2])[AB]$/i.test(value.trim())
}

/**
 * Traktor exports keys in Open Key notation: 1–12 + "m" (minor) / "d" (dur =
 * major), e.g. "11m", "9d". Same wheel as Camelot, rotated by 7: Open Key 1d
 * = C major = Camelot 8B, Open Key 1m = A minor = Camelot 8A.
 */
const OPEN_KEY_PATTERN = /^(?:[1-9]|1[0-2])[md]$/i

function openKeyToCamelot(value: string): string | null {
  const match = value.trim().match(/^([1-9]|1[0-2])([md])$/i)

  if (!match) {
    return null
  }

  const openNumber = Number.parseInt(match[1], 10)
  const camelotNumber = ((openNumber + 6) % 12) + 1
  const ring = match[2].toLowerCase() === "m" ? "A" : "B"

  return `${camelotNumber}${ring}`
}

/**
 * Normalizes a musical key string ("A minor", "Am", "AMin", "F#m") to the
 * compact form used by the lookup ("Am", "F#m").
 */
function normalizeMusicalKey(raw: string): string {
  let key = raw.trim().replace(/\s+/g, " ")
  // "A minor" / "A min" / "Amin" → "Am"; "A major" / "A maj" → "A"
  const minor = /\b(minor|min|m)\b/i.test(key) || /m$/i.test(key.replace(/\s/g, ""))
  key = key
    .replace(/\b(minor|min|major|maj)\b/gi, "")
    .replace(/\s+/g, "")
  // Strip a trailing lowercase "m" (we re-add it via the minor flag)
  key = key.replace(/m$/i, "")
  // Canonical case: note letter uppercase, accidental as-is
  if (key.length > 0) {
    key = key[0].toUpperCase() + key.slice(1)
  }
  return minor ? key + "m" : key
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

  const match = value.trim().match(/^([1-9]|1[0-2])([AB])$/i)

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
    return raw.toUpperCase()
  }

  if (OPEN_KEY_PATTERN.test(raw)) {
    return openKeyToCamelot(raw)
  }

  return MUSICAL_TO_CAMELOT[normalizeMusicalKey(raw)] ?? null
}
