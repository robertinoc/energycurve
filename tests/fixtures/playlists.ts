/**
 * Synthetic test corpus — playlists and tracks, in every format the product
 * reads, with the gaps and the hostile cases written in on purpose.
 *
 * Everything here is invented. That is the point: the only real-world material
 * in this repo is `fixtures-pride-bounce.json`, one hard-techno set, and a suite
 * that leans on one person's library tests one person's library. It also means
 * nobody's collection ends up in a git history.
 *
 * Built as generators rather than checked-in files for two reasons. A file
 * drifts from the parser it is meant to exercise and nobody notices until it
 * silently stops covering anything; and a parameterised builder lets a test ask
 * for the shape it needs — "thirty tracks, six of them untagged" — instead of
 * hand-editing XML.
 */

export interface SyntheticTrack {
  name: string
  artist: string
  bpm: number | null
  musicalKey: string | null
  durationSeconds: number | null
  energy: number | null
}

/** A believable techno set: a ramp with a breather, not a straight line. */
const BASE: SyntheticTrack[] = [
  { name: "First Light", artist: "Nite Fleit", bpm: 124, musicalKey: "8A", durationSeconds: 372, energy: 4 },
  { name: "Slow Burn", artist: "Or:la", bpm: 126, musicalKey: "8A", durationSeconds: 401, energy: 5 },
  { name: "Undertow", artist: "Perc", bpm: 130, musicalKey: "9A", durationSeconds: 355, energy: 6 },
  { name: "Pressure Drop", artist: "Anetha", bpm: 134, musicalKey: "9A", durationSeconds: 318, energy: 7 },
  { name: "Breather", artist: "Skee Mask", bpm: 128, musicalKey: "4A", durationSeconds: 444, energy: 5 },
  { name: "Back Up", artist: "I Hate Models", bpm: 138, musicalKey: "10A", durationSeconds: 340, energy: 8 },
  { name: "Peak", artist: "Amelie Lens", bpm: 142, musicalKey: "10A", durationSeconds: 366, energy: 9 },
  { name: "Hold It", artist: "Charlotte de Witte", bpm: 142, musicalKey: "11A", durationSeconds: 328, energy: 9 },
  { name: "Come Down", artist: "Kobosil", bpm: 136, musicalKey: "11A", durationSeconds: 390, energy: 7 },
  { name: "Last One", artist: "Maceo Plex", bpm: 128, musicalKey: "4A", durationSeconds: 468, energy: 6 },
]

export interface PlaylistShape {
  /** How many tracks. Cycles through the base set, renaming as it goes. */
  length?: number
  /** Tracks with no BPM tag, counted from the start. */
  missingBpm?: number
  /** Tracks with no key. */
  missingKey?: number
  /** Tracks with no duration — the case that makes a set length a guess. */
  missingDuration?: number
  /**
   * Include one absurd duration.
   *
   * A whole set exported as a single file is a real thing people have in their
   * libraries, and it is the value that quietly poisons a median.
   */
  withOutlierDuration?: boolean
}

export function syntheticPlaylist(shape: PlaylistShape = {}): SyntheticTrack[] {
  const {
    length = BASE.length,
    missingBpm = 0,
    missingKey = 0,
    missingDuration = 0,
    withOutlierDuration = false,
  } = shape

  const tracks: SyntheticTrack[] = Array.from({ length }, (_, index) => {
    const base = BASE[index % BASE.length]

    return {
      ...base,
      // Renamed past the first cycle so every track is distinguishable — a
      // duplicate name would let a matching bug pass unnoticed.
      name: index < BASE.length ? base.name : `${base.name} ${Math.floor(index / BASE.length) + 1}`,
    }
  })

  for (let index = 0; index < missingBpm && index < tracks.length; index += 1) {
    tracks[index].bpm = null
  }
  for (let index = 0; index < missingKey && index < tracks.length; index += 1) {
    tracks[index].musicalKey = null
  }
  for (let index = 0; index < missingDuration && index < tracks.length; index += 1) {
    tracks[index].durationSeconds = null
  }

  if (withOutlierDuration && tracks.length > 0) {
    tracks[tracks.length - 1].durationSeconds = 5 * 60 * 60
  }

  return tracks
}

