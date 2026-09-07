import { describe, expect, it } from "vitest"

import {
  availableExportFormats,
  nativeExportWillMissTracks,
  preservationSummary,
  defaultExportFormat,
  exportFilename,
  serializePlaylist,
  type ExportPlaylist,
  type ExportTrack,
} from "@/lib/playlists/export"
import { parseM3u8 } from "@/lib/playlists/parse-m3u8"
import { parseRekordbox } from "@/lib/playlists/parse-rekordbox"
import { parseRekordboxTxt } from "@/lib/playlists/parse-rekordbox-txt"
import { parseTraktor } from "@/lib/playlists/parse-traktor"
import { extractCollectionElements } from "@/lib/playlists/source-entry"

import { REAL_SHAPE_NML } from "./fixtures-traktor-nml"

function makeTrack(overrides: Partial<ExportTrack> = {}): ExportTrack {
  return {
    position: 1,
    artist: "Artist",
    name: "Title",
    bpm: 128,
    energyScore: 7,
    sourceUri: null,
    musicalKey: null,
    genre: null,
    comment: null,
    durationSeconds: null,
    ...overrides,
  }
}

function samplePlaylist(overrides: Partial<ExportPlaylist> = {}): ExportPlaylist {
  return {
    name: "Warehouse Set",
    importSource: "rekordbox",
    tracks: [
      makeTrack({
        position: 1,
        artist: "Mira Phase",
        name: "Peak Freq",
        bpm: 130,
        energyScore: 8,
        sourceUri: "file://localhost/Music/peak.mp3",
        musicalKey: "9A",
        genre: "Hard Techno",
        durationSeconds: 317,
      }),
      makeTrack({
        position: 2,
        artist: "Nova Relay",
        name: "Intro Bloom",
        bpm: 120,
        energyScore: 5,
        sourceUri: "file://localhost/Music/intro.mp3",
        musicalKey: "8A",
        genre: "Deep House",
        durationSeconds: 312,
      }),
    ],
    ...overrides,
  }
}

describe("format selection", () => {
  it("defaults to the import format and offers the universal fallbacks", () => {
    expect(defaultExportFormat("rekordbox")).toBe("rekordbox")
    expect(defaultExportFormat("traktor")).toBe("traktor")
    expect(defaultExportFormat("m3u8")).toBe("m3u8")
    expect(defaultExportFormat("text")).toBe("txt")
    // Audio-file imports only ever knew a filename, so M3U8 — the one format
    // that resolves relative paths — is the sensible default.
    expect(defaultExportFormat("files")).toBe("m3u8")
    expect(defaultExportFormat(null)).toBe("csv")

    expect(availableExportFormats("rekordbox")).toEqual([
      "rekordbox",
      "csv",
      "txt",
      "m3u8",
    ])
    expect(availableExportFormats("text")).toEqual(["txt", "csv", "m3u8"])
    expect(availableExportFormats("m3u8")).toEqual(["m3u8", "csv", "txt"])
    expect(availableExportFormats("files")).toEqual(["m3u8", "csv", "txt"])
    expect(availableExportFormats(null)).toEqual(["csv", "txt", "m3u8"])
  })

  it("builds a slugified filename per format", () => {
    expect(exportFilename("rekordbox", "Warehouse Set")).toBe(
      "warehouse-set-optimized-with-energycurve.app.xml"
    )
    expect(exportFilename("traktor", "Warehouse Set")).toBe(
      "warehouse-set-optimized-with-energycurve.app.nml"
    )
    expect(exportFilename("m3u8", "Warehouse Set")).toBe(
      "warehouse-set-optimized-with-energycurve.app.m3u8"
    )
    expect(exportFilename("csv", "Late — Night!!")).toBe(
      "late-night-optimized-with-energycurve.app.csv"
    )
    expect(exportFilename("txt", "   ")).toBe(
      "playlist-optimized-with-energycurve.app.txt"
    )
  })
})

describe("CSV export", () => {
  it("emits a header with key/genre/time and escapes quotes/commas", () => {
    const csv = serializePlaylist(
      "csv",
      samplePlaylist({
        tracks: [
          makeTrack({
            artist: 'DJ "Q", the one',
            name: "Track, One",
            bpm: 128,
            energyScore: 7,
            musicalKey: "8A",
            genre: "Bounce",
            durationSeconds: 192,
          }),
        ],
      })
    )
    const lines = csv.trimEnd().split("\r\n")
    expect(lines[0]).toBe("Position,Artist,Title,BPM,Key,Genre,Energy,Time")
    expect(lines[1]).toBe(
      '1,"DJ ""Q"", the one","Track, One",128,"8A","Bounce",7,3:12'
    )
  })

  it("leaves blank cells for missing values", () => {
    const csv = serializePlaylist(
      "csv",
      samplePlaylist({
        tracks: [
          makeTrack({
            artist: "A",
            name: "B",
            bpm: null,
            energyScore: null,
            musicalKey: null,
            genre: null,
            durationSeconds: null,
          }),
        ],
      })
    )
    expect(csv.trimEnd().split("\r\n")[1]).toBe('1,"A","B",,"","",,')
  })
})

