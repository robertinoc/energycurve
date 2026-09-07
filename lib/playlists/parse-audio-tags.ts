import { readEnergyTag } from "@/lib/playlists/energy-tag"
import {
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

/**
 * Files an operating system leaves inside a folder that the person who picked it
 * did not put there.
 *
 * Kept apart from "not audio" because reporting them is worse than useless. Pick a
 * folder of 23 tracks on a Mac and it also contains `.DS_Store`; telling the user
 * "1 non-audio file ignored" makes it look as though something they chose was
 * mishandled, when nothing they chose was even involved. A stray `.pdf` or `.jpg`
 * a DJ actually left in the folder is different — that one is worth a mention,
 * because they might have meant to include it.
 */
const SYSTEM_JUNK_FILENAMES = new Set([
  ".ds_store",
  "thumbs.db",
  "desktop.ini",
  "icon\r",
  ".localized",
])

/**
 * True for OS bookkeeping files, which should be dropped without comment.
 *
 * Dotfiles in general: resource forks (`._track.mp3`), Spotlight and Dropbox
 * metadata, editor leftovers. None of it is ever a track, and a leading dot is the
 * long-standing convention for "not user content".
 */
export function isSystemJunkFile(name: string): boolean {
  const base = name.split("/").pop() ?? name

  return base.startsWith(".") || SYSTEM_JUNK_FILENAMES.has(base.toLowerCase())
}

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
    /**
     * The other fields DJs put an energy value in. Lexicon DJ can write to any
     * of them, and the alpha user who asked "which tag?" was using Lexicon —
     * so reading only the comment answered his question with "the wrong one".
     */
    grouping?: string
    composer?: string[]
    lyrics?: Array<{ text?: string } | string>
  }
  format: {
    duration?: number
  }
  /**
   * Container-native frames, keyed by format ("ID3v2.4", "vorbis", "iTunes").
   * Read for a dedicated ENERGY field: ID3 `TXXX:ENERGY`, the Vorbis `ENERGY`
   * comment, and the iTunes `----:com.apple.iTunes:ENERGY` atom. `common`
   * doesn't surface any of them, so a file tagged the tidy way — a field named
   * for the job, holding just the number — looked untagged.
   */
  native?: Record<string, Array<{ id?: string; value?: unknown }>>
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

/** Flattens music-metadata's comment/lyrics fields (string[] or {text}[]). */
function joinTextEntries(
  entries: Array<{ text?: string } | string> | undefined
): string | null {
  if (!entries || entries.length === 0) {
    return null
  }

  const parts = entries
    .map((entry) => (typeof entry === "string" ? entry : (entry.text ?? "")))
    .map((text) => text.trim())
    .filter(Boolean)

  return parts.length > 0 ? parts.join(" ") : null
}

/** Reads a frame whose own name says "energy", whatever the container calls it. */
function energyFrameText(tags: AudioTagSource | null): string | null {
  for (const frames of Object.values(tags?.native ?? {})) {
    for (const frame of frames) {
      const id = String(frame.id ?? "")
      const value = frame.value

      // A TXXX frame carries its real name in the value's description, so the
      // id alone ("TXXX") doesn't say what it holds.
      const described =
        value && typeof value === "object"
          ? String((value as { description?: unknown }).description ?? "")
          : ""

      if (!/energy/i.test(id) && !/energy/i.test(described)) {
        continue
      }

      const text =
        typeof value === "string"
          ? value
          : value && typeof value === "object"
            ? String(
                (value as { text?: unknown }).text ??
                  (value as { value?: unknown }).value ??
                  ""
              )
            : String(value ?? "")

      if (text.trim()) {
        return text
      }
    }
  }

  return null
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
  const comment = joinTextEntries(tags?.common.comment)
  const energy = readEnergyTag({
    energy_frame: energyFrameText(tags),
    comment,
    grouping: tags?.common.grouping,
    lyrics: joinTextEntries(tags?.common.lyrics),
    composer: tags?.common.composer?.[0],
  })

  return {
    artist,
    name,
    bpm: parseBpm(tags?.common.bpm ?? null),
    key: tags?.common.key?.trim() || null,
    genre: tags?.common.genre?.[0]?.trim() || null,
    energy: energy?.value ?? null,
    energySource: energy?.field ?? null,
    sourceUri: relativePath?.trim() || fileName,
    comment,
    durationSeconds: parseDurationSeconds(tags?.format.duration),
  }
}
