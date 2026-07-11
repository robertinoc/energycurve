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