// ── Key spellings ───────────────────────────────────────────────────────────

/**
 * Key strings a real library contains, including the nine spellings the parser
 * silently dropped until PR #177.
 *
 * Kept as a corpus rather than as assertions so any test that touches key
 * parsing can run against the same set — the regression that mattered was not
 * one bad string, it was a whole family of them arriving from one DJ's
 * collection at once.
 */
export const KEY_SPELLINGS: Array<{ raw: string; note: string }> = [
  { raw: "8A", note: "Camelot, canonical" },
  { raw: "8 A", note: "Camelot with a space — dropped before #177" },
  { raw: "1m", note: "Open Key, lowercase mode" },
  { raw: "1 m", note: "Open Key with a space — dropped before #177" },
  { raw: "Amin", note: "musical, suffix with no space — dropped before #177" },
  { raw: "Cmaj", note: "musical, suffix with no space" },
  { raw: "AB MINOR", note: "uncontrolled case — dropped before #177" },
  { raw: "bbm", note: "flat, lowercase — dropped before #177" },
  { raw: "f#M", note: "sharp, mixed case — dropped before #177" },
  { raw: "F#m", note: "musical, canonical" },
  { raw: "", note: "empty — must not be read as a key" },
  { raw: "not a key", note: "junk in the field — must not be read as a key" },
]

// ── Format serialisers ──────────────────────────────────────────────────────

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * A Traktor NML carrying the fields our writer used to destroy.
 *
 * This is the most valuable fixture in the file. The 2026-09-07 P0 was an export
 * that rebuilt each `<ENTRY>` from the eleven fields we model, silently wiping
 * `<CUE_V2>` hotcues, saved loops, `AUDIO_ID`, `INFO@FLAGS`, loudness, album and
 * playcounts from the DJ's own library — data we cannot restore.
 *
 * Anything asserting "the export preserves what came in" needs an input that
 * actually has something to preserve, and this is it.
 */
