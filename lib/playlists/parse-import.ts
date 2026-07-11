import {
  DEFAULT_GENRE_BPM_PROFILE,
  GENRE_BPM_PROFILES_V2,
  GENRE_DETECTION_RULES_V3,
  SUPPORTED_GENRES,
  type SupportedGenre,
} from "@/lib/product/strategy"
import { mapGenreTag } from "@/lib/playlists/genre-mapping"
import type { ImportedTrack, ParsedImport } from "@/lib/playlists/imported-track"
import { isM3u8, parseM3u8 } from "@/lib/playlists/parse-m3u8"
import { isRekordboxXml, parseRekordbox } from "@/lib/playlists/parse-rekordbox"
import {
  isRekordboxTxt,
  parseRekordboxTxt,
} from "@/lib/playlists/parse-rekordbox-txt"
import { isTraktorNml, parseTraktor } from "@/lib/playlists/parse-traktor"

export { mapGenreTag } from "@/lib/playlists/genre-mapping"

export class UnsupportedImportError extends Error {}

/**
 * Detects the export format and parses it. Supports the four shapes Rekordbox
 * and Traktor emit: Rekordbox XML / Traktor NML (both XML, distinct roots), the
 * Rekordbox tab-separated txt export, and Extended M3U/M3U8 ("for music apps").
 * Throws UnsupportedImportError for anything else.
 */
export function parseImport(fileContents: string): ParsedImport {
  if (isM3u8(fileContents)) {
    return parseM3u8(fileContents)
  }

  if (isRekordboxXml(fileContents)) {
    return parseRekordbox(fileContents)
  }

  if (isTraktorNml(fileContents)) {
    return parseTraktor(fileContents)
  }

  // Checked after the XML formats because it's the loosest matcher.
  if (isRekordboxTxt(fileContents)) {
    return parseRekordboxTxt(fileContents)
  }

  throw new UnsupportedImportError(
    "Unrecognized file. Export a playlist as Rekordbox (XML, TXT or M3U8) or Traktor NML."
  )
}

export interface GenreBreakdownEntry {
  genre: SupportedGenre
  count: number
  share: number
  /** Fraction of the set's BPMs that fit this genre's band (0–1). */
  bpmFit: number
  /** Combined detection score (tag votes + BPM prior), 0–1. */
  score: number
}

function bpmBandFit(genre: SupportedGenre, bpms: number[]): number {
  if (bpms.length === 0) {
    return 0
  }

  const profile = GENRE_BPM_PROFILES_V2[genre] ?? DEFAULT_GENRE_BPM_PROFILE
  const margin = GENRE_DETECTION_RULES_V3.bpmFitMargin
  const fitting = bpms.filter(
    (bpm) => bpm >= profile.bpmLow - margin && bpm <= profile.bpmHigh + margin
  ).length

  return fitting / bpms.length
}

/** Narrower BPM band = more specific genre; wins ties (B15). */
function bandWidth(genre: SupportedGenre): number {
  const profile = GENRE_BPM_PROFILES_V2[genre] ?? DEFAULT_GENRE_BPM_PROFILE

  return profile.bpmHigh - profile.bpmLow
}

/** Distance from the set's median BPM to a genre band's center (tiebreak). */
function bandCenterDistance(genre: SupportedGenre, medianBpm: number | null): number {
  if (medianBpm === null) {
    return 0
  }

  const profile = GENRE_BPM_PROFILES_V2[genre] ?? DEFAULT_GENRE_BPM_PROFILE

  return Math.abs(medianBpm - (profile.bpmLow + profile.bpmHigh) / 2)
}

function medianOf(values: number[]): number | null {
  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

/**
 * Detects the set's genre from import metadata — no audio needed (B15).
 * Genre tags vote (compound tags map by containment, see mapGenreTag), and
 * the set's BPMs act as a prior: score = voteWeight·voteShare +
 * bpmFitWeight·bpmFit. Unvoted genres whose band fits most of the set's BPMs
 * still compete — "Techno" tags on a 157-BPM set resolve to hard techno.
 * Ties break toward the more specific (narrower-band) genre. Sorted by
 * score, descending.
 */
export function detectGenres(tracks: ImportedTrack[]): {
  dominant: SupportedGenre | null
  breakdown: GenreBreakdownEntry[]
} {
  const rules = GENRE_DETECTION_RULES_V3
  const counts = new Map<SupportedGenre, number>()

  for (const track of tracks) {
    const mapped = mapGenreTag(track.genre)

    if (mapped) {
      counts.set(mapped, (counts.get(mapped) ?? 0) + 1)
    }
  }

  const totalVotes = Array.from(counts.values()).reduce((sum, n) => sum + n, 0)
  const bpms = tracks
    .map((track) => track.bpm)
    .filter((bpm): bpm is number => bpm !== null)

  // Candidates: every voted genre, plus genres whose BPM band fits enough of
  // the set to compete even without a single mappable tag.
  const candidates = new Set<SupportedGenre>(counts.keys())

  for (const genre of SUPPORTED_GENRES) {
    if (bpmBandFit(genre, bpms) >= rules.bpmFitCandidateThreshold) {
      candidates.add(genre)
    }
  }

  if (candidates.size === 0) {
    return { dominant: null, breakdown: [] }
  }

  const medianBpm = medianOf(bpms)
  const breakdown = Array.from(candidates)
    .map((genre) => {
      const count = counts.get(genre) ?? 0
      const voteShare = totalVotes > 0 ? count / totalVotes : 0
      const bpmFit = bpmBandFit(genre, bpms)
      // Without any usable BPMs the prior is silent: votes decide alone.
      const score =
        bpms.length > 0
          ? rules.voteWeight * voteShare + rules.bpmFitWeight * bpmFit
          : voteShare

      return {
        genre,
        count,
        share: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
        bpmFit: Math.round(bpmFit * 100) / 100,
        score: Math.round(score * 1000) / 1000,
      }
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        bandCenterDistance(a.genre, medianBpm) -
          bandCenterDistance(b.genre, medianBpm) ||
        bandWidth(a.genre) - bandWidth(b.genre) ||
        a.genre.localeCompare(b.genre)
    )

  // A candidate with neither votes nor BPM support shouldn't win.
  if (breakdown[0].score <= 0) {
    return { dominant: null, breakdown: [] }
  }

  return { dominant: breakdown[0].genre, breakdown }
}
