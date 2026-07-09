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

  return MUSICAL_TO_CAMELOT[normalizeMusicalKey(raw)] ?? null
}
