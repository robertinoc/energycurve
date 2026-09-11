import { describe, expect, it } from "vitest"

import { parseM3u8 } from "@/lib/playlists/parse-m3u8"
import { parseRekordbox } from "@/lib/playlists/parse-rekordbox"
import { parseTraktor } from "@/lib/playlists/parse-traktor"
import { parseTracklist } from "@/lib/playlists/parse-tracklist"
import { toCamelot } from "@/lib/music/camelot"
import {
  asM3u8,
  asPastedText,
  asRekordboxXml,
  asTraktorNml,
  KEY_SPELLINGS,
  syntheticPlaylist,
} from "./fixtures/playlists"

/**
 * The corpus has to be exercised or it is decoration.
 *
 * A fixture nobody parses drifts from the format it claims to represent and
 * stops covering anything, quietly. These tests do two jobs: they prove each
 * generator emits something the real parser accepts, and they pin the gaps that
 * make the corpus worth having — the missing tags, the outlier, the cue points
 * an export must hand back.
 */

describe("every format the product reads, round-tripped through its own parser", () => {
  const tracks = syntheticPlaylist({ length: 10 })

  it("Traktor NML", () => {
    const parsed = parseTraktor(asTraktorNml(tracks))

    expect(parsed.tracks).toHaveLength(10)
    expect(parsed.tracks[0].name).toBe(tracks[0].name)
    expect(parsed.tracks[0].artist).toBe(tracks[0].artist)
  })

  it("Rekordbox XML", () => {
    const parsed = parseRekordbox(asRekordboxXml(tracks))

    expect(parsed.tracks).toHaveLength(10)
    expect(parsed.tracks[0].bpm).toBe(tracks[0].bpm)
  })

  it("M3U8", () => {
    const parsed = parseM3u8(asM3u8(tracks))

    expect(parsed.tracks).toHaveLength(10)
  })

  it("pasted text, read as artist-first", () => {
    // The format is a parameter, not a guess: the same line is a valid
    // "Artist - Track" and a valid "Track - Artist", and the product asks
    // rather than inferring. The fixture writes artist first.
    const parsed = parseTracklist(asPastedText(tracks), "artist-track")

    expect(parsed.tracks).toHaveLength(10)
    expect(parsed.tracks[0].artist).toBe(tracks[0].artist)
    expect(parsed.tracks[0].name).toBe(tracks[0].name)
  })

  it("and read the other way round, which is the same text meaning something else", () => {
    const parsed = parseTracklist(asPastedText(tracks), "track-artist")

    expect(parsed.tracks[0].artist).toBe(tracks[0].name)
    expect(parsed.tracks[0].name).toBe(tracks[0].artist)
  })
})

describe("the NML carries what an export must not destroy", () => {
  // The 2026-09-07 P0 rebuilt each entry from the eleven fields we model and
  // wiped the rest. A fixture that has nothing to preserve cannot catch it
  // coming back, so this pins that the fixture is still worth using.
  const nml = asTraktorNml(syntheticPlaylist({ length: 3 }))

  it("has hotcues and a saved loop", () => {
    expect(nml.match(/<CUE_V2/g)).toHaveLength(9) // three per track
    expect(nml).toContain('TYPE="4"') // the loop
  })

  it("has the analysis fingerprint and the import flags", () => {
    expect(nml).toContain("<AUDIO_ID")
    expect(nml).toContain('FLAGS="14"')
    expect(nml).toContain("IMPORT_DATE")
  })

  it("has album, label, playcount and loudness", () => {
    expect(nml).toContain("<ALBUM")
    expect(nml).toContain('LABEL="Test Label"')
    expect(nml).toContain("PLAYCOUNT=")
    expect(nml).toContain("<LOUDNESS")
  })

  it("and a volume id, which a naive writer drops", () => {
    expect(nml).toContain('VOLUMEID="abc123"')
  })
})

describe("the gaps are really there", () => {
  it("omits BPM where asked", () => {
    const tracks = syntheticPlaylist({ length: 10, missingBpm: 3 })

    expect(tracks.filter((track) => track.bpm === null)).toHaveLength(3)
    // And the rest keep theirs — a generator that nulled everything would make
    // every "degrades per track" test pass for the wrong reason.
    expect(tracks.filter((track) => track.bpm !== null)).toHaveLength(7)
  })

  it("omits key and duration independently", () => {
    const tracks = syntheticPlaylist({ length: 10, missingKey: 2, missingDuration: 4 })

    expect(tracks.filter((track) => track.musicalKey === null)).toHaveLength(2)
    expect(tracks.filter((track) => track.durationSeconds === null)).toHaveLength(4)
  })

  it("can carry the outlier that poisons a median", () => {
    const tracks = syntheticPlaylist({ length: 5, withOutlierDuration: true })
    const longest = Math.max(
      ...tracks.map((track) => track.durationSeconds ?? 0)
    )

    // A whole set exported as one file. People really have these.
    expect(longest).toBeGreaterThan(4 * 60 * 60)
  })

  it("names every track distinctly past the first cycle", () => {
    // A duplicate name would let a matching bug pass unnoticed.
    const tracks = syntheticPlaylist({ length: 25 })
    const names = new Set(tracks.map((track) => track.name))

    expect(names.size).toBe(25)
  })
})

describe("the key corpus covers what one DJ's library actually contained", () => {
  it("includes the spellings the parser dropped before #177", () => {
    const dropped = KEY_SPELLINGS.filter((entry) => entry.note.includes("#177"))

    // Six of the nine; the corpus keeps the note so the reason survives.
    expect(dropped.length).toBeGreaterThanOrEqual(5)
  })

  it("every non-junk spelling resolves to a Camelot key", () => {
    const real = KEY_SPELLINGS.filter(
      (entry) => entry.raw !== "" && !entry.note.includes("junk")
    )

    for (const entry of real) {
      expect(toCamelot(entry.raw), `${entry.raw} (${entry.note})`).not.toBeNull()
    }
  })

  it("and the junk resolves to nothing, so the corpus tests both directions", () => {
    for (const entry of KEY_SPELLINGS.filter((item) => item.note.includes("junk"))) {
      expect(toCamelot(entry.raw)).toBeNull()
    }
  })
})