export function asTraktorNml(tracks: SyntheticTrack[]): string {
  const entries = tracks
    .map((track, index) => {
      const location = `/:Users/:dj/:Music/:${escapeXml(track.name)}.aiff`

      return `  <ENTRY MODIFIED_DATE="2026/8/1" TITLE="${escapeXml(track.name)}" ARTIST="${escapeXml(track.artist)}">
    <LOCATION DIR="/:Users/:dj/:Music/:" FILE="${escapeXml(track.name)}.aiff" VOLUME="Macintosh HD" VOLUMEID="abc123"/>
    <ALBUM TRACK="${index + 1}" TITLE="Synthetic Album ${index + 1}"/>
    <INFO BITRATE="1411000" GENRE="Techno" LABEL="Test Label" PLAYCOUNT="${index}" PLAYTIME="${track.durationSeconds ?? 300}" IMPORT_DATE="2026/7/14" FLAGS="14" FILESIZE="42000" COMMENT="Energy ${track.energy ?? 5}"/>
    <TEMPO BPM="${track.bpm ?? 0}" BPM_QUALITY="100"/>
    <LOUDNESS PEAK_DB="0.4" PERCEIVED_DB="-0.4" ANALYZED_DB="-8.2"/>
    <MUSICAL_KEY VALUE="${index % 24}"/>
    <AUDIO_ID AUTHENTIC="true">fingerprint-${index}</AUDIO_ID>
    <CUE_V2 NAME="Intro" DISPL_ORDER="0" TYPE="0" START="0" LEN="0" REPEATS="-1" HOTCUE="0"/>
    <CUE_V2 NAME="Drop" DISPL_ORDER="0" TYPE="0" START="64000" LEN="0" REPEATS="-1" HOTCUE="1"/>
    <CUE_V2 NAME="Loop 8" DISPL_ORDER="0" TYPE="4" START="128000" LEN="16000" REPEATS="-1" HOTCUE="2"/>
    <!-- location referenced: ${location} -->
  </ENTRY>`
    })
    .join("\n")

  const references = tracks
    .map(
      (track) =>
        `        <ENTRY><PRIMARYKEY TYPE="TRACK" KEY="Macintosh HD/:Users/:dj/:Music/:${escapeXml(track.name)}.aiff"/></ENTRY>`
    )
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<NML VERSION="19">
  <HEAD COMPANY="www.native-instruments.com" PROGRAM="Traktor"/>
  <COLLECTION ENTRIES="${tracks.length}">
${entries}
  </COLLECTION>
  <PLAYLISTS>
    <NODE TYPE="FOLDER" NAME="$ROOT">
      <SUBNODES COUNT="1">
        <NODE TYPE="PLAYLIST" NAME="Synthetic Set">
          <PLAYLIST ENTRIES="${tracks.length}" TYPE="LIST" UUID="synthetic">
${references}
          </PLAYLIST>
        </NODE>
      </SUBNODES>
    </NODE>
  </PLAYLISTS>
</NML>`
}

/** A Rekordbox XML with the memory cues our writer has to hand back untouched. */
export function asRekordboxXml(tracks: SyntheticTrack[]): string {
  const entries = tracks
    .map((track, index) => {
      const attrs = [
        `TrackID="${index + 1}"`,
        `Name="${escapeXml(track.name)}"`,
        `Artist="${escapeXml(track.artist)}"`,
        track.bpm === null ? "" : `AverageBpm="${track.bpm.toFixed(2)}"`,
        track.musicalKey === null ? "" : `Tonality="${escapeXml(track.musicalKey)}"`,
        track.durationSeconds === null ? "" : `TotalTime="${track.durationSeconds}"`,
        `Rating="204"`,
        `Colour="0xFF007F"`,
        `PlayCount="${index}"`,
        `Location="file://localhost/Users/dj/Music/${encodeURIComponent(track.name)}.aiff"`,
      ]
        .filter(Boolean)
        .join(" ")

      return `    <TRACK ${attrs}>
      <POSITION_MARK Name="Intro" Type="0" Start="0.000" Num="0"/>
      <POSITION_MARK Name="Drop" Type="0" Start="64.000" Num="1"/>
    </TRACK>`
    })
    .join("\n")

  const references = tracks
    .map((_, index) => `        <TRACK Key="${index + 1}"/>`)
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="rekordbox" Version="6.7.7" Company="AlphaTheta"/>
  <COLLECTION Entries="${tracks.length}">
${entries}
  </COLLECTION>
  <PLAYLISTS>
    <NODE Type="0" Name="ROOT" Count="1">
      <NODE Name="Synthetic Set" Type="1" KeyType="0" Entries="${tracks.length}">
${references}
      </NODE>
    </NODE>
  </PLAYLISTS>
</DJ_PLAYLISTS>`
}

/** M3U8 — path and duration and nothing else, which is the point of it. */
export function asM3u8(tracks: SyntheticTrack[]): string {
  const lines = tracks.flatMap((track) => [
    `#EXTINF:${track.durationSeconds ?? -1},${track.artist} - ${track.name}`,
    `/Users/dj/Music/${track.name}.aiff`,
  ])

  return ["#EXTM3U", ...lines].join("\n")
}

/**
 * CSV with a semicolon delimiter and accented headers.
 *
 * Both are deliberate: a spreadsheet saved in a Spanish or German locale uses
 * semicolons, and "Canción" is what the header says there. An earlier header
 * resolver folded accents *after* stripping non-alphanumerics, so "Canción"
 * became "cancin" and a Spanish export failed silently while an English one
 * worked.
 */
export function asCsv(tracks: SyntheticTrack[], { delimiter = ";" } = {}): string {
  const header = ["Artista", "Canción", "BPM", "Tonalidad", "Duración"].join(delimiter)

  const rows = tracks.map((track) =>
    [
      track.artist,
      // A quoted field containing the delimiter, because a real title does.
      `"${track.name}; extended"`,
      track.bpm ?? "",
      track.musicalKey ?? "",
      track.durationSeconds ?? "",
    ].join(delimiter)
  )

  return [header, ...rows].join("\n")
}

/** The plain paste format, which is how most people start. */
export function asPastedText(tracks: SyntheticTrack[]): string {
  return tracks
    .map((track, index) => `${index + 1}. ${track.artist} - ${track.name}`)
    .join("\n")
}
