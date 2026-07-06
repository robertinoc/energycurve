/**
 * A track parsed from a DJ-software library/playlist export. Richer than the
 * text paste parser: DJ exports carry BPM, key, genre, and (via Mixed In Key
 * tags) an energy rating — so imports feed the analysis engine real data
 * instead of the BPM heuristic. All fields beyond artist/name are optional
 * because coverage varies per file and per track.
 */
export interface ImportedTrack {
  artist: string
  name: string
  bpm: number | null
  /** Musical key as written by the software (e.g. "8A", "Am", "12d"). */
  key: string | null
  /** Genre tag from the track, verbatim (not yet mapped to SUPPORTED_GENRES). */
  genre: string | null
  /** Energy 1–10 when derivable (Mixed In Key tag); null otherwise. */
  energy: number | null
}

export type ImportSource = "rekordbox" | "traktor"

export interface ParsedImport {
  source: ImportSource
  /** Playlist name from the file, when present. */
  playlistName: string | null
  tracks: ImportedTrack[]
}

/**
 * Extracts a Mixed In Key style "Energy N" (1–10) from a free-text comment
 * field. MIK writes values like "8A - Energy 7" or "Energy 7" into the
 * comment/grouping tag. Returns null when no energy token is present.
 */
export function extractEnergyFromComment(
  comment: string | null | undefined
): number | null {
  if (!comment) {
    return null
  }

  const match = comment.match(/energy\s*(\d{1,2})/i)

  if (!match) {
    return null
  }

  const value = Number.parseInt(match[1], 10)

  if (!Number.isFinite(value) || value < 1 || value > 10) {
    return null
  }

  return value
}

/** Parses a BPM string/number defensively into a positive number or null. */
export function parseBpm(raw: unknown): number | null {
  if (raw === null || raw === undefined) {
    return null
  }

  const value =
    typeof raw === "number" ? raw : Number.parseFloat(String(raw).replace(",", "."))

  if (!Number.isFinite(value) || value <= 0) {
    return null
  }

  return Math.round(value * 100) / 100
}
