import { describe, expect, it } from "vitest"

import {
  availableExportFormats,
  defaultExportFormat,
  exportFilename,
  serializePlaylist,
  type ExportPlaylist,
  type ExportTrack,
} from "@/lib/playlists/export"
import { parseRekordbox } from "@/lib/playlists/parse-rekordbox"
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
  it("defaults to the import format and offers csv/txt fallbacks", () => {
    expect(defaultExportFormat("rekordbox")).toBe("rekordbox")
    expect(defaultExportFormat("traktor")).toBe("traktor")
    expect(defaultExportFormat(null)).toBe("csv")

    expect(availableExportFormats("rekordbox")).toEqual([
      "rekordbox",
      "csv",
      "txt",
    ])
    expect(availableExportFormats(null)).toEqual(["csv", "txt"])
  })

  it("builds a slugified filename per format", () => {
    expect(exportFilename("rekordbox", "Warehouse Set")).toBe("warehouse-set.xml")
    expect(exportFilename("traktor", "Warehouse Set")).toBe("warehouse-set.nml")
    expect(exportFilename("csv", "Late — Night!!")).toBe("late-night.csv")
    expect(exportFilename("txt", "   ")).toBe("playlist.txt")
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
  it("emits one 'Artist - Title' line per track", () => {
    const txt = serializePlaylist("txt", samplePlaylist())
    expect(txt).toBe("Mira Phase - Peak Freq\nNova Relay - Intro Bloom\n")
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