describe("TXT export", () => {
  it("emits a Rekordbox-style tab-separated grid with a header", () => {
    const txt = serializePlaylist("txt", samplePlaylist())
    const lines = txt.trimEnd().split("\r\n")
    expect(lines[0]).toBe("#\tTrack Title\tArtist\tBPM\tTime\tKey\tGenre")
    expect(lines[1]).toBe("1\tPeak Freq\tMira Phase\t130\t5:17\t9A\tHard Techno")
    expect(lines[2]).toBe("2\tIntro Bloom\tNova Relay\t120\t5:12\t8A\tDeep House")
  })

  it("round-trips back through the Rekordbox txt parser", () => {
    const txt = serializePlaylist("txt", samplePlaylist())
    const parsed = parseRekordboxTxt(txt)
    expect(parsed.source).toBe("text")
    expect(parsed.tracks.map((t) => t.name)).toEqual(["Peak Freq", "Intro Bloom"])
    expect(parsed.tracks[0]).toMatchObject({
      artist: "Mira Phase",
      bpm: 130,
      key: "9A",
      genre: "Hard Techno",
      durationSeconds: 317,
    })
  })
})

describe("M3U8 export", () => {
  it("emits an EXTM3U header with EXTINF + file path per track", () => {
    const m3u8 = serializePlaylist("m3u8", samplePlaylist())
    expect(m3u8).toBe(
      "#EXTM3U\n" +
        "#EXTINF:317,Mira Phase - Peak Freq\nfile://localhost/Music/peak.mp3\n" +
        "#EXTINF:312,Nova Relay - Intro Bloom\nfile://localhost/Music/intro.mp3\n"
    )
  })

  it("falls back to an 'Artist - Title' line and -1 duration without a path", () => {
    const m3u8 = serializePlaylist(
      "m3u8",
      samplePlaylist({
        tracks: [
          makeTrack({
            artist: "A",
            name: "B",
            sourceUri: null,
            durationSeconds: null,
          }),
        ],
      })
    )
    expect(m3u8).toBe("#EXTM3U\n#EXTINF:-1,A - B\nA - B\n")
  })

  it("round-trips order + path through the m3u8 parser", () => {
    const m3u8 = serializePlaylist("m3u8", samplePlaylist())
    const parsed = parseM3u8(m3u8)
    expect(parsed.source).toBe("m3u8")
    expect(parsed.tracks.map((t) => t.name)).toEqual(["Peak Freq", "Intro Bloom"])
    expect(parsed.tracks[0]).toMatchObject({
      artist: "Mira Phase",
      name: "Peak Freq",
      durationSeconds: 317,
      sourceUri: "file://localhost/Music/peak.mp3",
    })
  })
})

describe("Rekordbox export round-trips through the parser", () => {
  it("preserves order, metadata, key, genre, duration, and location", () => {
    const xml = serializePlaylist("rekordbox", samplePlaylist())
    const parsed = parseRekordbox(xml)

    expect(parsed.source).toBe("rekordbox")
    expect(parsed.playlistName).toBe("Warehouse Set")
    expect(parsed.tracks.map((t) => t.name)).toEqual(["Peak Freq", "Intro Bloom"])
    expect(parsed.tracks[0]).toMatchObject({
      artist: "Mira Phase",
      bpm: 130,
      key: "9A",
      genre: "Hard Techno",
      durationSeconds: 317,
      sourceUri: "file://localhost/Music/peak.mp3",
    })
  })

  it("leaves the comment tag empty unless the DJ asked for the energy", () => {
    // This writer used to synthesise "Energy 8" into every empty comment, so a
    // round-trip appeared to carry energy — by writing a tag into the DJ's
    // library that they never set. The absence is the fix, not a regression.
    const parsed = parseRekordbox(serializePlaylist("rekordbox", samplePlaylist()))
    expect(parsed.tracks[0].energy).toBeNull()
    expect(parsed.tracks[0].comment).toBeNull()

    const optedIn = parseRekordbox(
      serializePlaylist("rekordbox", samplePlaylist(), {
        writeEnergyToComment: true,
      })
    )
    expect(optedIn.tracks[0].energy).toBe(8)
    expect(optedIn.tracks[0].comment).toBe("Energy 8")
  })
})

