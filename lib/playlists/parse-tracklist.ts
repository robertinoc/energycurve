export const TRACKLIST_FORMATS = ["artist-track", "track-artist"] as const

export type TracklistFormat = (typeof TRACKLIST_FORMATS)[number]

export interface ParsedTrackLine {
  artist: string
  name: string
  bpm: number | null
  sourceLine: number
}

export interface ParseLineError {
  line: number
  content: string
  reason: "missing_separator" | "empty_field"
}

export interface ParseTracklistResult {
  tracks: ParsedTrackLine[]
  errors: ParseLineError[]
}

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g
const COLLAPSED_WHITESPACE = /\s+/g
const SEPARATOR = /\s[-–—]\s/
const NUMBERING_PREFIX = /^\d{1,3}\s*[.)]\s*/
const NUMBERING_DASH_PREFIX = /^\d{1,3}\s*[-–—]\s+/
const BPM_SUFFIX = /[\s]*[([]?(\d{2,3}(?:[.,]\d{1,2})?)\s*bpm[)\]]?\s*$/i

function normalizeLine(value: string) {
  return value
    .replace(CONTROL_CHARACTERS, " ")
    .replace(COLLAPSED_WHITESPACE, " ")
    .trim()
}

function stripNumbering(line: string) {
  const dotStripped = line.replace(NUMBERING_PREFIX, "")

  if (dotStripped !== line) {
    return dotStripped.trim()
  }

  // "1 - Artist - Track" style numbering: only treat the leading number as
  // numbering when a separator remains afterwards, so "22 - Bad Romance"
  // still parses as artist "22".
  const dashMatch = line.match(NUMBERING_DASH_PREFIX)

  if (dashMatch) {
    const rest = line.slice(dashMatch[0].length)

    if (SEPARATOR.test(rest)) {
      return rest.trim()
    }
  }

  return line
}

function extractBpm(line: string): { line: string; bpm: number | null } {
  const match = line.match(BPM_SUFFIX)

  if (!match) {
    return { line, bpm: null }
  }

  const bpm = Number.parseFloat(match[1].replace(",", "."))

  if (!Number.isFinite(bpm)) {
    return { line, bpm: null }
  }

  return {
    line: line.slice(0, line.length - match[0].length).trim(),
    bpm,
  }
}

export function parseTracklist(
  text: string,
  format: TracklistFormat
): ParseTracklistResult {
  const tracks: ParsedTrackLine[] = []
  const errors: ParseLineError[] = []
  const lines = text.split(/\r?\n/)

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1
    const normalized = normalizeLine(rawLine)

    if (!normalized) {
      return
    }

    const withoutNumbering = stripNumbering(normalized)
    const { line, bpm } = extractBpm(withoutNumbering)
    const separatorMatch = line.match(SEPARATOR)

    if (!separatorMatch || separatorMatch.index === undefined) {
      errors.push({
        line: lineNumber,
        content: normalized,
        reason: "missing_separator",
      })
      return
    }

    const first = line.slice(0, separatorMatch.index).trim()
    const second = line
      .slice(separatorMatch.index + separatorMatch[0].length)
      .trim()

    if (!first || !second) {
      errors.push({
        line: lineNumber,
        content: normalized,
        reason: "empty_field",
      })
      return
    }

    const [artist, name] =
      format === "artist-track" ? [first, second] : [second, first]

    tracks.push({ artist, name, bpm, sourceLine: lineNumber })
  })

  return { tracks, errors }
}
