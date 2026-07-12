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
  /**
   * Native file reference from the source export, kept verbatim so a same-format
   * export relinks to the DJ's library. Rekordbox: the `Location` file URL.
   * Traktor: the collection location key (VOLUME + DIR + FILE). Null for paste
   * imports and tracks without a resolvable location.
   */
  sourceUri: string | null
  /** Free-text comment/grouping tag, verbatim (the same field energy is read from). */
  comment: string | null
  /** Track length in seconds (Rekordbox TotalTime / Traktor PLAYTIME); null if absent. */
  durationSeconds: number | null
  /** Perceived loudness in dB (Traktor PERCEIVED_DB); an energy signal (B19). */
  perceivedDb?: number | null
}

export type ImportSource = "rekordbox" | "traktor" | "text" | "m3u8" | "files"

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

/**
 * Parses a track duration into whole seconds. Rekordbox stores `TotalTime` and
 * Traktor stores `PLAYTIME` as integer seconds. Returns null for missing or
 * non-positive values.
 */
export function parseDurationSeconds(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") {
    return null
  }

  const value = Math.round(Number.parseFloat(String(raw)))

  if (!Number.isFinite(value) || value <= 0) {
    return null
  }

  return value
}

/**
 * Parses a clock-style duration ("m:ss", "h:mm:ss") or a plain seconds value
 * into whole seconds. Rekordbox's .txt "Time" column is written as "6:58";
 * m3u8's EXTINF carries plain seconds. Returns null for missing/invalid input.
 */
export function parseClockToSeconds(raw: unknown): number | null {
  if (raw === null || raw === undefined) {
    return null
  }

  const value = String(raw).trim()

  if (!value) {
    return null
  }

  // Plain seconds (integer or decimal) — defer to the seconds parser.
  if (/^\d+(\.\d+)?$/.test(value)) {
    return parseDurationSeconds(value)
  }

  const parts = value.split(":").map((part) => part.trim())

  if (parts.length < 2 || parts.some((part) => !/^\d+$/.test(part))) {
    return null
  }

  const seconds = parts.reduce((total, part) => total * 60 + Number(part), 0)

  return seconds > 0 ? seconds : null
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