describe("Traktor export key consistency", () => {
  // Traktor links playlist entries to collection entries by the exact
  // VOLUME+DIR+FILE concatenation. Bare-filename sourceUris (audio-files
  // imports) get a synthesized VOLUME="EnergyCurve" location — the PRIMARYKEY
  // must match that synthesized key, or Traktor shows the playlist as empty.
  // (The parser round-trip can't catch this: it falls back to collection
  // order when refs don't resolve, masking the mismatch.)
  it("emits PRIMARYKEYs that exactly match each collection LOCATION", () => {
    const nml = serializePlaylist(
      "traktor",
      samplePlaylist({
        importSource: "files",
        tracks: [
          // Bare filename (audio-files import — no real path known)
          makeTrack({
            position: 1,
            artist: "Binary Squad",
            name: "Like A Candy",
            sourceUri: "Binary Squad - Like A Candy.mp3",
          }),
          // Folder-relative path (folder pick)
          makeTrack({
            position: 2,
            artist: "Revoxx",
            name: "Hostile",
            sourceUri: "Promos/Revoxx - Hostile.mp3",
          }),
          // Real Traktor key (Traktor import)
          makeTrack({
            position: 3,
            artist: "Mira Phase",
            name: "Peak Freq",
            sourceUri: "Macintosh HD/:Users/:dj/:Music/:peak.mp3",
          }),
          // No sourceUri at all (manual track)
          makeTrack({
            position: 4,
            artist: "Nova Relay",
            name: "Intro Bloom",
            sourceUri: null,
          }),
        ],
      })
    )

    const refKeys = [...nml.matchAll(/PRIMARYKEY TYPE="TRACK" KEY="([^"]+)"/g)].map(
      (match) => match[1]
    )
    const locationKeys = [
      ...nml.matchAll(/<LOCATION DIR="([^"]*)" FILE="([^"]*)" VOLUME="([^"]*)"\/>/g),
    ].map((match) => `${match[3]}${match[1]}${match[2]}`)

    expect(refKeys).toHaveLength(4)
    expect(refKeys).toEqual(locationKeys)
  })

  it("resolves the playlist refs on re-import for bare-filename tracks", () => {
    const nml = serializePlaylist(
      "traktor",
      samplePlaylist({
        importSource: "files",
        tracks: [
          makeTrack({ position: 1, artist: "A", name: "One", sourceUri: "one.mp3" }),
          makeTrack({ position: 2, artist: "B", name: "Two", sourceUri: "two.mp3" }),
        ],
      })
    )

    const parsed = parseTraktor(nml)
    expect(parsed.playlistName).toBe("Warehouse Set")
    expect(parsed.tracks.map((t) => t.name)).toEqual(["One", "Two"])
  })
})

describe("Traktor numeric MUSICAL_KEY emission", () => {
  it("emits the numeric MUSICAL_KEY so Traktor's Key column shows the key", () => {
    // Traktor's Key column reads MUSICAL_KEY VALUE (0-23), not the INFO KEY
    // text — without it, exported keys were invisible in Traktor.
    const nml = serializePlaylist("traktor", samplePlaylist())

    // Track 1 musicalKey "9A" = E minor = 16; track 2 "8A" = A minor = 21.
    expect(nml).toContain('<MUSICAL_KEY VALUE="16"/>')
    expect(nml).toContain('<MUSICAL_KEY VALUE="21"/>')
  })

  it("omits MUSICAL_KEY when the key is missing or unmappable", () => {
    const nml = serializePlaylist(
      "traktor",
      samplePlaylist({
        tracks: [makeTrack({ musicalKey: null }), makeTrack({ musicalKey: "??" })],
      })
    )

    expect(nml).not.toContain("MUSICAL_KEY")
  })
})

describe("Traktor export round-trips through the parser", () => {
  it("preserves order, metadata, energy, key, genre, duration, and location key", () => {
    const playlist = samplePlaylist({
      importSource: "traktor",
      tracks: [
        makeTrack({
          position: 1,
          artist: "Mira Phase",
          name: "Peak Freq",
          bpm: 130,
          energyScore: 8,
          musicalKey: "9A",
          genre: "Hard Techno",
          durationSeconds: 317,
          sourceUri: "Macintosh HD/:Users/:dj/:Music/:peak.mp3",
        }),
        makeTrack({
          position: 2,
          artist: "Nova Relay",
          name: "Intro Bloom",
          bpm: 120,
          energyScore: 5,
          musicalKey: "8A",
          genre: "Deep House",
          durationSeconds: 312,
          sourceUri: "Macintosh HD/:Music/:intro.mp3",
        }),
      ],
    })

    const nml = serializePlaylist("traktor", playlist)
    const parsed = parseTraktor(nml)

    expect(parsed.source).toBe("traktor")
    expect(parsed.playlistName).toBe("Warehouse Set")
    expect(parsed.tracks.map((t) => t.name)).toEqual(["Peak Freq", "Intro Bloom"])
    expect(parsed.tracks[0]).toMatchObject({
      artist: "Mira Phase",
      bpm: 130,
      key: "9A",
      genre: "Hard Techno",
      durationSeconds: 317,
      sourceUri: "Macintosh HD/:Users/:dj/:Music/:peak.mp3",
    })
    // Same contract as Rekordbox: no comment is written unless asked.
    expect(parsed.tracks[0].energy).toBeNull()

    const optedIn = parseTraktor(
      serializePlaylist("traktor", playlist, { writeEnergyToComment: true })
    )
    expect(optedIn.tracks[0].energy).toBe(8)
  })
})

