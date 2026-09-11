import type { TrackAudioFeatures } from "@/lib/audio/track-features"
import {
  extractEnergyValue,
  type EnergyTagField,
} from "@/lib/playlists/energy-tag"
import type {
  SourceHeader,
  SourcePayloadFormat,
} from "@/lib/playlists/source-entry"

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
  /** Energy 1–10 when derivable from the track's tags; null otherwise. */
  energy: number | null
  /**
   * Which tag the energy was read from, so the UI can say so rather than
   * presenting the number as if it had no provenance. Null when there is no
   * energy, or when it was typed in by hand.
   */
  energySource?: EnergyTagField | null
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
  /**
   * The verbatim library entry this track came from — a Traktor `<ENTRY>` or a
   * Rekordbox `<TRACK>`. Re-emitted byte-for-byte on export so a re-import
   * cannot strip the fields we don't model (hotcues, loops, the analysis
   * fingerprint, loudness, album/label, play counts). See `source-entry.ts`.
   */
  sourcePayload?: string | null
  sourcePayloadFormat?: SourcePayloadFormat | null
  /**
   * Spectral measurements from the file's own audio. Only ever present on the
   * `files` import path, and only for files that were actually analysed — a
   * playlist parsed from a Rekordbox XML has no audio to measure.
   */
  audioFeatures?: TrackAudioFeatures | null
}

export type ImportSource =
  | "rekordbox"
  | "traktor"
  | "text"
  | "m3u8"
  | "csv"
  | "files"

export interface ParsedImport {
  source: ImportSource
  /** Playlist name from the file, when present. */
  playlistName: string | null
  tracks: ImportedTrack[]
  /** Root/header elements of the source file, preserved for re-export. */
  sourceHeader?: SourceHeader | null
}

/**
 * Extracts an energy value (1–10) from a free-text comment field.
 *
 * Kept as a named function because "the comment field" is the one place every
 * import path has; the accepted written forms live in `energy-tag.ts`, which is
 * also what reads the other fields DJs use (grouping, lyrics, producer, a
 * dedicated ENERGY frame). A bare number is not accepted here — in a comment it
 * is a comment.
 */
export function extractEnergyFromComment(
  comment: string | null | undefined
): number | null {
  return extractEnergyValue(comment)
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
