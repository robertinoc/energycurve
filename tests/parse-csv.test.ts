import { describe, expect, it } from "vitest"

import { serializePlaylist, type ExportPlaylist } from "@/lib/playlists/export"
import { isCsvPlaylist, parseCsv } from "@/lib/playlists/parse-csv"
import { parseImport } from "@/lib/playlists/parse-import"

/**
 * CSV import, asked for by an alpha user: "he descargado en txt y csv y la
 * verdad es que podríamos usar ese método para subir tracklist, a mi lexicon me
 * da la opción de crear ese csv, estableced una base".
 *
 * The base is our own CSV export's header, which makes round-tripping it the
 * acceptance test — if we can't read what we write, no third-party tool has a
 * chance.
 */

const OURS = `Position,Artist,Title,BPM,Key,Genre,Energy,Time,Location\r
1,"Mira Phase","Peak Freq",130,"9A","Hard Techno",8,5:17,"Macintosh HD/:Music/:peak.mp3"\r
2,"Nova Relay","Intro Bloom",120,"8A","Deep House",5,5:12,"Macintosh HD/:Music/:intro.mp3"\r
`

describe("round-tripping our own CSV export", () => {
  const playlist: ExportPlaylist = {
    name: "Warehouse Set",
    importSource: "csv",
    tracks: [
      {
        position: 1,
        artist: 'DJ "Q", the one',
        name: "Track, One",
        bpm: 128.5,
        energyScore: 7,
        sourceUri: "Macintosh HD/:Music/:one.mp3",
        musicalKey: "8A",
        genre: "Bounce",
        comment: null,
        durationSeconds: 192,
      },
      {
        position: 2,
        artist: "Nova Relay",
        name: "Two",
        bpm: null,
        energyScore: null,
        sourceUri: null,
        musicalKey: null,
        genre: null,
        comment: null,
        durationSeconds: null,
      },
    ],
  }

  it("reads back everything it wrote, quoting and all", () => {
    const parsed = parseCsv(serializePlaylist("csv", playlist))

    expect(parsed.source).toBe("csv")
    expect(parsed.tracks).toHaveLength(2)
    expect(parsed.tracks[0]).toMatchObject({
      // A quoted field carrying both a comma and an escaped quote.
      artist: 'DJ "Q", the one',
      name: "Track, One",
      bpm: 128.5,
      key: "8A",
      genre: "Bounce",
      energy: 7,
      durationSeconds: 192,
      sourceUri: "Macintosh HD/:Music/:one.mp3",
    })
  })

  it("keeps absent values absent rather than inventing them", () => {
    const parsed = parseCsv(serializePlaylist("csv", playlist))

    expect(parsed.tracks[1]).toMatchObject({
      artist: "Nova Relay",
      name: "Two",
      bpm: null,
      key: null,
      genre: null,
      energy: null,
      durationSeconds: null,
      sourceUri: null,
    })
  })

  it("carries the file path, which is why Location is in the export at all", () => {
    // Without it a CSV round-trips the order and the metadata but can never
    // produce a native export that relinks to the library.
    const csv = serializePlaylist("csv", playlist)

    expect(csv.split("\r\n")[0]).toContain("Location")
    expect(parseCsv(csv).tracks[0].sourceUri).toBe(
      "Macintosh HD/:Music/:one.mp3"
    )
  })
})