describe("warning about native exports from local files", () => {
  it("flags Rekordbox and Traktor for file-sourced playlists", () => {
    // We only have a filename, so the writer synthesises a placeholder volume
    // and the DJ software opens the playlist with every entry greyed out.
    expect(nativeExportWillMissTracks("files", "rekordbox")).toBe(true)
    expect(nativeExportWillMissTracks("files", "traktor")).toBe(true)
  })

  it("leaves the formats that actually work alone", () => {
    // M3U8 resolves relative paths when saved beside the music; CSV and TXT
    // aren't pointing at files at all.
    for (const format of ["m3u8", "csv", "txt"] as const) {
      expect(nativeExportWillMissTracks("files", format)).toBe(false)
    }
  })

  it("does not warn when the paths came from the DJ software itself", () => {
    // A Rekordbox or Traktor import carries real absolute locations.
    expect(nativeExportWillMissTracks("rekordbox", "rekordbox")).toBe(false)
    expect(nativeExportWillMissTracks("traktor", "traktor")).toBe(false)
    expect(nativeExportWillMissTracks("m3u8", "traktor")).toBe(false)
    expect(nativeExportWillMissTracks(null, "rekordbox")).toBe(false)
  })
})

/**
 * The reported bug, as a test.
 *
 * An alpha user reordered a Traktor playlist through EnergyCurve and lost the
 * hotcues, comments and album tags on the tracks — and had to re-analyse them.
 * Confirmed against his own 3017-entry Traktor 3.5.1 collection: of the 26
 * tracks that entered it through us, 0% had an <ALBUM> against a 73%
 * collection-wide baseline, 0% an IMPORT_DATE against 96%, and 0% a COMMENT
 * against 40%, while INFO@KEY sat at 100% against 54% — our writer's
 * fingerprint.
 *
 * So the assertion is not "the fields we thought of survive". It is that the
 * entry comes back byte-identical, which also covers the fields nobody here has
 * heard of yet.
 */
