import { XMLParser, XMLValidator } from "fast-xml-parser"

import { inspectXmlDocument } from "@/lib/playlists/xml-guard"

/**
 * Traktor NML ↔ Rekordbox M3U8, both directions, in the visitor's browser.
 *
 * This is TraktorBox — the converter that lived at apps.robertino.world — ported
 * from its Python `converter.py` line for line. The behaviour is the one its 63
 * tests pinned: a Traktor playlist export becomes one `.m3u8` per playlist with
 * `/Volumes/<name>/…` paths, and an `.m3u8` becomes an `.nml` whose LOCATION
 * elements use Traktor's `/:`-segmented directory notation. Nothing is smarter
 * than the original was, on purpose: a DJ who used TraktorBox should get the
 * same file out of this page.
 *
 * Pure and dependency-light so the same module runs in the page (client-side —
 * the file never leaves the tab) and in Vitest under Node. That is why the XML
 * is read with `fast-xml-parser`, which the NML importer already uses, and
 * written by hand the way `lib/playlists/export.ts` writes its own: `DOMParser`
 * exists in one runtime and not the other.
 *
 * Not reused from `lib/playlists/`: those parsers produce `ImportedTrack`s for
 * the engine and deliberately discard the file paths this tool exists to carry
 * across. Reading here is shallower and keeps exactly the fields the other
 * program will look for.
 */

// --- Types ------------------------------------------------------------------

/** One playlist read out of an NML, ready to be saved as `<name>.m3u8`. */
export interface ConvertedPlaylist {
  name: string
  m3u8Content: string
  trackCount: number
}

/** A track as the M3U8 side sees it. */
export interface M3u8Track {
  title: string
  artist: string
  /** Seconds. `0` when the file did not say. */
  playtime: number
  path: string
}

export type ConversionDirection = "nml_to_m3u8" | "m3u8_to_nml"

/** A file the page can offer for download. */
export interface ConvertedFile {
  filename: string
  contents: string
  mimeType: "audio/x-mpegurl" | "application/xml"
  trackCount: number
}

export interface ConversionResult {
  direction: ConversionDirection
  files: ConvertedFile[]
}

/**
 * The failures the page distinguishes. Each is one sentence the copy table
 * translates; the message on the error itself is for logs and tests.
 */
export type ConversionErrorCode =
  | "unsupported_extension"
  | "unreadable"
  | "no_playlists"
  | "no_tracks"

export class ConversionError extends Error {
  constructor(
    readonly code: ConversionErrorCode,
    message: string
  ) {
    super(message)
    this.name = "ConversionError"
  }
}

// --- Traktor → Rekordbox ----------------------------------------------------

/**
 * `'ROBERT HD2/:_MUSICA/:Folder/:file.mp3'`
 * → `'/Volumes/ROBERT HD2/_MUSICA/Folder/file.mp3'`
 *
 * The volume is everything before the first `/:`; the rest swaps Traktor's
 * separator for a plain slash. A key with no `/:` in it is not a Traktor key
 * and is returned untouched.
 */
export function traktorKeyToPath(key: string): string {
  const separator = key.indexOf("/:")

  if (separator === -1) {
    return key
  }

  const volume = key.slice(0, separator)
  const rest = key.slice(separator + 2).replace(/\/:/g, "/")

  return `/Volumes/${volume}/${rest}`
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Attributes are read as the strings they are. Left to its defaults the
  // parser would turn PLAYTIME="312" into a number, which is convenient, and
  // FILE="01.mp3" into 1, which is a lost track.
  parseAttributeValue: false,
  parseTagValue: false,
  isArray: (name) => name === "ENTRY" || name === "NODE",
})

interface RawLocation {
  "@_VOLUME"?: string
  "@_DIR"?: string
  "@_FILE"?: string
}

interface RawCollectionEntry {
  "@_TITLE"?: string
  "@_ARTIST"?: string
  LOCATION?: RawLocation
  INFO?: { "@_PLAYTIME"?: string }
}

interface RawPlaylistEntry {
  PRIMARYKEY?: { "@_TYPE"?: string; "@_KEY"?: string }
}

interface RawNode {
  "@_TYPE"?: string
  "@_NAME"?: string
  SUBNODES?: { NODE?: RawNode[] }
  PLAYLIST?: { ENTRY?: RawPlaylistEntry[] }
}

interface RawNml {
  NML?: {
    COLLECTION?: { ENTRY?: RawCollectionEntry[] }
    PLAYLISTS?: { NODE?: RawNode[] }
  }
}

/**
 * Every `NODE TYPE="PLAYLIST"` under PLAYLISTS, at any depth, in document
 * order — the same set Python's `.//PLAYLISTS//NODE[@TYPE='PLAYLIST']` found.
 * Folders are walked through, never returned.
 */
