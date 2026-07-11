import { describe, expect, it } from "vitest"

import {
  isRekordboxTxt,
  parseRekordboxTxt,
} from "@/lib/playlists/parse-rekordbox-txt"

const HEADER = "#\tTrack Title\tArtist\tBPM\tTime\tKey\tGenre"

describe("isRekordboxTxt", () => {
  it("detects a tab-separated header with Artist + title columns", () => {
    expect(isRekordboxTxt(`${HEADER}\n1\tX\tY\t120\t3:00\t8A\tHouse`)).toBe(true)
  })

  it("rejects a plain 'Artist - Track' paste (no tab header)", () => {
    expect(isRekordboxTxt("Artist - Track\nOther - One")).toBe(false)
  })

  it("rejects a tab file without the required columns", () => {
    expect(isRekordboxTxt("Foo\tBar\tBaz\n1\t2\t3")).toBe(false)
  })
})

describe("parseRekordboxTxt", () => {
  it("resolves fields by header, parsing BPM, key, genre, and m:ss time", () => {
    const parsed = parseRekordboxTxt(
      [
        HEADER,
        "1\tPeak Freq\tMira Phase\t130.00\t5:17\t9A\tHard Techno",
        "2\tIntro Bloom\tNova Relay\t120\t5:12\t8A\tDeep House",
      ].join("\r\n")
    )

    expect(parsed.source).toBe("text")
    expect(parsed.playlistName).toBeNull()
    expect(parsed.tracks).toHaveLength(2)
    expect(parsed.tracks[0]).toMatchObject({
      artist: "Mira Phase",
      name: "Peak Freq",
      bpm: 130,
      key: "9A",
      genre: "Hard Techno",
      durationSeconds: 317,
      sourceUri: null,
    })
  })

  it("tolerates reordered columns and extra fields via header matching", () => {
    const parsed = parseRekordboxTxt(
      ["Artist\tTrack Title\tGenre\tBPM", "Y\tX\tTechno\t128"].join("\n")
    )
    expect(parsed.tracks[0]).toMatchObject({
      artist: "Y",
      name: "X",
      genre: "Techno",
      bpm: 128,
    })
  })

  it("reads a Mixed In Key energy token from a Comments column", () => {
    const parsed = parseRekordboxTxt(
      ["Track Title\tArtist\tComments", "X\tY\t9A - Energy 7"].join("\n")
    )
    expect(parsed.tracks[0].energy).toBe(7)
    expect(parsed.tracks[0].comment).toBe("9A - Energy 7")
  })

  it("skips rows with neither artist nor title", () => {
    const parsed = parseRekordboxTxt(
      [HEADER, "1\t\t\t\t\t\t", "2\tReal\tName\t120\t3:00\t8A\tHouse"].join("\n")
    )
    expect(parsed.tracks).toHaveLength(1)
    expect(parsed.tracks[0].name).toBe("Real")
  })

  it("throws when there are no data rows", () => {
    expect(() => parseRekordboxTxt(HEADER)).toThrow()
  })
})
