/**
 * Playlist export serializers (pure, client-safe — no server-only deps).
 *
 * The default export format mirrors how the playlist was imported: a Rekordbox
 * import exports back to Rekordbox XML, a Traktor import to Traktor NML. CSV and
 * TXT are always available as a "Save as…" fallback. Native exports reuse each
 * track's stored `sourceUri` (the original file reference) so the playlist
 * relinks to the DJ's library on re-import; manual playlists have no file
 * references and fall back to CSV/TXT.
 *
 * **The reorder is the product; the track metadata is the DJ's.** A native
 * export re-emits each track's source library entry verbatim (`sourcePayload`,
 * captured at import — see `source-entry.ts`) and changes only the order of the
 * playlist node. Rebuilding those entries from the fields we happen to model is
 * what cost an alpha user his hotcues, comments and album tags, and forced a
 * re-analysis: a real Traktor entry carries around twenty-five fields and this
 * writer modelled eleven. Nothing is written into the DJ's library that did not
 * come out of it, unless they ask for it (`writeEnergyToComment`).
 */

import { musicalKeyToTraktorValue } from "@/lib/music/camelot"
import {
  getOwnAttribute,
  hasChildElement,
  setAttribute,
  setOwnAttribute,
  type SourceHeader,
  type SourcePayloadFormat,
} from "@/lib/playlists/source-entry"

export type ExportFormat = "rekordbox" | "traktor" | "m3u8" | "csv" | "txt"

export interface ExportTrack {
  position: number
  artist: string
  name: string
  bpm: number | null
  /**
   * The energy to write when `writeEnergyToComment` is on: the **resolved**
   * value the DJ is looking at, not the raw tag we imported.
   *
   * This distinction was a bug. Callers passed `tracks.energy_score`, which is
   * null for every track whose library carried no energy tag — which is the
   * whole population the option exists for. Ticking "write energy into the
   * comment tag" on such a set silently wrote nothing at all.
   */
  energyScore: number | null
  sourceUri: string | null
  musicalKey: string | null
  genre: string | null
  comment: string | null
  durationSeconds: number | null
  /** The verbatim library entry this track was imported from, when there is one. */
  sourcePayload?: string | null
  sourcePayloadFormat?: SourcePayloadFormat | null
}

export interface ExportPlaylist {
  name: string
  importSource: string | null
  tracks: ExportTrack[]
  /** The source file's root/header elements, so a re-export declares what came in. */
  sourceHeader?: SourceHeader | null
}

export interface ExportOptions {
  /**
   * Write the resolved energy into the track's comment tag. Off by default:
   * the comment field belongs to the DJ, and a synthesised "Energy 7" landing
   * in their library is a write they did not ask for. Only affects entries that
   * already have an `<INFO>` element to carry it.
   */
  writeEnergyToComment?: boolean
  /**
   * Emit the playlist without any collection entries, so importing it cannot
   * modify the library at all — there is nothing for the DJ software to merge.
   *
   * Not exposed in the UI yet: an empty collection may make the imported
   * playlist resolve as empty in some Traktor versions, and that has to be
   * verified against a real install before it can be offered to someone
   * mid-gig. Serialiser support and tests land first so the verification has
   * something to run against.
   */
  playlistOnly?: boolean
}

interface FormatMeta {
  label: string
  extension: string
  mimeType: string
}

export const EXPORT_FORMAT_META: Record<ExportFormat, FormatMeta> = {
  rekordbox: { label: "Rekordbox (.xml)", extension: "xml", mimeType: "application/xml" },
  traktor: { label: "Traktor (.nml)", extension: "nml", mimeType: "application/xml" },
  m3u8: { label: "M3U8 (.m3u8)", extension: "m3u8", mimeType: "audio/x-mpegurl" },
  csv: { label: "CSV (.csv)", extension: "csv", mimeType: "text/csv" },
  txt: { label: "Text (.txt)", extension: "txt", mimeType: "text/plain" },
}

// Portable formats offered for every playlist, whatever its origin.
const UNIVERSAL_FORMATS: ExportFormat[] = ["csv", "txt", "m3u8"]

