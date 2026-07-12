import {
  extractEnergyFromComment,
  parseBpm,
  parseDurationSeconds,
  type ImportedTrack,
} from "@/lib/playlists/imported-track"

/**
 * Pure mapping from audio-file tags to ImportedTrack — the "from your music
 * files" import path. Tag PARSING happens client-side with music-metadata
 * (dynamically imported in the component so it never enters the main bundle);
 * this module only maps the parsed result, so it stays dependency-free and
 * unit-testable with synthetic objects.
 */

/** File extensions we treat as audio when filtering folder picks / drops. */
export const AUDIO_FILE_EXTENSIONS = [
  "mp3",
  "m4a",
  "aac",
  "flac",
  "wav",
  "aiff",
  "aif",
  "ogg",
  "opus",
] as const

/** Client-side cap on files per import; the server caps tracks at 500. */
export const AUDIO_IMPORT_MAX_FILES = 100

/** True when a filename's extension is on the audio allowlist. MIME types are
 * unreliable for folder picks (some OSes report ""), so we go by extension. */
export function isAudioFileName(name: string): boolean {
  const extension = name.split(".").pop()?.toLowerCase() ?? ""
  return (AUDIO_FILE_EXTENSIONS as readonly string[]).includes(extension)
}

/**
 * Structural subset of music-metadata's IAudioMetadata. Declared here (not
 * imported) so this module and its tests never depend on the library.
 * `comment` handles both shapes music-metadata has used: string[] (older)
 * and IComment[] ({ text }) (v10+).
 */
export interface AudioTagSource {
  common: {
    title?: string
    artist?: string
    artists?: string[]
    bpm?: number | string
    key?: string
    genre?: string[]
    comment?: Array<{ text?: string } | string>
  }
  format: {
    duration?: number
  }
}

/**
 * Derives artist/title from a filename stem: strips the extension and a
 * leading "01." / "01 -" track number, then splits on " - ". Files named
 * without a dash keep the whole stem as the title (artist empty).
 */
export function splitFilenameToArtistTitle(fileName: string): {
  artist: string
  name: string
} {
  const base = fileName.split(/[/\\]/).pop() ?? fileName
  let stem = base.replace(/\.[a-z0-9]{1,5}$/i, "").trim()

  // Leading track numbering: "01. ", "01 - ", "1)" …
  stem = stem.replace(/^\d{1,3}\s*[.)]\s*/, "").trim()

  const match = stem.match(/^(.*?)\s+[-–—]\s+(.*)$/)

  if (match && match[1].trim() && match[2].trim()) {
    // A leading "01 - Artist - Title" leaves "01" as the artist half; if the
    // artist half is purely numeric treat it as numbering, not an artist.
    const left = match[1].trim()
    const right = match[2].trim()

    if (/^\d{1,3}$/.test(left)) {
      const inner = right.match(/^(.*?)\s+[-–—]\s+(.*)$/)
      if (inner && inner[1].trim() && inner[2].trim()) {
        return { artist: inner[1].trim(), name: inner[2].trim() }
      }
      return { artist: "", name: right }
    }

    return { artist: left, name: right }
  }

  return { artist: "", name: stem }
}

/** Flattens music-metadata's comment field (string[] or IComment[]) to text. */
function commentText(
  comment: AudioTagSource["common"]["comment"]
): string | null {
  if (!comment || comment.length === 0) {
    return null
  }

  const parts = comment
    .map((entry) => (typeof entry === "string" ? entry : (entry.text ?? "")))
    .map((text) => text.trim())
    .filter(Boolean)

  return parts.length > 0 ? parts.join(" ") : null
}

/**
 * Maps one audio file's parsed tags to an ImportedTrack. `tags` is null when
 * parsing failed (corrupt file, DRM) — the track degrades to filename-derived
 * artist/title with no metadata, and the caller flags it in the preview.
 * `relativePath` is `file.webkitRelativePath` for folder picks (kept as
 * sourceUri so an m3u8 export stays resolvable relative to that folder).
 */
export function audioTagsToImportedTrack(
  fileName: string,
  relativePath: string | null,
  tags: AudioTagSource | null
): ImportedTrack {
  const fallback = splitFilenameToArtistTitle(fileName)

  const artist =
    tags?.common.artist?.trim() ||
    tags?.common.artists?.[0]?.trim() ||
    fallback.artist
  const name = tags?.common.title?.trim() || fallback.name
  const comment = commentText(tags?.common.comment)

  return {
    artist,
    name,
    bpm: parseBpm(tags?.common.bpm ?? null),
    key: tags?.common.key?.trim() || null,
    genre: tags?.common.genre?.[0]?.trim() || null,
    energy: extractEnergyFromComment(comment),
    sourceUri: relativePath?.trim() || fileName,
    comment,
    durationSeconds: parseDurationSeconds(tags?.format.duration),
  }
}