describe("parseCsv", () => {
  it("resolves columns by header name, in any order", () => {
    const parsed = parseCsv(
      "Genre,Title,Key,Artist,BPM\nTechno,Peak,9A,Mira,130\n"
    )

    expect(parsed.tracks[0]).toMatchObject({
      artist: "Mira",
      name: "Peak",
      bpm: 130,
      key: "9A",
      genre: "Techno",
    })
  })

  it("reads a localized header without the DJ renaming anything", () => {
    // A Spanish install exporting "Artista,Canción,Duración" should just work.
    const parsed = parseCsv(
      "Artista,Canción,BPM,Tonalidad,Género,Duración,Ruta\n" +
        "Mira,Peak,130,9A,Techno,5:17,/Music/peak.mp3\n"
    )

    expect(parsed.tracks[0]).toMatchObject({
      artist: "Mira",
      name: "Peak",
      bpm: 130,
      key: "9A",
      genre: "Techno",
      durationSeconds: 317,
      sourceUri: "/Music/peak.mp3",
    })
  })

  it("reads a semicolon file, which is what a European spreadsheet saves", () => {
    const parsed = parseCsv("Artist;Title;BPM\nMira;Peak;130\n")

    expect(parsed.tracks[0]).toMatchObject({ artist: "Mira", name: "Peak", bpm: 130 })
  })

  it("keeps a newline that lives inside a quoted field", () => {
    // Shearing the row in half here would silently drop a track.
    const parsed = parseCsv(
      'Artist,Title,Comment\nMira,Peak,"line one\nline two"\nNova,Bloom,ok\n'
    )

    expect(parsed.tracks).toHaveLength(2)
    expect(parsed.tracks[0].comment).toBe("line one\nline two")
    expect(parsed.tracks[1].name).toBe("Bloom")
  })

  it("reads a bare number in an Energy column, and a token in a comment", () => {
    expect(
      parseCsv("Title,Energy\nPeak,8\n").tracks[0].energy
    ).toBe(8)
    expect(
      parseCsv("Title,Energy\nPeak,Energy 8\n").tracks[0].energy
    ).toBe(8)
    expect(
      parseCsv("Title,Comment\nPeak,8A - Energy 6\n").tracks[0].energy
    ).toBe(6)
    // A bare number in a COMMENT is a comment, same rule as the tag readers.
    expect(
      parseCsv("Title,Comment\nPeak,7\n").tracks[0].energy
    ).toBeNull()
  })

  it("takes row order as play order and ignores a Position column", () => {
    // A file whose rows disagree with its own numbering would need a winner
    // picked; the order you can see is the order you meant.
    const parsed = parseCsv("Position,Title\n9,First\n3,Second\n")

    expect(parsed.tracks.map((t) => t.name)).toEqual(["First", "Second"])
  })

  it("skips rows that are not tracks", () => {
    const parsed = parseCsv("Artist,Title\nMira,Peak\n,\n\nNova,Bloom\n")

    expect(parsed.tracks.map((t) => t.name)).toEqual(["Peak", "Bloom"])
  })

  it("throws rather than import a headerless or empty file", () => {
    expect(() => parseCsv("")).toThrow()
    expect(() => parseCsv("Mira,Peak,130\nNova,Bloom,128\n")).toThrow()
    expect(() => parseCsv("Artist,Title\n")).toThrow()
  })
})

describe("isCsvPlaylist", () => {
  it("claims a delimited file with a resolvable title column", () => {
    expect(isCsvPlaylist(OURS)).toBe(true)
    expect(isCsvPlaylist("Artist;Title\nMira;Peak\n")).toBe(true)
  })

  it("does not claim a tab-delimited file — that's the txt reader's format", () => {
    // Two readers racing for the same file is how the first version of this
    // broke the Rekordbox txt import.
    const txt = "#\tTrack Title\tArtist\tBPM\n1\tPeak\tMira\t130\n"

    expect(isCsvPlaylist(txt)).toBe(false)
    expect(parseImport(txt).source).toBe("text")
  })

  it("does not claim a pasted tracklist or an unrelated file", () => {
    expect(isCsvPlaylist("Mira Phase - Peak Freq\nNova Relay - Bloom")).toBe(false)
    expect(isCsvPlaylist("")).toBe(false)
    expect(isCsvPlaylist("just, some, words\nand, more, words")).toBe(false)
  })
})

describe("parseImport routes CSV", () => {
  it("sends a CSV to the CSV parser", () => {
    const parsed = parseImport(OURS)

    expect(parsed.source).toBe("csv")
    expect(parsed.tracks.map((t) => t.name)).toEqual(["Peak Freq", "Intro Bloom"])
  })

  it("still routes the formats that came first", () => {
    expect(parseImport("#EXTM3U\n#EXTINF:250,A - B\n/m/b.mp3\n").source).toBe(
      "m3u8"
    )
  })
})
