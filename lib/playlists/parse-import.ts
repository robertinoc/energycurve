import {
  GENRE_LABELS,
  SUPPORTED_GENRES,
  type SupportedGenre,
} from "@/lib/product/strategy"
import type { ImportedTrack, ParsedImport } from "@/lib/playlists/imported-track"
import { isRekordboxXml, parseRekordbox } from "@/lib/playlists/parse-rekordbox"
import { isTraktorNml, parseTraktor } from "@/lib/playlists/parse-traktor"

export class UnsupportedImportError extends Error {}

/**
 * Detects the export format and parses it. Rekordbox and Traktor are both
 * XML but with distinct roots (DJ_PLAYLISTS vs NML). Throws
 * UnsupportedImportError for anything else.
 */
export function parseImport(fileContents: string): ParsedImport {
  if (isRekordboxXml(fileContents)) {
    return parseRekordbox(fileContents)
  }

  if (isTraktorNml(fileContents)) {
    return parseTraktor(fileContents)
  }

  throw new UnsupportedImportError(
    "Unrecognized file. Export a playlist as Rekordbox XML or Traktor NML."
  )
}

function normalizeGenreToken(raw: string): string {
  return raw.toLowerCase().replace(/[\s_-]+/g, "")
}

// Precomputed lookup from a normalized genre string → our SupportedGenre.
// Includes the canonical labels plus a few common aliases DJs' tags use.
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
    melodichouse: "melodic-techno",
    melodichousetechno: "melodic-techno",
    afrohouse: "organic-house",
    minimaldeeptech: "tech-house",
    minimal: "tech-house",
  }

  return { ...map, ...aliases }
})()

/** Maps a free-text genre tag to one of our genres, or null if no match. */
export function mapGenreTag(tag: string | null | undefined): SupportedGenre | null {
  if (!tag) {
    return null
  }

  return GENRE_LOOKUP[normalizeGenreToken(tag)] ?? null
}

export interface GenreBreakdownEntry {
  genre: SupportedGenre
  count: number
  share: number
}

/**
 * Aggregates the genre tags across imported tracks into a breakdown of the
 * genres present in the set (the pragmatic "genre detection" that rides on
 * import metadata — no audio needed). Sorted by share, descending. Tracks
 * whose tag doesn't map to a known genre are ignored for the breakdown.
 */
export function detectGenres(tracks: ImportedTrack[]): {
  dominant: SupportedGenre | null
  breakdown: GenreBreakdownEntry[]
} {
  const counts = new Map<SupportedGenre, number>()

  for (const track of tracks) {
    const mapped = mapGenreTag(track.genre)

    if (mapped) {
      counts.set(mapped, (counts.get(mapped) ?? 0) + 1)
    }
  }

  const total = Array.from(counts.values()).reduce((sum, n) => sum + n, 0)

  if (total === 0) {
    return { dominant: null, breakdown: [] }
  }

  const breakdown = Array.from(counts.entries())
    .map(([genre, count]) => ({
      genre,
      count,
      share: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  return { dominant: breakdown[0].genre, breakdown }
}
