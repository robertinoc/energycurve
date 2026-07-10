import {
  GENRE_LABELS,
  SUPPORTED_GENRES,
  type SupportedGenre,
} from "@/lib/product/strategy"

/**
 * Free-text genre tag → SupportedGenre mapping. Lives outside parse-import so
 * the energy engine can anchor a track to its own tagged genre (B14) without
 * importing the parsers.
 */

function normalizeGenreToken(raw: string): string {
  return raw.toLowerCase().replace(/[\s_-]+/g, "")
}

// Precomputed lookup from a normalized genre string → our SupportedGenre.
// Includes the canonical labels plus common aliases DJs' tags use
// (Beatport-style names, store spellings, scene shorthand).
const GENRE_LOOKUP: Record<string, SupportedGenre> = (() => {
  const map: Record<string, SupportedGenre> = {}

  for (const genre of SUPPORTED_GENRES) {
    map[normalizeGenreToken(genre)] = genre
    map[normalizeGenreToken(GENRE_LABELS[genre])] = genre
  }

  // Aliases (normalized): map common tag spellings to our genres.
  const aliases: Record<string, SupportedGenre> = {
    progressivehouse: "progressive",
    proghouse: "progressive",
    psytrance: "psy-trance",
    psychedelictrance: "psy-trance",
    progressivepsytrance: "psy-trance",
    goatrance: "psy-trance",
    fullon: "psy-trance",
    melodichouse: "melodic-techno",
    melodichousetechno: "melodic-techno",
    afrohouse: "organic-house",
    minimaldeeptech: "tech-house",
    minimal: "tech-house",
    deeptech: "tech-house",
    industrialtechno: "hard-techno",
    schranz: "hard-techno",
    upliftingtrance: "trance",
    vocaltrance: "trance",
    melbournebounce: "bounce",
  }

  return { ...map, ...aliases }
})()

// Longest-first key list for containment matching: compound tags like
// "Techno (Peak Time / Driving)" or "Hard Techno Industrial" don't match
// exactly, but they contain a known genre token. Longest-first means
// "hardtechno" wins over "techno" inside the same tag.
const LOOKUP_KEYS_BY_LENGTH = Object.keys(GENRE_LOOKUP).sort(
  (a, b) => b.length - a.length || a.localeCompare(b)
)

/**
 * Maps a free-text genre tag to one of our genres, or null if no match.
 * Exact normalized match first; otherwise the longest known genre token
 * contained in the tag (B15) — so Beatport-style compound tags map instead
 * of being silently dropped.
 */
export function mapGenreTag(tag: string | null | undefined): SupportedGenre | null {
  if (!tag) {
    return null
  }

  const normalized = normalizeGenreToken(tag)

  if (!normalized) {
    return null
  }

  const exact = GENRE_LOOKUP[normalized]

  if (exact) {
    return exact
  }

  const contained = LOOKUP_KEYS_BY_LENGTH.find((key) =>
    normalized.includes(key)
  )

  return contained ? GENRE_LOOKUP[contained] : null
}