function collectPlaylistNodes(nodes: RawNode[] | undefined, into: RawNode[]) {
  for (const node of nodes ?? []) {
    if (node["@_TYPE"] === "PLAYLIST") {
      into.push(node)
    }

    collectPlaylistNodes(node.SUBNODES?.NODE, into)
  }
}

function parseNml(nml: string): NonNullable<RawNml["NML"]> {
  // The same structural refusal the importer applies: a DOCTYPE or an entity
  // declaration has no place in a playlist and is refused before any tree is
  // built. See lib/playlists/xml-guard.ts.
  const guard = inspectXmlDocument(nml)

  if (!guard.ok) {
    throw new ConversionError(
      "unreadable",
      `Refused to parse this XML (${guard.reason}).`
    )
  }

  // The parser is forgiving — it builds a tree from a truncated document
  // rather than refusing it — so a half-written file would read as an NML with
  // no playlists, which is the wrong message. Validation says what is wrong.
  const valid = XMLValidator.validate(nml)

  if (valid !== true) {
    throw new ConversionError(
      "unreadable",
      `Not well-formed XML: ${valid.err.msg}`
    )
  }

  let doc: RawNml

  try {
    doc = parser.parse(nml) as RawNml
  } catch (caught) {
    throw new ConversionError(
      "unreadable",
      `Not well-formed XML: ${caught instanceof Error ? caught.message : String(caught)}`
    )
  }

  if (!doc.NML || typeof doc.NML !== "object") {
    throw new ConversionError("unreadable", "Not a Traktor NML file.")
  }

  return doc.NML
}

/**
 * Parses a Traktor `.nml` and returns one M3U8 per playlist that resolved at
 * least one track.
 *
 * Traktor stores each track once in COLLECTION and references it from a
 * playlist by VOLUME+DIR+FILE. Entries whose key matches nothing in the
 * collection are skipped, and a playlist left with no tracks is not returned —
 * an empty `.m3u8` is not something anyone wants to download.
 */
export function convertNmlToM3u8(nml: string): ConvertedPlaylist[] {
  const root = parseNml(nml)

  const trackInfo = new Map<string, M3u8Track>()

  for (const entry of root.COLLECTION?.ENTRY ?? []) {
    const location = entry.LOCATION

    if (!location) {
      continue
    }

    const volume = location["@_VOLUME"] ?? ""
    const directory = location["@_DIR"] ?? ""
    const filename = location["@_FILE"] ?? ""
    const primaryKey = `${volume}${directory}${filename}`

    const rawPlaytime = entry.INFO?.["@_PLAYTIME"]
    const playtime = rawPlaytime === undefined ? 0 : parseIntOrZero(rawPlaytime)

    trackInfo.set(primaryKey, {
      // The original fell back to the filename when TITLE was absent.
      title: entry["@_TITLE"] ?? filename,
      artist: entry["@_ARTIST"] ?? "",
      playtime,
      path: traktorKeyToPath(primaryKey),
    })
  }

  const playlistNodes: RawNode[] = []
  collectPlaylistNodes(root.PLAYLISTS?.NODE, playlistNodes)

  const results: ConvertedPlaylist[] = []

  for (const node of playlistNodes) {
    const name = node["@_NAME"] ?? "playlist"
    const lines = ["#EXTM3U", ""]
    let trackCount = 0

    for (const entry of node.PLAYLIST?.ENTRY ?? []) {
      const primaryKey = entry.PRIMARYKEY

      if (primaryKey?.["@_TYPE"] !== "TRACK") {
        continue
      }

      const track = trackInfo.get(primaryKey["@_KEY"] ?? "")

      if (!track) {
        continue
      }

      const display = track.artist
        ? `${track.artist} - ${track.title}`
        : track.title

      lines.push(`#EXTINF:${track.playtime},${display}`)
      lines.push(track.path)
      trackCount += 1
    }

    if (lines.length > 2) {
      results.push({
        name,
        m3u8Content: `${lines.join("\n")}\n`,
        trackCount,
      })
    }
  }

  return results
}

/** Python's `int(...)` on an attribute: a non-number reads as zero, not as NaN. */
function parseIntOrZero(value: string): number {
  const parsed = Number.parseInt(value, 10)

  return Number.isFinite(parsed) ? parsed : 0
}

// --- Rekordbox → Traktor ----------------------------------------------------

export interface TraktorLocation {
  volume: string
  /** `/:A/:B/:` — Traktor's notation, always opening and closing with `/:`. */
  dir: string
  file: string
  primaryKey: string
}

