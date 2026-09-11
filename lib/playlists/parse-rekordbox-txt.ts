import {
  extractEnergyFromComment,
  parseBpm,
  parseClockToSeconds,
  type ImportedTrack,
  type ParsedImport,
} from "@/lib/playlists/imported-track"
import { buildColumnIndex, cellAt } from "@/lib/playlists/tabular-columns"

/**
 * Rekordbox' "Export a playlist to a file (*.txt)" writes a tab-separated grid
 * with a header row. The columns mirror whatever is shown in the collection
 * view, so we resolve fields by matching the header labels rather than by fixed
 * position. Encoding is UTF-16 on export; decoding is handled upstream before
 * this parser runs (see `decode-upload.ts`).
 */

function firstNonEmptyLine(contents: string): string {
  for (const line of contents.split(/\r?\n/)) {
    if (line.trim() !== "") {
      return line
    }
  }
  return ""
}

/**
 * Detects a Rekordbox tab-separated txt export: a tab-delimited header whose
 * cells include an Artist column and a title column. The tab + header
 * requirement keeps a plain "Artist - Track" paste from matching.
 */
export function isRekordboxTxt(contents: string): boolean {
  const header = firstNonEmptyLine(contents)

  if (!header.includes("\t")) {
    return false
  }

  const index = buildColumnIndex(header.split("\t"))
  return index.artist !== null && index.name !== null
}

/**
 * Parses a Rekordbox txt export into an ordered tracklist. Tracks keep their
 * file order. Rekordbox' own txt has no location column, so `sourceUri` is
 * usually null and native re-linking isn't available — but the column is read
 * when some other tool's tab export provides it. Throws when no data rows are
 * found.
 */
export function parseRekordboxTxt(contents: string): ParsedImport {
  const lines = contents.split(/\r?\n/)

  const headerLineIndex = lines.findIndex((line) => line.trim() !== "")

  if (headerLineIndex === -1) {
    throw new Error("No header row found in the Rekordbox txt export.")
  }

  const columns = buildColumnIndex(lines[headerLineIndex].split("\t"))

  const tracks: ImportedTrack[] = []

  for (let i = headerLineIndex + 1; i < lines.length; i += 1) {
    const line = lines[i]

    if (line.trim() === "") {
      continue
    }

    const cells = line.split("\t")
    const artist = cellAt(cells, columns.artist)
    const name = cellAt(cells, columns.name)

    if (!artist && !name) {
      continue
    }

    const comment = cellAt(cells, columns.comment) || null

    tracks.push({
      artist,
      name,
      bpm: parseBpm(cellAt(cells, columns.bpm)),
      key: cellAt(cells, columns.key) || null,
      genre: cellAt(cells, columns.genre) || null,
      // Both now come from the shared header table, so a tab-delimited export
      // that happens to carry an Energy or Location column is read like the
      // CSV equivalent instead of being silently narrower.
      energy:
        extractEnergyFromComment(cellAt(cells, columns.energy)) ??
        extractEnergyFromComment(
          `energy ${cellAt(cells, columns.energy)}`
        ) ??
        extractEnergyFromComment(comment),
      sourceUri: cellAt(cells, columns.location) || null,
      comment,
      durationSeconds: parseClockToSeconds(cellAt(cells, columns.time)),
    })
  }

  if (tracks.length === 0) {
    throw new Error("No tracks found in the Rekordbox txt export.")
  }

  return { source: "text", playlistName: null, tracks }
}
