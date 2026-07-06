import { describe, expect, it } from "vitest"

import { isRekordboxXml, parseRekordbox } from "@/lib/playlists/parse-rekordbox"

const REKORDBOX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="rekordbox" Version="6.0.0" Company="AlphaTheta"/>
  <COLLECTION Entries="3">
    <TRACK TrackID="1" Name="Intro Bloom" Artist="Nova Relay" Genre="Deep House" AverageBpm="120.00" Tonality="8A" Rating="102" Comments="8A - Energy 5"/>
    <TRACK TrackID="2" Name="Peak Freq" Artist="Mira Phase" Genre="Techno" AverageBpm="130.00" Tonality="9A" Rating="204" Comments="9A - Energy 8"/>
    <TRACK TrackID="3" Name="Cyan After" Artist="Night Logic" Genre="Progressive" AverageBpm="128.00" Tonality="10A" Comments=""/>
  </COLLECTION>
  <PLAYLISTS>
    <NODE Type="0" Name="ROOT" Count="1">
      <NODE Name="Warehouse Set" Type="1" KeyType="0" Entries="3">
        <TRACK Key="2"/>
        <TRACK Key="1"/>
        <TRACK Key="3"/>
      </NODE>
    </NODE>
  </PLAYLISTS>
</DJ_PLAYLISTS>`

describe("isRekordboxXml", () => {
  it("recognizes a Rekordbox export", () => {
    expect(isRekordboxXml(REKORDBOX_XML)).toBe(true)
    expect(isRekordboxXml("<NML></NML>")).toBe(false)
  })
})

describe("parseRekordbox", () => {
  it("resolves the playlist node in order (not collection order)", () => {
    const result = parseRekordbox(REKORDBOX_XML)

    expect(result.source).toBe("rekordbox")
    expect(result.playlistName).toBe("Warehouse Set")
    // Playlist order is 2, 1, 3 — not the collection's 1, 2, 3.
    expect(result.tracks.map((t) => t.name)).toEqual([
      "Peak Freq",
      "Intro Bloom",
      "Cyan After",
    ])
  })

  it("extracts bpm, key, genre, and Mixed In Key energy", () => {
    const result = parseRekordbox(REKORDBOX_XML)
    const [peak, intro, cyan] = result.tracks

    expect(peak).toMatchObject({
      artist: "Mira Phase",
      bpm: 130,
      key: "9A",
      genre: "Techno",
      energy: 8,
    })
    expect(intro.energy).toBe(5)
    // No "Energy N" in comments → null energy, but other fields present.
    expect(cyan.energy).toBeNull()
    expect(cyan.bpm).toBe(128)
  })

  it("falls back to collection order when there is no playlist node", () => {
    const noPlaylist = REKORDBOX_XML.replace(
      /<PLAYLISTS>[\s\S]*<\/PLAYLISTS>/,
      "<PLAYLISTS><NODE Type=\"0\" Name=\"ROOT\" Count=\"0\"/></PLAYLISTS>"
    )
    const result = parseRekordbox(noPlaylist)

    expect(result.playlistName).toBeNull()
    expect(result.tracks.map((t) => t.name)).toEqual([
      "Intro Bloom",
      "Peak Freq",
      "Cyan After",
    ])
  })

  it("throws on a non-Rekordbox document", () => {
    expect(() => parseRekordbox("<NML></NML>")).toThrow()
  })

  it("throws when there are no tracks", () => {
    expect(() =>
      parseRekordbox(
        '<DJ_PLAYLISTS><COLLECTION Entries="0"></COLLECTION></DJ_PLAYLISTS>'
      )
    ).toThrow()
  })
})