/**
 * An absolute path back to Traktor's VOLUME / DIR / FILE.
 *
 * `'/Volumes/ROBERT HD2/_MUSICA/Sets/file.mp3'`
 * → volume `ROBERT HD2`, dir `/:_MUSICA/:Sets/:`, file `file.mp3`,
 *   primaryKey `ROBERT HD2/:_MUSICA/:Sets/:file.mp3`
 *
 * A path under `/` but outside `/Volumes` is the boot disk, which macOS calls
 * "Macintosh HD". Anything else is taken relative, with an empty volume — the
 * original's behaviour, kept.
 *
 * One addition over the original: a Windows path (`D:\Music\track.mp3`) is read
 * as volume `D:` with the backslashes turned into Traktor's separators, which
 * is how Traktor for Windows writes its own LOCATIONs. The Python version fed
 * the whole string through as a relative path, which produced an entry Traktor
 * could not resolve.
 */
export function pathToTraktorParts(path: string): TraktorLocation {
  let volume: string
  let pathRest: string

  const windowsDrive = /^([A-Za-z]:)[\\/](.*)$/.exec(path)

  if (windowsDrive) {
    volume = windowsDrive[1]
    pathRest = windowsDrive[2].replace(/\\/g, "/")
  } else if (path.startsWith("/Volumes/")) {
    const rest = path.slice("/Volumes/".length)
    const slash = rest.indexOf("/")

    if (slash !== -1) {
      volume = rest.slice(0, slash)
      pathRest = rest.slice(slash + 1)
    } else {
      volume = rest
      pathRest = ""
    }
  } else if (path.startsWith("/")) {
    volume = "Macintosh HD"
    pathRest = path.slice(1)
  } else {
    volume = ""
    pathRest = path
  }

  const lastSlash = pathRest.lastIndexOf("/")
  const dirPlain = lastSlash === -1 ? "" : pathRest.slice(0, lastSlash + 1)
  const file = lastSlash === -1 ? pathRest : pathRest.slice(lastSlash + 1)

  // "A/B/C/" → "/:A/:B/:C/:"
  const components = dirPlain.split("/").filter(Boolean)
  const dir = components.length > 0 ? `/:${components.join("/:")}/:` : "/:"

  return { volume, dir, file, primaryKey: `${volume}${dir}${file}` }
}

/**
 * Reads an M3U8 into tracks.
 *
 * `#EXTINF:<seconds>,<Artist> - <Title>` describes the path on the next line.
 * A path with no `#EXTINF` before it becomes a track titled by its filename
 * stem, with no artist and no duration. Any other `#` line is a comment.
 */
export function parseM3u8(content: string): M3u8Track[] {
  const tracks: M3u8Track[] = []
  let pending: Omit<M3u8Track, "path"> | null = null

  for (const rawLine of content.split(/\r?\n|\r/)) {
    const line = rawLine.trim()

    if (!line || line === "#EXTM3U") {
      continue
    }

    if (line.startsWith("#EXTINF:")) {
      const rest = line.slice("#EXTINF:".length)
      const comma = rest.indexOf(",")

      // An EXTINF with no comma has no metadata in it. The original left the
      // pending entry alone in that case, so this does too.
      if (comma !== -1) {
        const duration = Number.parseFloat(rest.slice(0, comma))
        const display = rest.slice(comma + 1).trim()
        const dash = display.indexOf(" - ")

        pending = {
          title: dash === -1 ? display : display.slice(dash + 3),
          artist: dash === -1 ? "" : display.slice(0, dash),
          playtime: Number.isFinite(duration) ? Math.trunc(duration) : 0,
        }
      }

      continue
    }

    if (line.startsWith("#")) {
      continue
    }

    if (pending) {
      tracks.push({ ...pending, path: line })
      pending = null
    } else {
      tracks.push({
        title: filenameStem(line),
        artist: "",
        playtime: 0,
        path: line,
      })
    }
  }

  return tracks
}

/** `'/a/b/track.mp3'` → `'track'`. Splits on `/` only, like `os.path` on a Mac. */
function filenameStem(path: string): string {
  const filename = path.slice(path.lastIndexOf("/") + 1)
  const dot = filename.lastIndexOf(".")

  return dot > 0 ? filename.slice(0, dot) : filename
}

function xmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Traktor's date format: `2026/9/30`, no zero padding. */
function traktorDate(date: Date): string {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

/** 32 lowercase hex characters, which is what Traktor writes for a UUID. */
function playlistUuid(): string {
  return crypto.randomUUID().replace(/-/g, "")
}

export interface NmlOptions {
  /** Today, unless a test needs a fixed day. */
  today?: Date
  /** The playlist's UUID, unless a test needs a fixed one. */
  uuid?: string
}

/**
 * Builds a Traktor-compatible `.nml` from an M3U8.
 *
 * The output carries a COLLECTION entry per track (title, artist, location,
 * playtime) and one playlist under `$ROOT` that references them by primary key
 * — the shape Traktor itself writes for a playlist export, so it imports as one.
 */
export function convertM3u8ToNml(
  m3u8: string,
  playlistName = "Playlist",
  options: NmlOptions = {}
): string {
  const tracks = parseM3u8(m3u8)
  const today = traktorDate(options.today ?? new Date())
  const uuid = options.uuid ?? playlistUuid()

  const locations = tracks.map((track) => pathToTraktorParts(track.path))

  const entries = tracks.map(
    (track, index) =>
      `    <ENTRY MODIFIED_DATE="${today}" MODIFIED_TIME="0" TITLE="${xmlAttr(track.title)}" ARTIST="${xmlAttr(track.artist)}">
      <LOCATION DIR="${xmlAttr(locations[index].dir)}" FILE="${xmlAttr(locations[index].file)}" VOLUME="${xmlAttr(locations[index].volume)}" VOLUMEID="${xmlAttr(locations[index].volume)}"></LOCATION>
      <MODIFICATION_INFO AUTHOR_TYPE="user"></MODIFICATION_INFO>
      <INFO PLAYTIME="${track.playtime}" IMPORT_DATE="${today}" FLAGS="12" FILESIZE="0"></INFO>
    </ENTRY>`
  )

  const refs = locations.map(
    (location) =>
      `            <ENTRY>
              <PRIMARYKEY TYPE="TRACK" KEY="${xmlAttr(location.primaryKey)}"></PRIMARYKEY>
            </ENTRY>`
  )

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<NML VERSION="19">
  <HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"></HEAD>
  <MUSICFOLDERS></MUSICFOLDERS>
  <COLLECTION ENTRIES="${tracks.length}">
${entries.join("\n")}
  </COLLECTION>
  <SETS ENTRIES="0"></SETS>
  <PLAYLISTS>
    <NODE TYPE="FOLDER" NAME="$ROOT">
      <SUBNODES COUNT="1">
        <NODE TYPE="PLAYLIST" NAME="${xmlAttr(playlistName)}">
          <PLAYLIST ENTRIES="${tracks.length}" TYPE="LIST" UUID="${uuid}">
${refs.join("\n")}
          </PLAYLIST>
        </NODE>
      </SUBNODES>
    </NODE>
  </PLAYLISTS>
  <INDEXING></INDEXING>
</NML>
`
}

// --- The file, either way ---------------------------------------------------

/** Which way a file goes, from its extension alone — or `null` if neither. */
export function directionForFilename(
  filename: string
): ConversionDirection | null {
  const lower = filename.toLowerCase()

  if (lower.endsWith(".nml")) {
    return "nml_to_m3u8"
  }

  if (lower.endsWith(".m3u8") || lower.endsWith(".m3u")) {
    return "m3u8_to_nml"
  }

  return null
}

/** A playlist name as a filename: slashes would be read as directories. */
function safeFilename(name: string): string {
  return name.replace(/[/\\]/g, "-")
}

function filenameStemOf(filename: string): string {
  const dot = filename.lastIndexOf(".")

  return dot > 0 ? filename.slice(0, dot) : filename
}

/**
 * What the page does with a dropped file: picks the direction from the
 * extension, converts, and names the outputs.
 *
 * The original served a ZIP when an NML held several playlists. Here every
 * playlist is its own download instead — a ZIP would have cost a dependency
 * shipped to every visitor's browser for the one case, and a list of files
 * lets the DJ take the one they came for.
 */
export function convertPlaylistFile(
  filename: string,
  contents: string,
  options: NmlOptions = {}
): ConversionResult {
  const direction = directionForFilename(filename)

  if (direction === null) {
    throw new ConversionError(
      "unsupported_extension",
      `Expected a .nml, .m3u8 or .m3u file, got "${filename}".`
    )
  }

  if (direction === "nml_to_m3u8") {
    const playlists = convertNmlToM3u8(contents)

    if (playlists.length === 0) {
      throw new ConversionError(
        "no_playlists",
        "No playlists with tracks were found in this NML."
      )
    }

    return {
      direction,
      files: playlists.map((playlist) => ({
        filename: `${safeFilename(playlist.name)}.m3u8`,
        contents: playlist.m3u8Content,
        mimeType: "audio/x-mpegurl",
        trackCount: playlist.trackCount,
      })),
    }
  }

  const playlistName = filenameStemOf(filename)
  const trackCount = parseM3u8(contents).length

  // The original would happily hand back an NML with zero entries. There is
  // nothing to import from one, so the page says so instead.
  if (trackCount === 0) {
    throw new ConversionError("no_tracks", "No tracks were found in this M3U8.")
  }

  return {
    direction,
    files: [
      {
        filename: `${safeFilename(playlistName)}.nml`,
        contents: convertM3u8ToNml(contents, playlistName, options),
        mimeType: "application/xml",
        trackCount,
      },
    ],
  }
}