/** Default export format = the format the playlist was imported from. */
export function defaultExportFormat(importSource: string | null): ExportFormat {
  switch (importSource) {
    case "rekordbox":
    case "traktor":
    case "m3u8":
      return importSource
    case "text":
      return "txt"
    case "files":
      // Imported from the user's own files, so we only ever knew a filename or a
      // folder-relative path — never the absolute path Rekordbox and Traktor
      // need. M3U8 is the one format that can still resolve those, by sitting
      // next to the music and referencing it relatively.
      return "m3u8"
    default:
      return "csv"
  }
}

/**
 * True when native DJ-software exports will produce a playlist whose tracks show
 * up as missing.
 *
 * Audio-file imports carry a bare filename (or a folder-relative path) because
 * the browser never exposes the absolute one. The Traktor writer therefore has
 * to synthesise a placeholder volume, and Traktor can't resolve it — the
 * playlist loads with every entry greyed out. Worth saying before the download,
 * not after.
 */
export function nativeExportWillMissTracks(
  importSource: string | null,
  format: ExportFormat
): boolean {
  return importSource === "files" && (format === "rekordbox" || format === "traktor")
}

/**
 * Formats offered for a playlist: its native format first (only when it was
 * imported from that software), then the universal formats (CSV, TXT, M3U8). We
 * never offer cross-native conversion (e.g. Rekordbox → Traktor) because the
 * volume/path semantics don't round-trip reliably.
 */
export function availableExportFormats(
  importSource: string | null
): ExportFormat[] {
  const primary = defaultExportFormat(importSource)
  const extras = UNIVERSAL_FORMATS.filter((f) => f !== primary)
  return [primary, ...extras]
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "playlist"
  )
}

// Badge appended to every exported file so a DJ can tell, at a glance in their
// downloads, that this playlist was reordered by us. The real extension always
// stays last, so "…energycurve.app.xml" still opens as an .xml.
const EXPORT_BADGE = "optimized-with-energycurve.app"

export function exportFilename(format: ExportFormat, playlistName: string): string {
  return `${slugify(playlistName)}-${EXPORT_BADGE}.${EXPORT_FORMAT_META[format].extension}`
}

export function serializePlaylist(
  format: ExportFormat,
  playlist: ExportPlaylist,
  options: ExportOptions = {}
): string {
  switch (format) {
    case "rekordbox":
      return toRekordbox(playlist, options)
    case "traktor":
      return toTraktor(playlist, options)
    case "m3u8":
      return toM3u8(playlist)
    case "csv":
      return toCsv(playlist)
    case "txt":
      return toTxt(playlist)
  }
}

/** True when this playlist can be exported without rebuilding library entries. */
export function hasPreservedEntries(playlist: ExportPlaylist): boolean {
  return playlist.tracks.some((track) => Boolean(track.sourcePayload))
}

export interface PreservationSummary {
  /** Tracks whose source library entry we still hold. */
  preserved: number
  total: number
  /** True when a native export of this playlist rebuilds at least one entry. */
  rebuildsSome: boolean
  /**
   * True when this playlist came from DJ software but we hold no entry for any
   * of it — the shape of every set imported before preservation shipped.
   */
  importedBeforePreservation: boolean
}

/**
 * How much of a native export will be the DJ's own bytes, and how much we have
 * to rebuild.
 *
 * Worth surfacing because the difference is invisible in the file name and very
 * visible in Traktor: a playlist imported before preservation existed has no
 * stored entries, so its export carries only the handful of fields we model and
 * lands in the library looking stripped. That is not a bug to fix silently —
 * the data is genuinely gone from our side — but it is a thing to say, with the
 * one action that fixes it (re-import the file).
 */
export function preservationSummary(
  playlist: ExportPlaylist
): PreservationSummary {
  const total = playlist.tracks.length
  const preserved = playlist.tracks.filter((track) =>
    Boolean(track.sourcePayload)
  ).length
  const native =
    playlist.importSource === "traktor" || playlist.importSource === "rekordbox"

  return {
    preserved,
    total,
    rebuildsSome: preserved < total,
    importedBeforePreservation: native && preserved === 0 && total > 0,
  }
}

