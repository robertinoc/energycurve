import {
  parseDurationSeconds,
  type ImportedTrack,
  type ParsedImport,
} from "@/lib/playlists/imported-track"

/**
 * Detects an Extended M3U playlist (Rekordbox' "Export … for music apps
 * (*.m3u8)"). The `.m3u8` extension is just the UTF-8 flavour of M3U; the
 * content marker is the `#EXTM3U` header or an `#EXTINF` line.
 */
export function isM3u8(contents: string): boolean {
  const trimmed = contents.replace(/^﻿/, "").trimStart()
  return trimmed.startsWith("#EXTM3U") || /^#EXTINF:/m.test(trimmed)
}

const EXTINF = /^#EXTINF:(-?\d+(?:\.\d+)?),(.*)$/

/** Splits a "Artist - Title" label into its two parts (title-only if no dash). */
function splitLabel(label: string): { artist: string; name: string } {
  const trimmed = label.trim()
  const match = trimmed.match(/^(.*?)\s+[-–—]\s+(.*)$/)

  if (match && match[1].trim() && match[2].trim()) {
    return { artist: match[1].trim(), name: match[2].trim() }
  }

  return { artist: "", name: trimmed }
}

/** Derives an "Artist - Title" guess from a file path when no EXTINF label. */
function deriveFromPath(uri: string): { artist: string; name: string } {
  const withoutQuery = uri.split(/[?#]/)[0]
  const base = withoutQuery.split(/[/\\]/).pop() ?? withoutQuery
  let decoded = base

  try {
    decoded = decodeURIComponent(base)
  } catch {
    // Keep the raw basename if it isn't valid percent-encoding.
  }

  const stem = decoded.replace(/\.[a-z0-9]{1,5}$/i, "")
  return splitLabel(stem)
}

/**
 * Parses an Extended M3U/M3U8 playlist into an ordered tracklist. M3U carries
 * only the display label ("Artist - Title") and a duration per entry, plus the
 * file path — no BPM/key/genre — so those stay null. The path is preserved as
 * `sourceUri` so a re-export relinks to the same files. Throws when no tracks
 * are found.
 */
export function parseM3u8(contents: string): ParsedImport {
  const lines = contents.replace(/^﻿/, "").split(/\r?\n/)

  const tracks: ImportedTrack[] = []
  let pending: { durationSeconds: number | null; label: string } | null = null
  let playlistName: string | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      continue
    }

    if (line.startsWith("#")) {
      const extinf = line.match(EXTINF)

      if (extinf) {
        pending = {
          durationSeconds: parseDurationSeconds(extinf[1]),
          label: extinf[2],
        }
        continue
      }

      // Some apps write a "#PLAYLIST:Name" directive; use it as the set name.
      const playlist = line.match(/^#(?:EXT-X-)?PLAYLIST:(.*)$/i)

      if (playlist && playlist[1].trim()) {
        playlistName = playlist[1].trim()
      }

      // Any other directive (#EXTM3U, #EXTALB, comments) is ignored.
      continue
    }

    // A non-directive line is a media URI/path — the entry payload.
    const fromLabel = pending?.label ? splitLabel(pending.label) : null
    const derived = fromLabel ?? deriveFromPath(line)

    tracks.push({
      artist: derived.artist,
      name: derived.name,
      bpm: null,
      key: null,
      genre: null,
      energy: null,
      sourceUri: line,
      comment: null,
      durationSeconds: pending?.durationSeconds ?? null,
    })

    pending = null
  }

  const kept = tracks.filter((track) => track.artist || track.name)

  if (kept.length === 0) {
    throw new Error("No tracks found in the M3U8 playlist.")
  }

  return { source: "m3u8", playlistName, tracks: kept }
}
