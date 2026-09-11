import {
  extractEnergyFromComment,
  parseBpm,
  parseClockToSeconds,
  type ImportedTrack,
  type ParsedImport,
} from "@/lib/playlists/imported-track"
import {
  buildColumnIndex,
  cellAt,
  hasTrackColumns,
  type ColumnIndex,
} from "@/lib/playlists/tabular-columns"

/**
 * CSV playlist import.
 *
 * Asked for by an alpha user: "he descargado en txt y csv y la verdad es que
 * podríamos usar ese método para subir tracklist, a mi lexicon me da la opción
 * de crear ese csv". He was right that we had the asymmetry backwards — we
 * wrote CSV and couldn't read it, not even our own.
 *
 * The schema is our own CSV export's header, which is also the answer to his
 * "estableced una base": round-tripping an EnergyCurve export is the
 * acceptance test, and every other tool's header resolves through the shared
 * synonym table in `tabular-columns.ts`.
 */

/**
 * Delimiter sniffing, on the header line only.
 *
 * Semicolons are not an edge case: a spreadsheet on a Spanish or German locale
 * writes them by default, so a DJ who opens a CSV in Excel to check it and
 * saves it again gets a semicolon file back. Counting on the header rather than
 * the whole document keeps a comma inside a quoted title from casting a vote.
 *
 * Tab is deliberately NOT here. Tab-delimited belongs to the Rekordbox txt
 * reader, and claiming it would mean two readers racing for the same file —
 * which is exactly what happened the first time this list had three entries.
 */
const DELIMITERS = [",", ";"] as const

function sniffDelimiter(headerLine: string): string {
  let best = ","
  let bestCount = 0

  for (const delimiter of DELIMITERS) {
    const count = splitRow(headerLine, delimiter).length

    if (count > bestCount) {
      best = delimiter
      bestCount = count
    }
  }

  return best
}

/**
 * Splits one row, honouring RFC 4180 quoting: a quoted field may contain the
 * delimiter, and `""` inside a quoted field is a literal quote.
 *
 * Written by hand rather than pulled in as a dependency: this runs on the
 * server inside a request, the format is small and fully specified, and a CSV
 * library would be more bytes than the parser it replaces.
 */
function splitRow(row: string, delimiter: string): string[] {
  const cells: string[] = []
  let cell = ""
  let inQuotes = false

  for (let i = 0; i < row.length; i++) {
    const char = row[i]

    if (inQuotes) {
      if (char === '"') {
        if (row[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      cells.push(cell)
      cell = ""
    } else {
      cell += char
    }
  }

  cells.push(cell)

  return cells
}

/**
 * Splits the document into rows, keeping a newline that sits inside a quoted
 * field attached to its row. A comment field with a line break in it is the
 * realistic case, and splitting on `\n` first would shear the row in half.
 */
function splitRows(contents: string): string[] {
  const rows: string[] = []
  let row = ""
  let inQuotes = false

  for (let i = 0; i < contents.length; i++) {
    const char = contents[i]

    if (char === '"') {
      // A doubled quote inside a quoted field is an escaped quote, not a close.
      if (inQuotes && contents[i + 1] === '"') {
        row += '""'
        i++
        continue
      }
      inQuotes = !inQuotes
      row += char
      continue
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      // Consume the \n of a \r\n pair so it doesn't open an empty row.
      if (char === "\r" && contents[i + 1] === "\n") {
        i++
      }
      rows.push(row)
      row = ""
      continue
    }

    row += char
  }

  rows.push(row)

  return rows.filter((line) => line.trim() !== "")
}

/**
 * Detects a CSV playlist: a delimited first row that resolves to at least a
 * title column through the shared header table.
 *
 * Checked after the XML and M3U8 formats and before the Rekordbox txt reader.
 * The two tabular readers can't collide in practice — a `.txt` export is
 * tab-delimited and a CSV is not — but the header requirement is what keeps a
 * pasted "Artist - Title" list from matching either.
 */
export function isCsvPlaylist(contents: string): boolean {
  const [headerLine] = splitRows(contents)

  if (!headerLine) {
    return false
  }

  const delimiter = sniffDelimiter(headerLine)
  const cells = splitRow(headerLine, delimiter)

  if (cells.length < 2) {
    return false
  }

  return hasTrackColumns(buildColumnIndex(cells))
}

function toImportedTrack(
  cells: string[],
  columns: ColumnIndex
): ImportedTrack {
  const comment = cellAt(cells, columns.comment) || null
  // An explicit Energy column wins; failing that, the comment may carry a
  // written token, which is the same precedence the tag readers use.
  const energyCell = cellAt(cells, columns.energy)
  const energy =
    extractEnergyFromComment(energyCell) ??
    extractEnergyFromComment(`energy ${energyCell}`) ??
    extractEnergyFromComment(comment)

  return {
    artist: cellAt(cells, columns.artist),
    name: cellAt(cells, columns.name),
    bpm: parseBpm(cellAt(cells, columns.bpm) || null),
    key: cellAt(cells, columns.key) || null,
    genre: cellAt(cells, columns.genre) || null,
    energy,
    // Kept verbatim so a CSV that carries paths can still produce a native
    // export that relinks — which is why Location is worth asking exporters for.
    sourceUri: cellAt(cells, columns.location) || null,
    comment,
    durationSeconds: parseClockToSeconds(cellAt(cells, columns.time)),
  }
}

/**
 * Parses a CSV playlist into an ordered tracklist. Row order is play order;
 * a Position column is read for nothing, because a file whose rows disagree
 * with its own numbering is a file we'd have to pick a winner for, and the
 * order you can see in the file is the one you meant.
 */
export function parseCsv(contents: string): ParsedImport {
  const rows = splitRows(contents.replace(/^﻿/, ""))

  if (rows.length === 0) {
    throw new Error("No rows found in the CSV playlist.")
  }

  const delimiter = sniffDelimiter(rows[0])
  const columns = buildColumnIndex(splitRow(rows[0], delimiter))

  if (!hasTrackColumns(columns)) {
    throw new Error("No title column found in the CSV playlist.")
  }

  const tracks = rows
    .slice(1)
    .map((row) => toImportedTrack(splitRow(row, delimiter), columns))
    .filter((track) => track.artist || track.name)

  if (tracks.length === 0) {
    throw new Error("No tracks found in the CSV playlist.")
  }

  return { source: "csv", playlistName: null, tracks }
}