// --- CSV -------------------------------------------------------------------

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function durationClock(seconds: number | null): string {
  if (seconds === null || seconds <= 0) {
    return ""
  }
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function toCsv(playlist: ExportPlaylist): string {
  const header = [
    "Position",
    "Artist",
    "Title",
    "BPM",
    "Key",
    "Genre",
    "Energy",
    "Time",
  ].join(",")
  const rows = playlist.tracks.map((track) =>
    [
      track.position,
      csvCell(track.artist),
      csvCell(track.name),
      track.bpm ?? "",
      csvCell(track.musicalKey ?? ""),
      csvCell(track.genre ?? ""),
      track.energyScore ?? "",
      durationClock(track.durationSeconds),
    ].join(",")
  )
  return [header, ...rows].join("\r\n") + "\r\n"
}

// --- TXT (Rekordbox-style tab-separated grid) ------------------------------

/**
 * Emits the tab-separated grid Rekordbox writes for "Export a playlist to a
 * file (*.txt)": a header row plus one row per track. Round-trips back through
 * `parseRekordboxTxt` (header-driven column resolution). CRLF line endings and
 * a leading "#" position column match Rekordbox's own output.
 */
function toTxt(playlist: ExportPlaylist): string {
  const header = ["#", "Track Title", "Artist", "BPM", "Time", "Key", "Genre"]

  const rows = playlist.tracks.map((track) =>
    [
      track.position,
      track.name,
      track.artist,
      track.bpm ?? "",
      durationClock(track.durationSeconds),
      track.musicalKey ?? "",
      track.genre ?? "",
    ].join("\t")
  )

  return [header.join("\t"), ...rows].join("\r\n") + "\r\n"
}

// --- M3U8 (Extended M3U for music apps) ------------------------------------

/**
 * Emits an Extended M3U playlist (Rekordbox' "for music apps" export): an
 * `#EXTM3U` header, then per track an `#EXTINF:<seconds>,<Artist> - <Title>`
 * line followed by its file reference. Uses the stored `sourceUri` so players
 * relink to the real files; falls back to an "Artist - Title" line when the
 * playlist has no file references (manual sets). Unknown durations use -1, the
 * conventional M3U placeholder.
 */
function toM3u8(playlist: ExportPlaylist): string {
  const lines = ["#EXTM3U"]

  for (const track of playlist.tracks) {
    const label = track.artist
      ? `${track.artist} - ${track.name}`
      : track.name
    const duration = track.durationSeconds ?? -1
    lines.push(`#EXTINF:${duration},${label}`)
    lines.push(track.sourceUri ?? label)
  }

  return lines.join("\n") + "\n"
}

// --- Shared XML helpers ----------------------------------------------------

function xmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function bpmFixed(bpm: number | null): string | null {
  return bpm == null ? null : bpm.toFixed(2)
}

/**
 * Comment tag to emit for a track.
 *
 * The DJ's own comment, verbatim — and nothing else unless they opted in.
 * This used to synthesise "Energy N" into any empty comment field, which meant
 * every export wrote a value into the DJ's library that they never put there.
 * With `writeEnergyToComment` on, the energy is merged *into* the existing
 * comment rather than replacing it, and an existing energy token is updated in
 * place so repeated exports don't stack "Energy 7 Energy 8".
 */
function trackComment(
  comment: string | null,
  energy: number | null,
  options: ExportOptions
): string | null {
  const existing = comment && comment.trim() ? comment.trim() : null

  if (!options.writeEnergyToComment || energy == null) {
    return existing
  }

  // Tags are written on a 1-10 integer scale, which is what every reader of
  // this field expects; the resolved energy carries a decimal.
  const value = Math.min(10, Math.max(1, Math.round(energy)))

  if (!existing) {
    return `Energy ${value}`
  }

  if (ENERGY_TOKEN.test(existing)) {
    return existing.replace(ENERGY_TOKEN, `Energy ${value}`)
  }

  return `${existing} Energy ${value}`
}

const ENERGY_TOKEN = /energy\s*\d{1,2}/i

// --- Shared: preserved library entries -------------------------------------

/**
 * The verbatim source entry for this track, when it came from the format being
 * exported. Cross-format is deliberately excluded: a Rekordbox `<TRACK>` is not
 * a Traktor `<ENTRY>`, and pasting one into the other produces a file that
 * parses and then means nothing.
 */
function preservedEntry(
  track: ExportTrack,
  format: SourcePayloadFormat
): string | null {
  if (!track.sourcePayload || track.sourcePayloadFormat !== format) {
    return null
  }

  return track.sourcePayload
}

/**
 * Collects one collection entry per distinct track, in first-appearance order.
 *
 * Deduplicated because a collection is a set: a track played twice in a set is
 * two playlist references to one entry, and emitting the entry twice asks the
 * DJ software to merge a track with itself.
 */
function collectionEntries<T>(
  tracks: ExportTrack[],
  keyOf: (track: ExportTrack) => string,
  render: (track: ExportTrack, key: string) => T
): T[] {
  const seen = new Set<string>()
  const out: T[] = []

  for (const track of tracks) {
    const key = keyOf(track)

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    out.push(render(track, key))
  }

  return out
}

// --- Rekordbox XML ---------------------------------------------------------

const DEFAULT_REKORDBOX_ROOT_ATTRS = 'Version="1.0.0"'
const DEFAULT_REKORDBOX_PREFIX =
  '<PRODUCT Name="rekordbox" Version="6.0.0" Company="AlphaTheta"/>'

function rekordboxHeader(playlist: ExportPlaylist): {
  rootAttrs: string
  prefix: string
} {
  const header = playlist.sourceHeader

  if (header?.format !== "rekordbox_xml") {
    return {
      rootAttrs: DEFAULT_REKORDBOX_ROOT_ATTRS,
      prefix: DEFAULT_REKORDBOX_PREFIX,
    }
  }

  return {
    rootAttrs: header.rootAttrs || DEFAULT_REKORDBOX_ROOT_ATTRS,
    prefix: header.prefix || DEFAULT_REKORDBOX_PREFIX,
  }
}

/** Rekordbox matches a collection track to a playlist reference by TrackID. */
function rekordboxKey(track: ExportTrack): string {
  return track.sourceUri ?? `${track.position}-${track.artist}-${track.name}`
}

function synthesizedRekordboxTrack(
  track: ExportTrack,
  trackId: number,
  options: ExportOptions
): string {
  const bpm = bpmFixed(track.bpm)
  const comment = trackComment(track.comment, track.energyScore, options)
  const attrs = [
    `TrackID="${trackId}"`,
    `Name="${xmlAttr(track.name)}"`,
    `Artist="${xmlAttr(track.artist)}"`,
    bpm ? `AverageBpm="${bpm}"` : "",
    track.musicalKey ? `Tonality="${xmlAttr(track.musicalKey)}"` : "",
    track.genre ? `Genre="${xmlAttr(track.genre)}"` : "",
    track.durationSeconds != null ? `TotalTime="${track.durationSeconds}"` : "",
    track.sourceUri ? `Location="${xmlAttr(track.sourceUri)}"` : "",
    comment ? `Comments="${xmlAttr(comment)}"` : "",
  ]
    .filter(Boolean)
    .join(" ")

  return `    <TRACK ${attrs}/>`
}

function toRekordbox(
  playlist: ExportPlaylist,
  options: ExportOptions
): string {
  const { tracks } = playlist
  const { rootAttrs, prefix } = rekordboxHeader(playlist)

  // TrackIDs: a preserved entry keeps its own, so its <POSITION_MARK> cues and
  // rating stay attached to the id rekordbox already knows. Synthesised entries
  // get ids above every preserved one, so the two can never collide.
  const preservedIds = new Set<number>()

  for (const track of tracks) {
    const entry = preservedEntry(track, "rekordbox_xml")
    const id = entry ? Number(getOwnAttribute(entry, "TrackID")) : NaN

    if (Number.isInteger(id)) {
      preservedIds.add(id)
    }
  }

  let nextId = Math.max(0, ...preservedIds) + 1
  const idByKey = new Map<string, number>()

  const entries = collectionEntries(tracks, rekordboxKey, (track, key) => {
    const preserved = preservedEntry(track, "rekordbox_xml")
    const preservedId = preserved
      ? Number(getOwnAttribute(preserved, "TrackID"))
      : NaN

    if (preserved && Number.isInteger(preservedId)) {
      idByKey.set(key, preservedId)

      const comment = trackComment(track.comment, track.energyScore, options)

      return `    ${
        options.writeEnergyToComment && comment
          ? setOwnAttribute(preserved, "Comments", comment)
          : preserved
      }`
    }

    const id = preserved && Number.isInteger(preservedId) ? preservedId : nextId++
    idByKey.set(key, id)

    if (preserved) {
      // A preserved entry with no usable TrackID: keep every other field and
      // stamp on the one rekordbox needs to resolve the reference.
      return `    ${setOwnAttribute(preserved, "TrackID", String(id))}`
    }

    return synthesizedRekordboxTrack(track, id, options)
  })

  const refs = tracks
    .map((track) => {
      const id = idByKey.get(rekordboxKey(track))
      return id === undefined
        ? ""
        : `        <TRACK Key="${id}"/>`
    })
    .filter(Boolean)
    .join("\n")

  const collection = options.playlistOnly ? [] : entries

  return `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS ${rootAttrs}>
  ${prefix}
  <COLLECTION Entries="${collection.length}">
${collection.join("\n")}
  </COLLECTION>
  <PLAYLISTS>
    <NODE Type="0" Name="ROOT" Count="1">
      <NODE Name="${xmlAttr(playlist.name)}" Type="1" KeyType="0" Entries="${tracks.length}">
${refs}
      </NODE>
    </NODE>
  </PLAYLISTS>
</DJ_PLAYLISTS>
`
}

// --- Traktor NML -----------------------------------------------------------

const DEFAULT_TRAKTOR_ROOT_ATTRS = 'VERSION="19"'
const DEFAULT_TRAKTOR_PREFIX =
  '<HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"/>'

/**
 * The NML header to emit. Taken from the source file when we have it: our
 * hardcoded `VERSION="19"` handed a file from any other Traktor version back
 * mislabelled, which is a lie about the document even when nothing breaks.
 */
function traktorHeader(playlist: ExportPlaylist): {
  rootAttrs: string
  prefix: string
} {
  const header = playlist.sourceHeader

  if (header?.format !== "traktor_nml") {
    return {
      rootAttrs: DEFAULT_TRAKTOR_ROOT_ATTRS,
      prefix: DEFAULT_TRAKTOR_PREFIX,
    }
  }

  return {
    rootAttrs: header.rootAttrs || DEFAULT_TRAKTOR_ROOT_ATTRS,
    prefix: header.prefix || DEFAULT_TRAKTOR_PREFIX,
  }
}

/**
 * Splits a Traktor location key (VOLUME + DIR + FILE, joined by "/:" segments,
 * e.g. "Macintosh HD/:Users/:dj/:Music/:track.mp3") back into its LOCATION
 * parts. Inverse of the parser's `locationKey` concatenation.
 *
 * Only reached for tracks with no preserved entry: when we have the source
 * entry, its LOCATION is re-emitted untouched and nothing is split or rejoined.
 * (Verified against a real 3017-entry collection: the split round-trips
 * 3023/3023 locations, so this is correct — it is just no longer on the path
 * that matters.)
 */
function splitTraktorLocation(key: string): {
  volume: string
  dir: string
  file: string
} {
  const parts = key.split("/:")

  if (parts.length < 2) {
    // Not a real Traktor key — wrap it so the emitted file still round-trips.
    return { volume: "EnergyCurve", dir: "/:", file: key }
  }

  const volume = parts[0]
  const file = parts[parts.length - 1]
  const dirParts = parts.slice(1, -1)
  const dir = dirParts.length > 0 ? `/:${dirParts.join("/:")}/:` : "/:"

  return { volume, dir, file }
}

function traktorLocationKey(track: ExportTrack): string {
  if (track.sourceUri) {
    return track.sourceUri
  }
  // Synthesize a stable, unique key so a manual/pathless track still produces a
  // valid, resolvable entry. Kept in the same "/:"-segmented shape.
  const safe = `${track.position}-${track.artist}-${track.name}`.replace(
    /[^a-zA-Z0-9]+/g,
    "-"
  )
  return `EnergyCurve/:${safe}`
}

/**
 * Traktor links a playlist ENTRY to a collection ENTRY by the exact
 * VOLUME+DIR+FILE concatenation of the collection entry's LOCATION.
 *
 * With a preserved entry that concatenation is exactly the `sourceUri` we
 * stored at import — the parser built one from the other — so it is used
 * directly and no split/rejoin can perturb it. Without one, the key has to be
 * derived from the SAME split we emit: for bare filenames (audio-file imports,
 * where the browser never exposes a real path) the location is synthesized as
 * VOLUME="EnergyCurve" DIR="/:", and a raw filename key would match nothing →
 * Traktor showed the playlist as EMPTY.
 */
function canonicalTraktorKey(track: ExportTrack): string {
  if (preservedEntry(track, "traktor_nml") && track.sourceUri) {
    return track.sourceUri
  }

  const location = splitTraktorLocation(traktorLocationKey(track))
  return `${location.volume}${location.dir}${location.file}`
}

function synthesizedTraktorEntry(
  track: ExportTrack,
  options: ExportOptions
): string {
  const loc = splitTraktorLocation(traktorLocationKey(track))
  const comment = trackComment(track.comment, track.energyScore, options)
  const bpm = track.bpm == null ? null : track.bpm.toFixed(6)
  const infoAttrs = [
    track.genre ? `GENRE="${xmlAttr(track.genre)}"` : "",
    comment ? `COMMENT="${xmlAttr(comment)}"` : "",
    track.musicalKey ? `KEY="${xmlAttr(track.musicalKey)}"` : "",
    track.durationSeconds != null ? `PLAYTIME="${track.durationSeconds}"` : "",
  ]
    .filter(Boolean)
    .join(" ")
  const info = infoAttrs ? `<INFO ${infoAttrs}/>` : ""
  const tempo = bpm ? `<TEMPO BPM="${bpm}"/>` : ""
  // Traktor's Key COLUMN reads the numeric MUSICAL_KEY, not the INFO KEY
  // text — without this element exported keys were invisible in Traktor.
  const keyValue = musicalKeyToTraktorValue(track.musicalKey)
  const musicalKey =
    keyValue !== null ? `<MUSICAL_KEY VALUE="${keyValue}"/>` : ""

  return `    <ENTRY TITLE="${xmlAttr(track.name)}" ARTIST="${xmlAttr(track.artist)}">
      <LOCATION DIR="${xmlAttr(loc.dir)}" FILE="${xmlAttr(loc.file)}" VOLUME="${xmlAttr(loc.volume)}"/>
      ${info}
      ${musicalKey}
      ${tempo}
    </ENTRY>`
}

function toTraktor(playlist: ExportPlaylist, options: ExportOptions): string {
  const { tracks } = playlist
  const { rootAttrs, prefix } = traktorHeader(playlist)

  const entries = collectionEntries(tracks, canonicalTraktorKey, (track) => {
    const preserved = preservedEntry(track, "traktor_nml")

    if (!preserved) {
      return synthesizedTraktorEntry(track, options)
    }

    if (!options.writeEnergyToComment) {
      return `    ${preserved}`
    }

    const comment = trackComment(track.comment, track.energyScore, options)

    // An entry with no <INFO> element has nowhere to carry a comment, and
    // inventing structure inside someone's library entry is exactly the class
    // of write this whole change exists to stop. Leave it alone.
    const carries = hasChildElement(preserved, "INFO")

    return `    ${
      comment && carries
        ? setAttribute(preserved, "INFO", "COMMENT", comment)
        : preserved
    }`
  })

  const collection = options.playlistOnly ? [] : entries

  const refs = tracks
    .map((track) => {
      const key = canonicalTraktorKey(track)
      return `          <ENTRY><PRIMARYKEY TYPE="TRACK" KEY="${xmlAttr(key)}"/></ENTRY>`
    })
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<NML ${rootAttrs}>
  ${prefix}
  <COLLECTION ENTRIES="${collection.length}">
${collection.join("\n")}
  </COLLECTION>
  <PLAYLISTS>
    <NODE TYPE="FOLDER" NAME="$ROOT">
      <SUBNODES COUNT="1">
        <NODE TYPE="PLAYLIST" NAME="${xmlAttr(playlist.name)}">
          <PLAYLIST ENTRIES="${tracks.length}" TYPE="LIST">
${refs}
          </PLAYLIST>
        </NODE>
      </SUBNODES>
    </NODE>
  </PLAYLISTS>
</NML>
`
}
