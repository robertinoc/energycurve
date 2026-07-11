import { describe, expect, it } from "vitest"

import { isTraktorNml, parseTraktor } from "@/lib/playlists/parse-traktor"

const TRAKTOR_NML = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<NML VERSION="19">
  <HEAD COMPANY="Native Instruments" PROGRAM="Traktor"/>
  <COLLECTION ENTRIES="2">
    <ENTRY MODIFIED_DATE="2024/1/1" TITLE="Intro Bloom" ARTIST="Nova Relay">
      <LOCATION DIR="/:Music/:" FILE="intro.mp3" VOLUME="Macintosh HD"/>
      <INFO GENRE="Deep House" COMMENT="Energy 5" KEY="8A"/>
      <TEMPO BPM="120.000000"/>
    </ENTRY>
    <ENTRY MODIFIED_DATE="2024/1/1" TITLE="Peak Freq" ARTIST="Mira Phase">
      <LOCATION DIR="/:Music/:" FILE="peak.mp3" VOLUME="Macintosh HD"/>
      <INFO GENRE="Techno" COMMENT="Energy 8" KEY="9A" PLAYTIME="317"/>
      <TEMPO BPM="130.000000"/>
    </ENTRY>
  </COLLECTION>
  <PLAYLISTS>
    <NODE TYPE="FOLDER" NAME="$ROOT">
      <SUBNODES COUNT="1">
        <NODE TYPE="PLAYLIST" NAME="Warehouse Set">
          <PLAYLIST ENTRIES="2" TYPE="LIST">
            <ENTRY><PRIMARYKEY TYPE="TRACK" KEY="Macintosh HD/:Music/:peak.mp3"/></ENTRY>
            <ENTRY><PRIMARYKEY TYPE="TRACK" KEY="Macintosh HD/:Music/:intro.mp3"/></ENTRY>
          </PLAYLIST>
        </NODE>
      </SUBNODES>
    </NODE>
  </PLAYLISTS>
</NML>`

describe("isTraktorNml", () => {
  it("recognizes a Traktor export", () => {
    expect(isTraktorNml(TRAKTOR_NML)).toBe(true)
    expect(isTraktorNml("<DJ_PLAYLISTS></DJ_PLAYLISTS>")).toBe(false)
  })
})

describe("parseTraktor", () => {
  it("resolves the playlist by location key, in order", () => {
    const result = parseTraktor(TRAKTOR_NML)

    expect(result.source).toBe("traktor")
    expect(result.playlistName).toBe("Warehouse Set")
    // Playlist order is peak, intro — reverse of collection order.
    expect(result.tracks.map((t) => t.name)).toEqual(["Peak Freq", "Intro Bloom"])
  })

  it("extracts bpm, key, genre, and energy from the comment", () => {
    const result = parseTraktor(TRAKTOR_NML)
    const [peak] = result.tracks

    expect(peak).toMatchObject({
      artist: "Mira Phase",
      bpm: 130,
      key: "9A",
      genre: "Techno",
      energy: 8,
      comment: "Energy 8",
      durationSeconds: 317,
    })
  })

  it("falls back to collection order without a playlist node", () => {
    const noPlaylist = TRAKTOR_NML.replace(
      /<PLAYLISTS>[\s\S]*<\/PLAYLISTS>/,
      "<PLAYLISTS></PLAYLISTS>"
    )
    const result = parseTraktor(noPlaylist)

    expect(result.tracks.map((t) => t.name)).toEqual(["Intro Bloom", "Peak Freq"])
  })

  it("throws on a non-Traktor document", () => {
    expect(() => parseTraktor("<DJ_PLAYLISTS></DJ_PLAYLISTS>")).toThrow()
  })
})

describe("key fallback + loudness (B17/B19)", () => {
  it("falls back to the numeric MUSICAL_KEY when INFO @KEY is absent", () => {
    const xml = `<NML><COLLECTION>
      <ENTRY TITLE="With text key" ARTIST="A"><TEMPO BPM="150"/><INFO KEY="8m"/><MUSICAL_KEY VALUE="22"/></ENTRY>
      <ENTRY TITLE="Numeric only" ARTIST="B"><TEMPO BPM="150"/><MUSICAL_KEY VALUE="4"/></ENTRY>
      <ENTRY TITLE="No key at all" ARTIST="C"><TEMPO BPM="150"/></ENTRY>
    </COLLECTION></NML>`

    const { tracks } = parseTraktor(xml)

    expect(tracks[0].key).toBe("8m") // text wins when present
    expect(tracks[1].key).toBe("5d") // value 4 = E major = Open Key 5d
    expect(tracks[2].key).toBeNull()
  })

  it("extracts PERCEIVED_DB as perceivedDb", () => {
    const xml = `<NML><COLLECTION>
      <ENTRY TITLE="Loud" ARTIST="A"><TEMPO BPM="150"/><INFO PERCEIVED_DB="-0.399780"/></ENTRY>
      <ENTRY TITLE="No db" ARTIST="B"><TEMPO BPM="150"/></ENTRY>
    </COLLECTION></NML>`

    const { tracks } = parseTraktor(xml)

    expect(tracks[0].perceivedDb).toBeCloseTo(-0.4, 1)
    expect(tracks[1].perceivedDb).toBeNull()
  })
})