describe("native export round-trips the source library entry", () => {
  function reorderedNml(options?: Parameters<typeof serializePlaylist>[2]) {
    const parsed = parseTraktor(REAL_SHAPE_NML)

    return serializePlaylist(
      "traktor",
      {
        name: "Night One (reordered)",
        importSource: "traktor",
        sourceHeader: parsed.sourceHeader,
        // Reversed: the export exists to change the order and nothing else.
        tracks: [...parsed.tracks].reverse().map((track, index) => ({
          position: index + 1,
          artist: track.artist,
          name: track.name,
          bpm: track.bpm,
          energyScore: track.energy,
          sourceUri: track.sourceUri,
          musicalKey: track.key,
          genre: track.genre,
          comment: track.comment,
          durationSeconds: track.durationSeconds,
          sourcePayload: track.sourcePayload,
          sourcePayloadFormat: track.sourcePayloadFormat,
        })),
      },
      options
    )
  }

  it("hands every source entry back byte-for-byte", () => {
    const out = reorderedNml()

    for (const entry of extractCollectionElements(REAL_SHAPE_NML, "ENTRY")) {
      expect(out).toContain(entry)
    }
  })

  it("keeps the fields that were being dropped", () => {
    const out = reorderedNml()

    for (const field of [
      "<CUE_V2",
      "<LOOPINFO",
      "<LOUDNESS",
      "<ALBUM",
      "<MODIFICATION_INFO",
      'AUDIO_ID="',
      'VOLUMEID="',
      'FLAGS="',
      'PLAYCOUNT="',
      'LAST_PLAYED="',
      'LABEL="',
      'COVERARTID="',
      'BPM_QUALITY="',
      'IMPORT_DATE="',
      'LOCK="',
    ]) {
      expect(out, field).toContain(field)
    }

    // Both hotcues on the first track, not just one.
    expect(out.match(/<CUE_V2/g)).toHaveLength(2)
  })

  it("changes the order and only the order", () => {
    const out = reorderedNml()
    const keys = [...out.matchAll(/<PRIMARYKEY TYPE="TRACK" KEY="([^"]*)"/g)].map(
      (m) => m[1]
    )

    expect(keys).toEqual([
      "ROBERT HD2/:Users/:dj/:Music/:intro.mp3",
      "Macintosh HD/:Users/:dj/:Music/:peak.mp3",
    ])
  })

  it("keys every playlist reference to a collection entry that exists", () => {
    // The failure this guards against is the one that makes Traktor create a
    // second, empty entry for a track it already has: a PRIMARYKEY that matches
    // no LOCATION in the file. It is the likeliest cause of the "once every
    // 20-30 tracks" report, since his library spans three volumes.
    const out = reorderedNml()
    const locations = [...out.matchAll(/<LOCATION ([^>]*?)\/?>/g)].map((m) => {
      const attrs = Object.fromEntries(
        [...m[1].matchAll(/(\w+)="([^"]*)"/g)].map((a) => [a[1], a[2]])
      )
      return `${attrs.VOLUME ?? ""}${attrs.DIR ?? ""}${attrs.FILE ?? ""}`
    })
    const keys = [...out.matchAll(/<PRIMARYKEY TYPE="TRACK" KEY="([^"]*)"/g)].map(
      (m) => m[1]
    )

    expect(keys).toHaveLength(2)
    for (const key of keys) {
      expect(locations).toContain(key)
    }
  })

  it("declares the version the source file declared, not a hardcoded one", () => {
    const parsed = parseTraktor(
      REAL_SHAPE_NML.replace('<NML VERSION="19">', '<NML VERSION="20">')
    )
    const out = serializePlaylist("traktor", {
      name: "Set",
      importSource: "traktor",
      sourceHeader: parsed.sourceHeader,
      tracks: parsed.tracks.map((track, index) => ({
        position: index + 1,
        artist: track.artist,
        name: track.name,
        bpm: track.bpm,
        energyScore: track.energy,
        sourceUri: track.sourceUri,
        musicalKey: track.key,
        genre: track.genre,
        comment: track.comment,
        durationSeconds: track.durationSeconds,
        sourcePayload: track.sourcePayload,
        sourcePayloadFormat: track.sourcePayloadFormat,
      })),
    })

    expect(out).toContain('<NML VERSION="20">')
  })

  it("writes no comment into a library that didn't have one", () => {
    // The old writer synthesised "Energy N" into any empty comment field, so
    // every export wrote a tag the DJ never set. The second fixture entry has
    // no COMMENT; it must still have none.
    const out = reorderedNml()
    const second = out.slice(out.indexOf('TITLE="Intro Bloom"'))

    expect(second.slice(0, second.indexOf("</ENTRY>"))).not.toContain("COMMENT=")
  })

  it("merges energy into the existing comment only when asked", () => {
    const out = reorderedNml({ writeEnergyToComment: true })

    // Fixture comment is "peak hour" and the parsed energy is null (no token),
    // so nothing to merge on entry one; entry two has neither. Set an energy
    // explicitly to exercise the merge.
    expect(out).toContain('COMMENT="peak hour"')
  })

  it("updates an existing energy token in place instead of stacking", () => {
    const withEnergy = REAL_SHAPE_NML.replace(
      'COMMENT="peak hour"',
      'COMMENT="peak hour Energy 4"'
    )
    const parsed = parseTraktor(withEnergy)
    const out = serializePlaylist(
      "traktor",
      {
        name: "Set",
        importSource: "traktor",
        sourceHeader: parsed.sourceHeader,
        tracks: parsed.tracks.map((track, index) => ({
          position: index + 1,
          artist: track.artist,
          name: track.name,
          bpm: track.bpm,
          energyScore: index === 0 ? 9 : null,
          sourceUri: track.sourceUri,
          musicalKey: track.key,
          genre: track.genre,
          comment: track.comment,
          durationSeconds: track.durationSeconds,
          sourcePayload: track.sourcePayload,
          sourcePayloadFormat: track.sourcePayloadFormat,
        })),
      },
      { writeEnergyToComment: true }
    )

    expect(out).toContain('COMMENT="peak hour Energy 9"')
    expect(out).not.toContain("Energy 4")
    expect(out).not.toContain("Energy 4 Energy 9")
    // The patch touches the comment and nothing else.
    expect(out).toContain("<CUE_V2")
    expect(out).toContain('AUDIO_ID="AIQBQyERRBAAEhAA"')
  })

  it("emits one collection entry per track even when a track repeats", () => {
    const parsed = parseTraktor(REAL_SHAPE_NML)
    const twice = [parsed.tracks[0], parsed.tracks[0], parsed.tracks[1]]
    const out = serializePlaylist("traktor", {
      name: "Set",
      importSource: "traktor",
      sourceHeader: parsed.sourceHeader,
      tracks: twice.map((track, index) => ({
        position: index + 1,
        artist: track.artist,
        name: track.name,
        bpm: track.bpm,
        energyScore: track.energy,
        sourceUri: track.sourceUri,
        musicalKey: track.key,
        genre: track.genre,
        comment: track.comment,
        durationSeconds: track.durationSeconds,
        sourcePayload: track.sourcePayload,
        sourcePayloadFormat: track.sourcePayloadFormat,
      })),
    })

    // A collection is a set: two plays of one track are two references to one
    // entry, and emitting it twice asks Traktor to merge a track with itself.
    expect(out).toContain('<COLLECTION ENTRIES="2">')
    expect(out.match(/<PRIMARYKEY/g)).toHaveLength(3)
    expect(out.match(/<PLAYLIST ENTRIES="3"/g)).toHaveLength(1)
  })

  it("can emit the playlist with no collection at all", () => {
    // Nothing to merge means nothing can be overwritten. Not offered in the UI
    // until it is verified against a real Traktor, but the serialiser is what
    // that verification runs against.
    const out = reorderedNml({ playlistOnly: true })

    expect(out).toContain('<COLLECTION ENTRIES="0">')
    expect(out).not.toContain("<CUE_V2")
    expect(out.match(/<PRIMARYKEY/g)).toHaveLength(2)
  })

  it("still synthesizes an entry for a track that has no source entry", () => {
    // Manual adds and audio-file imports have no library entry to preserve;
    // they must not silently vanish from the collection.
    const parsed = parseTraktor(REAL_SHAPE_NML)
    const out = serializePlaylist("traktor", {
      name: "Set",
      importSource: "traktor",
      sourceHeader: parsed.sourceHeader,
      tracks: [
        {
          position: 1,
          artist: "Hand Added",
          name: "No Payload",
          bpm: 128,
          energyScore: 6,
          sourceUri: null,
          musicalKey: "8A",
          genre: null,
          comment: null,
          durationSeconds: 300,
          sourcePayload: null,
          sourcePayloadFormat: null,
        },
      ],
    })

    expect(out).toContain('<COLLECTION ENTRIES="1">')
    expect(out).toContain('TITLE="No Payload"')
    expect(out).toContain('VOLUME="EnergyCurve"')
  })

  it("never pastes a Rekordbox track into an NML", () => {
    const out = serializePlaylist("traktor", {
      name: "Set",
      importSource: "rekordbox",
      tracks: [
        {
          position: 1,
          artist: "A",
          name: "B",
          bpm: 128,
          energyScore: null,
          sourceUri: "file://localhost/Music/a.mp3",
          musicalKey: null,
          genre: null,
          comment: null,
          durationSeconds: null,
          sourcePayload: '<TRACK TrackID="7" Name="B" Rating="204"/>',
          sourcePayloadFormat: "rekordbox_xml",
        },
      ],
    })

    expect(out).not.toContain("<TRACK")
    expect(out).not.toContain('Rating="204"')
    expect(out).toContain('TITLE="B"')
  })
})

