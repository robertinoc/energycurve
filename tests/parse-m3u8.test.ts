import { describe, expect, it } from "vitest"

import { isM3u8, parseM3u8 } from "@/lib/playlists/parse-m3u8"

describe("isM3u8", () => {
  it("detects the EXTM3U header and EXTINF lines", () => {
    expect(isM3u8("#EXTM3U\n#EXTINF:1,A - B\n/x.mp3")).toBe(true)
    expect(isM3u8("﻿#EXTM3U")).toBe(true) // tolerates a UTF-8 BOM
    expect(isM3u8("#EXTINF:1,A - B\n/x.mp3")).toBe(true)
  })

  it("rejects non-m3u content", () => {
    expect(isM3u8("Artist - Track\nOther - One")).toBe(false)
    expect(isM3u8("<DJ_PLAYLISTS></DJ_PLAYLISTS>")).toBe(false)
  })
})

describe("parseM3u8", () => {
  it("parses EXTINF label + path into ordered tracks", () => {
    const parsed = parseM3u8(
      [
        "#EXTM3U",
        "#EXTINF:317,Mira Phase - Peak Freq",
        "/Users/dj/Music/peak.mp3",
        "#EXTINF:312,Nova Relay - Intro Bloom",
        "/Users/dj/Music/intro.mp3",
      ].join("\n")
    )

    expect(parsed.source).toBe("m3u8")
    expect(parsed.tracks).toHaveLength(2)
    expect(parsed.tracks[0]).toMatchObject({
      artist: "Mira Phase",
      name: "Peak Freq",
      durationSeconds: 317,
      sourceUri: "/Users/dj/Music/peak.mp3",
      bpm: null,
      key: null,
      genre: null,
    })
    expect(parsed.tracks[1].name).toBe("Intro Bloom")
  })

  it("uses a #PLAYLIST directive as the set name", () => {
    const parsed = parseM3u8(
      "#EXTM3U\n#PLAYLIST:Friday Warmup\n#EXTINF:120,A - B\n/x.mp3"
    )
    expect(parsed.playlistName).toBe("Friday Warmup")
  })

  it("treats a -1 duration as unknown", () => {
    const parsed = parseM3u8("#EXTM3U\n#EXTINF:-1,A - B\n/x.mp3")
    expect(parsed.tracks[0].durationSeconds).toBeNull()
  })

  it("derives artist/title from the filename when there's no EXTINF", () => {
    const parsed = parseM3u8("#EXTM3U\n/Users/dj/Music/Mira%20Phase%20-%20Peak%20Freq.mp3")
    expect(parsed.tracks[0]).toMatchObject({
      artist: "Mira Phase",
      name: "Peak Freq",
    })
  })

  it("keeps a title-only entry when the label has no ' - '", () => {
    const parsed = parseM3u8("#EXTM3U\n#EXTINF:100,Just A Title\n/x.mp3")
    expect(parsed.tracks[0]).toMatchObject({ artist: "", name: "Just A Title" })
  })

  it("throws when there are no track lines", () => {
    expect(() => parseM3u8("#EXTM3U\n")).toThrow()
  })
})

/**
 * An alpha user uploaded an m3u8 and reported that it read "not a single tag,
 * not even the duration". Two separate things were true: the format genuinely
 * carries almost nothing (which the product now says out loud — see
 * import-coverage.ts), and the #EXTINF matcher was stricter than what tools
 * actually write.
 */
describe("real-world #EXTINF variants", () => {
  it("reads a duration written with spaces around it", () => {
    const parsed = parseM3u8(
      "#EXTM3U\n#EXTINF: 250 ,Mira Phase - Peak Freq\n/Music/peak.mp3\n"
    )

    expect(parsed.tracks[0]).toMatchObject({
      artist: "Mira Phase",
      name: "Peak Freq",
      durationSeconds: 250,
    })
  })

  it("reads a duration from an entry with an attribute list", () => {
    const parsed = parseM3u8(
      '#EXTM3U\n#EXTINF:250 tvg-id="x" group-title="Set",Mira Phase - Peak Freq\n/Music/peak.mp3\n'
    )

    expect(parsed.tracks[0].durationSeconds).toBe(250)
    expect(parsed.tracks[0].name).toBe("Peak Freq")
  })

  it("reads a duration from an entry with no label at all", () => {
    const parsed = parseM3u8("#EXTM3U\n#EXTINF:250\n/Music/peak.mp3\n")

    expect(parsed.tracks[0]).toMatchObject({
      name: "peak",
      durationSeconds: 250,
    })
  })

  it("reads VirtualDJ's tagged artist and title over the filename", () => {
    const parsed = parseM3u8(
      "#EXTM3U\n#EXTINF:250,whatever\n#EXTVDJ:<artist>Mira Phase</artist><title>Peak Freq</title>\n/Music/01 track.mp3\n"
    )

    expect(parsed.tracks[0]).toMatchObject({
      artist: "Mira Phase",
      name: "Peak Freq",
      durationSeconds: 250,
    })
  })

  it("reads an #EXTART artist line", () => {
    const parsed = parseM3u8(
      "#EXTM3U\n#EXTINF:250,Peak Freq\n#EXTART:Mira Phase\n/Music/peak.mp3\n"
    )

    expect(parsed.tracks[0]).toMatchObject({
      artist: "Mira Phase",
      name: "Peak Freq",
    })
  })

  it("does not leak one entry's directives onto the next", () => {
    const parsed = parseM3u8(
      "#EXTM3U\n#EXTINF:250,A - One\n/Music/one.mp3\n/Music/two.mp3\n"
    )

    expect(parsed.tracks[1]).toMatchObject({
      artist: "",
      name: "two",
      durationSeconds: null,
    })
  })

  it("ignores an #EXTALB line rather than treating it as a path", () => {
    const parsed = parseM3u8(
      "#EXTM3U\n#EXTALB:Warehouse Vol 3\n#EXTINF:250,A - One\n/Music/one.mp3\n"
    )

    expect(parsed.tracks).toHaveLength(1)
    expect(parsed.tracks[0].sourceUri).toBe("/Music/one.mp3")
  })

  it("still handles a plain path list with no directives", () => {
    // The likely shape of the file that started this: no #EXTINF anywhere, so
    // there is no duration to read and the names come from the filenames.
    const parsed = parseM3u8(
      "#EXTM3U\n/Music/Mira Phase - Peak Freq.mp3\n/Music/Nova Relay - Intro Bloom.mp3\n"
    )

    expect(parsed.tracks).toHaveLength(2)
    expect(parsed.tracks[0]).toMatchObject({
      artist: "Mira Phase",
      name: "Peak Freq",
      durationSeconds: null,
    })
  })
})
