import { describe, expect, it } from "vitest"

import {
  availableExportFormats,
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
    expect(defaultExportFormat(null)).toBe("csv")

    expect(availableExportFormats("rekordbox")).toEqual([
      "rekordbox",
      "csv",
      "txt",
      "m3u8",
    ])
    expect(availableExportFormats("text")).toEqual(["txt", "csv", "m3u8"])
    expect(availableExportFormats("m3u8")).toEqual(["m3u8", "csv", "txt"])
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
  it("preserves order, metadata, energy, key, genre, duration, and location", () => {
    const xml = serializePlaylist("rekordbox", samplePlaylist())
    const parsed = parseRekordbox(xml)

    expect(parsed.source).toBe("rekordbox")
    expect(parsed.playlistName).toBe("Warehouse Set")
    expect(parsed.tracks.map((t) => t.name)).toEqual(["Peak Freq", "Intro Bloom"])
    expect(parsed.tracks[0]).toMatchObject({
      artist: "Mira Phase",
      bpm: 130,
      energy: 8,
      key: "9A",
      genre: "Hard Techno",
      durationSeconds: 317,
      sourceUri: "file://localhost/Music/peak.mp3",
    })
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
      energy: 8,
      key: "9A",
      genre: "Hard Techno",
      durationSeconds: 317,
      sourceUri: "Macintosh HD/:Users/:dj/:Music/:peak.mp3",
    })
  })
})