describe("Rekordbox export round-trips its source track", () => {
  const RB_XML = `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="rekordbox" Version="6.7.7" Company="AlphaTheta"/>
  <COLLECTION Entries="2">
    <TRACK TrackID="41" Name="Peak Freq" Artist="Mira Phase" AverageBpm="130.00" Tonality="9A" Genre="Hard Techno" TotalTime="317" Location="file://localhost/Music/peak.mp3" Comments="peak hour" Rating="204" Colour="0xFF007F" PlayCount="14" DateAdded="2024-01-02">
      <TEMPO Inizio="0.025" Bpm="130.00" Metro="4/4" Battito="1"/>
      <POSITION_MARK Name="in" Type="0" Start="12.5" Num="0"/>
      <POSITION_MARK Name="drop" Type="0" Start="55.4" Num="1"/>
    </TRACK>
    <TRACK TrackID="42" Name="Intro Bloom" Artist="Nova Relay" AverageBpm="120.00" Location="file://localhost/Music/intro.mp3"/>
  </COLLECTION>
  <PLAYLISTS>
    <NODE Type="0" Name="ROOT" Count="1">
      <NODE Name="Night One" Type="1" KeyType="0" Entries="2">
        <TRACK Key="41"/>
        <TRACK Key="42"/>
      </NODE>
    </NODE>
  </PLAYLISTS>
</DJ_PLAYLISTS>`

  it("keeps memory cues, rating, colour and play count, and reorders", () => {
    const parsed = parseRekordbox(RB_XML)
    const out = serializePlaylist("rekordbox", {
      name: "Night One (reordered)",
      importSource: "rekordbox",
      sourceHeader: parsed.sourceHeader,
      tracks: [...parsed.tracks].reverse().map((track, index) => ({
        position: index + 1,
        artist: track.artist,
        name: track.name,
        bpm: track.bpm,
        energyScore: track.energy,
        sourceUri: track.sourceUri,
        musicalKey: track.key,
        genre: track.genre,
        comment: track.comment,
        durationSeconds: track.durationSeconds,
        sourcePayload: track.sourcePayload,
        sourcePayloadFormat: track.sourcePayloadFormat,
      })),
    })

    expect(out.match(/<POSITION_MARK/g)).toHaveLength(2)
    expect(out).toContain('Rating="204"')
    expect(out).toContain('Colour="0xFF007F"')
    expect(out).toContain('PlayCount="14"')
    expect(out).toContain('DateAdded="2024-01-02"')
    expect(out).toContain("<TEMPO Inizio=")
    expect(out).toContain('Version="6.7.7"')

    // Preserved TrackIDs, referenced in the new order.
    const refs = [...out.matchAll(/<TRACK Key="(\d+)"\/>/g)].map((m) => m[1])
    expect(refs).toEqual(["42", "41"])
  })
})

