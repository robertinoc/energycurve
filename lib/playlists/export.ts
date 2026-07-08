/**
 * Playlist export serializers (pure, client-safe — no server-only deps).
 *
 * The default export format mirrors how the playlist was imported: a Rekordbox
 * import exports back to Rekordbox XML, a Traktor import to Traktor NML. CSV and
 * TXT are always available as a "Save as…" fallback. Native exports reuse each
 * track's stored `sourceUri` (the original file reference) so the playlist
 * relinks to the DJ's library on re-import; manual playlists have no file
 * references and fall back to CSV/TXT.
 */

export type ExportFormat = "rekordbox" | "traktor" | "csv" | "txt"

export interface ExportTrack {
  position: number
  artist: string
  name: string
  bpm: number | null
  energyScore: number | null
  sourceUri: string | null
}

export interface ExportPlaylist {
  name: string
  importSource: string | null
  tracks: ExportTrack[]
}

interface FormatMeta {
  label: string
  extension: string
  mimeType: string
}

export const EXPORT_FORMAT_META: Record<ExportFormat, FormatMeta> = {
  rekordbox: { label: "Rekordbox (.xml)", extension: "xml", mimeType: "application/xml" },
  traktor: { label: "Traktor (.nml)", extension: "nml", mimeType: "application/xml" },
  csv: { label: "CSV (.csv)", extension: "csv", mimeType: "text/csv" },
  txt: { label: "Text (.txt)", extension: "txt", mimeType: "text/plain" },
}

/** Default export format = the format the playlist was imported from. */
export function defaultExportFormat(importSource: string | null): ExportFormat {
  return importSource === "rekordbox" || importSource === "traktor"
    ? importSource
    : "csv"
}

/**
 * Formats offered for a playlist: its native format first (only when it was
 * imported from that software), then CSV and TXT. We never offer cross-native
 * conversion (e.g. Rekordbox → Traktor) because the volume/path semantics don't
 * round-trip reliably.
 */
export function availableExportFormats(
  importSource: string | null
): ExportFormat[] {
  const primary = defaultExportFormat(importSource)
  const extras = (["csv", "txt"] as ExportFormat[]).filter((f) => f !== primary)
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

export function exportFilename(format: ExportFormat, playlistName: string): string {
  return `${slugify(playlistName)}.${EXPORT_FORMAT_META[format].extension}`
}

export function serializePlaylist(
  format: ExportFormat,
  playlist: ExportPlaylist
): string {
  switch (format) {
    case "rekordbox":
      return toRekordbox(playlist)
    case "traktor":
      return toTraktor(playlist)
    case "csv":
      return toCsv(playlist)
    case "txt":
      return toTxt(playlist)
  }
}

// --- CSV -------------------------------------------------------------------

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function toCsv(playlist: ExportPlaylist): string {
  const header = ["Position", "Artist", "Title", "BPM", "Energy"].join(",")
  const rows = playlist.tracks.map((track) =>
    [
      track.position,
      csvCell(track.artist),
      csvCell(track.name),
      track.bpm ?? "",
      track.energyScore ?? "",
    ].join(",")
  )
  return [header, ...rows].join("\r\n") + "\r\n"
}

// --- TXT -------------------------------------------------------------------

function toTxt(playlist: ExportPlaylist): string {
  return (
    playlist.tracks.map((track) => `${track.artist} - ${track.name}`).join("\n") +
    "\n"
  )
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

function energyComment(energy: number | null): string | null {
  return energy == null ? null : `Energy ${energy}`
}

// --- Rekordbox XML ---------------------------------------------------------

function toRekordbox(playlist: ExportPlaylist): string {
  const { tracks } = playlist

  const collection = tracks
    .map((track, index) => {
      const bpm = bpmFixed(track.bpm)
      const comment = energyComment(track.energyScore)
      const attrs = [
        `TrackID="${index + 1}"`,
        `Name="${xmlAttr(track.name)}"`,
        `Artist="${xmlAttr(track.artist)}"`,
        bpm ? `AverageBpm="${bpm}"` : "",
        track.sourceUri ? `Location="${xmlAttr(track.sourceUri)}"` : "",
        comment ? `Comments="${xmlAttr(comment)}"` : "",
      ]
        .filter(Boolean)
        .join(" ")
      return `    <TRACK ${attrs}/>`
    })
    .join("\n")

  const refs = tracks
    .map((_, index) => `        <TRACK Key="${index + 1}"/>`)
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="rekordbox" Version="6.0.0" Company="AlphaTheta"/>
  <COLLECTION Entries="${tracks.length}">
${collection}
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

/**
 * Splits a Traktor location key (VOLUME + DIR + FILE, joined by "/:" segments,
 * e.g. "Macintosh HD/:Users/:dj/:Music/:track.mp3") back into its LOCATION
 * parts. Inverse of the parser's `locationKey` concatenation.
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

function toTraktor(playlist: ExportPlaylist): string {
  const { tracks } = playlist

  const entries = tracks
    .map((track) => {
      const key = traktorLocationKey(track)
      const loc = splitTraktorLocation(key)
      const comment = energyComment(track.energyScore)
      const bpm = track.bpm == null ? null : track.bpm.toFixed(6)
      const info = comment ? `<INFO COMMENT="${xmlAttr(comment)}"/>` : ""
      const tempo = bpm ? `<TEMPO BPM="${bpm}"/>` : ""

      return `    <ENTRY TITLE="${xmlAttr(track.name)}" ARTIST="${xmlAttr(track.artist)}">
      <LOCATION DIR="${xmlAttr(loc.dir)}" FILE="${xmlAttr(loc.file)}" VOLUME="${xmlAttr(loc.volume)}"/>
      ${info}
      ${tempo}
    </ENTRY>`
    })
    .join("\n")

  const refs = tracks
    .map((track) => {
      const key = traktorLocationKey(track)
      return `          <ENTRY><PRIMARYKEY TYPE="TRACK" KEY="${xmlAttr(key)}"/></ENTRY>`
    })
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<NML VERSION="19">
  <HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"/>
  <COLLECTION ENTRIES="${tracks.length}">
${entries}
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
