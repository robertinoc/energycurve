import {
  extractEnergyFromComment,
  parseBpm,
  parseClockToSeconds,
  type ImportedTrack,
  type ParsedImport,
} from "@/lib/playlists/imported-track"

/**
 * Rekordbox' "Export a playlist to a file (*.txt)" writes a tab-separated grid
 * with a header row. The columns mirror whatever is shown in the collection
 * view, so we resolve fields by matching the header labels rather than by fixed
 * position. Encoding is UTF-16 on export; decoding is handled upstream before
 * this parser runs (see `decode-upload.ts`).
 */

/** Normalizes a header cell to an alphanumeric token for tolerant matching. */
function normalizeHeader(cell: string): string {
  return cell.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

// Header token → logical field. Covers Rekordbox' English column names plus a
// few common synonyms so a re-ordered/renamed column set still resolves.
const HEADER_FIELDS: Record<string, keyof ColumnIndex> = {
  tracktitle: "name",
  title: "name",
  trackname: "name",
  name: "name",
  artist: "artist",
  bpm: "bpm",
  key: "key",
  tonality: "key",
  genre: "genre",
  time: "time",
  length: "time",
  duration: "time",
  totaltime: "time",
  comments: "comment",
  comment: "comment",
  mytag: "comment",
  mytag1: "comment",
}

interface ColumnIndex {
  name: number | null
  artist: number | null
  bpm: number | null
  key: number | null
  genre: number | null
  time: number | null
  comment: number | null
}

function buildColumnIndex(headerCells: string[]): ColumnIndex {
  const index: ColumnIndex = {
    name: null,
    artist: null,
    bpm: null,
    key: null,
    genre: null,
    time: null,
    comment: null,
  }

  headerCells.forEach((cell, position) => {
    const field = HEADER_FIELDS[normalizeHeader(cell)]

    // First occurrence wins; don't let a later duplicate clobber the mapping.
    if (field && index[field] === null) {
      index[field] = position
    }
  })

  return index
}

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

function cell(cells: string[], position: number | null): string {
  if (position === null) {
    return ""
  }
  return (cells[position] ?? "").trim()
}

/**
 * Parses a Rekordbox txt export into an ordered tracklist. Tracks keep their
 * file order (no location column is present in the txt, so `sourceUri` stays
 * null and native re-linking isn't available for this format). Throws when no
 * data rows are found.
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
    const artist = cell(cells, columns.artist)
    const name = cell(cells, columns.name)

    if (!artist && !name) {
      continue
    }

    const comment = cell(cells, columns.comment) || null

    tracks.push({
      artist,
      name,
      bpm: parseBpm(cell(cells, columns.bpm)),
      key: cell(cells, columns.key) || null,
      genre: cell(cells, columns.genre) || null,
      energy: extractEnergyFromComment(comment),
      sourceUri: null,
      comment,
      durationSeconds: parseClockToSeconds(cell(cells, columns.time)),
    })
  }

  if (tracks.length === 0) {
    throw new Error("No tracks found in the Rekordbox txt export.")
  }

  return { source: "text", playlistName: null, tracks }
}