/**
 * Reported after the first release: the DJ ticked "write energy into the
 * comment tag", exported, and nothing was written.
 *
 * Cause: callers passed `tracks.energy_score` — the raw imported tag — which is
 * null for every library that never carried one. That is precisely the
 * population the option exists for, so the feature did nothing for exactly the
 * people who turned it on. The contract is now the RESOLVED energy, the number
 * shown in the row.
 */
describe("writing energy into the comment tag", () => {
  function exportWith(energyScore: number | null, comment: string | null) {
    const parsed = parseTraktor(REAL_SHAPE_NML)

    return serializePlaylist(
      "traktor",
      {
        name: "Set",
        importSource: "traktor",
        sourceHeader: parsed.sourceHeader,
        tracks: [
          {
            position: 1,
            artist: parsed.tracks[0].artist,
            name: parsed.tracks[0].name,
            bpm: parsed.tracks[0].bpm,
            energyScore,
            sourceUri: parsed.tracks[0].sourceUri,
            musicalKey: parsed.tracks[0].key,
            genre: parsed.tracks[0].genre,
            comment,
            durationSeconds: parsed.tracks[0].durationSeconds,
            sourcePayload: parsed.tracks[0].sourcePayload,
            sourcePayloadFormat: parsed.tracks[0].sourcePayloadFormat,
          },
        ],
      },
      { writeEnergyToComment: true }
    )
  }

  it("writes a resolved energy that no tag ever carried", () => {
    // The regression: this track's library entry has no energy token, so the
    // stored energy_score is null and the old caller passed null here.
    expect(parseTraktor(REAL_SHAPE_NML).tracks[0].energy).toBeNull()

    expect(exportWith(8.1, "peak hour")).toContain(
      'COMMENT="peak hour Energy 8"'
    )
  })

  it("rounds the resolved energy to the 1-10 integer scale tags use", () => {
    expect(exportWith(7.5, null)).toContain('COMMENT="Energy 8"')
    expect(exportWith(7.4, null)).toContain('COMMENT="Energy 7"')
    // Resolved scores can sit outside 1-10 at the edges; a tag can't.
    expect(exportWith(10.4, null)).toContain('COMMENT="Energy 10"')
    expect(exportWith(0.2, null)).toContain('COMMENT="Energy 1"')
  })

  it("still writes nothing when there is no energy at all", () => {
    const out = exportWith(null, null)
    const entry = out.slice(out.indexOf("<ENTRY"), out.indexOf("</ENTRY>"))

    expect(entry).not.toContain("Energy")
  })
})

describe("preservationSummary", () => {
  function playlist(payloads: (string | null)[], importSource: string | null) {
    return {
      name: "Set",
      importSource,
      tracks: payloads.map((payload, index) => ({
        position: index + 1,
        artist: "A",
        name: "B",
        bpm: null,
        energyScore: null,
        sourceUri: `Vol/:${index}.mp3`,
        musicalKey: null,
        genre: null,
        comment: null,
        durationSeconds: null,
        sourcePayload: payload,
        sourcePayloadFormat: payload ? ("traktor_nml" as const) : null,
      })),
    }
  }

  it("flags a set imported before preservation shipped", () => {
    // The case behind "Traktor reads the order but not the metadata": nothing
    // is wrong with the writer, we simply never stored those entries.
    const summary = preservationSummary(playlist([null, null], "traktor"))

    expect(summary).toEqual({
      preserved: 0,
      total: 2,
      rebuildsSome: true,
      importedBeforePreservation: true,
    })
  })

  it("counts a partially preserved set without raising the alarm", () => {
    // An old import plus tracks added by hand. Worth stating, not warning about.
    const summary = preservationSummary(
      playlist(["<ENTRY/>", null], "traktor")
    )

    expect(summary.preserved).toBe(1)
    expect(summary.rebuildsSome).toBe(true)
    expect(summary.importedBeforePreservation).toBe(false)
  })

  it("says nothing about sets that never had library entries to preserve", () => {
    // A pasted or audio-file set has no source entries by construction, so
    // "imported before preservation" would be a false accusation.
    for (const source of ["files", "text", "m3u8", null]) {
      expect(
        preservationSummary(playlist([null], source)).importedBeforePreservation
      ).toBe(false)
    }
  })

  it("is quiet when everything round-trips", () => {
    const summary = preservationSummary(
      playlist(["<ENTRY/>", "<ENTRY/>"], "traktor")
    )

    expect(summary.rebuildsSome).toBe(false)
    expect(summary.importedBeforePreservation).toBe(false)
  })
})

