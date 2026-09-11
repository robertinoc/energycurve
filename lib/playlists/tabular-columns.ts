/**
 * Header-driven column resolution for the tabular playlist formats.
 *
 * Shared by the Rekordbox `.txt` reader and the CSV reader because both face
 * the same problem: the columns are whatever the exporting tool decided to
 * show, in whatever order, under whatever label. Resolving by header text
 * rather than by position is what makes that survivable — and keeping ONE
 * synonym table means a label added for one format is understood by the other,
 * instead of the two drifting into different vocabularies.
 *
 * An alpha user asked us to "establecer una base, qué datos son necesarios en
 * el csv". This table is that base, and it is deliberately generous: a DJ
 * configuring an export in Lexicon should not have to guess our spelling.
 */

export interface ColumnIndex {
  position: number | null
  name: number | null
  artist: number | null
  bpm: number | null
  key: number | null
  genre: number | null
  time: number | null
  energy: number | null
  comment: number | null
  location: number | null
}

/**
 * Normalizes a header cell to an alphanumeric token for tolerant matching.
 *
 * Accents are folded BEFORE the strip, not after. Stripping first turns
 * "Canción" into "cancin" and "Duración" into "duracin" — so a Spanish export
 * silently failed to resolve while an English one worked, which is the worst
 * shape a localization bug can take.
 */
export function normalizeHeader(cell: string): string {
  return cell
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
}

/**
 * Header token → logical field.
 *
 * Covers Rekordbox' and Lexicon's English column names, our own CSV export's
 * headers, and the Spanish labels a localized export produces — a Spanish
 * install writing "Artista,Canción,Duración" should import without the DJ
 * renaming anything.
 */
const HEADER_FIELDS: Record<string, keyof ColumnIndex> = {
  // Order / position
  position: "position",
  pos: "position",
  no: "position",
  num: "position",
  track: "position",
  tracknumber: "position",
  posicion: "position",
  // Title
  tracktitle: "name",
  title: "name",
  trackname: "name",
  name: "name",
  song: "name",
  titulo: "name",
  cancion: "name",
  tema: "name",
  // Artist
  artist: "artist",
  artists: "artist",
  artista: "artist",
  // Tempo
  bpm: "bpm",
  tempo: "bpm",
  // Key
  key: "key",
  tonality: "key",
  tone: "key",
  camelot: "key",
  openkey: "key",
  tonalidad: "key",
  clave: "key",
  // Genre
  genre: "genre",
  genero: "genre",
  style: "genre",
  // Duration
  time: "time",
  length: "time",
  duration: "time",
  totaltime: "time",
  duracion: "time",
  tiempo: "time",
  // Energy
  energy: "energy",
  energylevel: "energy",
  energia: "energy",
  // Free text
  comments: "comment",
  comment: "comment",
  comentario: "comment",
  comentarios: "comment",
  mytag: "comment",
  mytag1: "comment",
  grouping: "comment",
  // File reference
  location: "location",
  path: "location",
  filepath: "location",
  file: "location",
  filename: "location",
  ruta: "location",
  archivo: "location",
  ubicacion: "location",
}

export function buildColumnIndex(headerCells: string[]): ColumnIndex {
  const index: ColumnIndex = {
    position: null,
    name: null,
    artist: null,
    bpm: null,
    key: null,
    genre: null,
    time: null,
    energy: null,
    comment: null,
    location: null,
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

/**
 * True when a resolved header carries enough to build a tracklist.
 *
 * A title is the floor — a row with no title is not a track, whatever else it
 * has. Artist is not required: plenty of exports put "Artist - Title" in one
 * column, and rejecting those outright would be worse than importing them with
 * an empty artist.
 */
export function hasTrackColumns(index: ColumnIndex): boolean {
  return index.name !== null
}

/** The cell at `column`, trimmed; empty string when the column is absent. */
export function cellAt(
  cells: string[],
  column: number | null
): string {
  return column === null ? "" : (cells[column] ?? "").trim()
}