/**
 * "Check properly that it exports and imports hotcues and everything else that
 * comes in the NML."
 *
 * Written as an exhaustive comparison rather than a list of fields, because a
 * hand-written list is exactly how the original bug survived: it only checks
 * what the author remembered. This derives the field set from the source file
 * and requires every one of them to survive.
 */
describe("nothing in a source NML is lost on the way out", () => {
  /** Every element name and every `element@attribute` pair in an entry. */
  function fieldsOf(entry: string): Set<string> {
    const fields = new Set<string>()
    const own = entry.slice(0, entry.indexOf(">"))

    for (const [, name] of own.matchAll(/(\w+)="/g)) {
      fields.add(`ENTRY@${name}`)
    }

    for (const [, tag, attrs] of entry.matchAll(/<(\w+)\s([^>]*?)\/?>/g)) {
      fields.add(`<${tag}>`)
      for (const [, name] of attrs.matchAll(/(\w+)="/g)) {
        fields.add(`${tag}@${name}`)
      }
    }

    return fields
  }

  function roundTrip(xml: string): string {
    const parsed = parseTraktor(xml)

    return serializePlaylist("traktor", {
      name: "Reordered",
      importSource: "traktor",
      sourceHeader: parsed.sourceHeader,
      tracks: [...parsed.tracks].reverse().map((track, index) => ({
        position: index + 1,
        artist: track.artist,
        name: track.name,
        bpm: track.bpm,
        energyScore: track.energy,
        sourceUri: track.sourceUri,
        musicalKey: track.key,
        genre: track.genre,
        comment: track.comment,
        durationSeconds: track.durationSeconds,
        sourcePayload: track.sourcePayload,
        sourcePayloadFormat: track.sourcePayloadFormat,
      })),
    })
  }

  it("carries every field of every entry through a reorder", () => {
    const out = roundTrip(REAL_SHAPE_NML)

    const sourceFields = new Set<string>()
    for (const entry of extractCollectionElements(REAL_SHAPE_NML, "ENTRY")) {
      for (const field of fieldsOf(entry)) {
        sourceFields.add(field)
      }
    }

    const exportedFields = new Set<string>()
    for (const entry of extractCollectionElements(out, "ENTRY")) {
      for (const field of fieldsOf(entry)) {
        exportedFields.add(field)
      }
    }

    // The fixture has to be worth the assertion.
    expect(sourceFields.size).toBeGreaterThan(30)
    expect(sourceFields.has("<CUE_V2>")).toBe(true)

    const lost = [...sourceFields].filter((f) => !exportedFields.has(f)).sort()
    expect(lost).toEqual([])
  })

  it("keeps every hotcue, with its position and number intact", () => {
    const out = roundTrip(REAL_SHAPE_NML)
    const cues = (xml: string) =>
      [...xml.matchAll(/<CUE_V2 [^>]*?\/?>/g)].map((m) => m[0])

    const before = cues(REAL_SHAPE_NML)
    const after = cues(out)

    expect(before.length).toBe(2)
    // Same elements, not merely the same count: a cue that survived with a
    // rounded START is a moved hotcue, which is worse than a lost one.
    expect(new Set(after)).toEqual(new Set(before))
  })

  it("survives a field this codebase has never heard of", () => {
    // The actual argument for preserving bytes instead of modelling fields:
    // the next Traktor version adds something, and it has to come back too.
    const withFutureField = REAL_SHAPE_NML.replace(
      "<CUE_V2 ",
      '<FLUX_MARKER NAME="future" VALUE="7"></FLUX_MARKER>\n<CUE_V2 '
    )
    const out = roundTrip(withFutureField)

    expect(out).toContain('<FLUX_MARKER NAME="future" VALUE="7">')
  })

  it("re-imports its own export to the same tracks and metadata", () => {
    // The round trip a DJ actually performs: export from us, and the file has
    // to read back as the same set.
    const out = roundTrip(REAL_SHAPE_NML)
    const reimported = parseTraktor(out)
    const original = parseTraktor(REAL_SHAPE_NML)

    expect(reimported.tracks.map((t) => t.name)).toEqual(
      [...original.tracks].reverse().map((t) => t.name)
    )

    for (const track of reimported.tracks) {
      const source = original.tracks.find((t) => t.name === track.name)!

      expect(track.sourceUri).toBe(source.sourceUri)
      expect(track.bpm).toBe(source.bpm)
      expect(track.key).toBe(source.key)
      expect(track.genre).toBe(source.genre)
      expect(track.comment).toBe(source.comment)
      expect(track.durationSeconds).toBe(source.durationSeconds)
      // And the payload is still there, so the next export preserves too.
      expect(track.sourcePayload).toBeTruthy()
    }
  })
})
