import { describe, expect, it } from "vitest"

import { parseTracklist } from "@/lib/playlists/parse-tracklist"

describe("parseTracklist", () => {
  it("parses artist-track lines", () => {
    const { tracks, errors } = parseTracklist(
      "Bicep - Glue\nOvermono - So U Kno",
      "artist-track"
    )

    expect(errors).toHaveLength(0)
    expect(tracks).toEqual([
      { artist: "Bicep", name: "Glue", bpm: null, sourceLine: 1 },
      { artist: "Overmono", name: "So U Kno", bpm: null, sourceLine: 2 },
    ])
  })

  it("parses track-artist lines by swapping the fields", () => {
    const { tracks } = parseTracklist("Glue - Bicep", "track-artist")

    expect(tracks).toEqual([
      { artist: "Bicep", name: "Glue", bpm: null, sourceLine: 1 },
    ])
  })

  it("supports en dash and em dash separators", () => {
    const { tracks, errors } = parseTracklist(
      "Bicep – Glue\nOvermono — So U Kno",
      "artist-track"
    )

    expect(errors).toHaveLength(0)
    expect(tracks[0]).toMatchObject({ artist: "Bicep", name: "Glue" })
    expect(tracks[1]).toMatchObject({ artist: "Overmono", name: "So U Kno" })
  })

  it("keeps extra hyphens in the second field", () => {
    const { tracks } = parseTracklist(
      "Four Tet - Baby Again - VIP Mix",
      "artist-track"
    )

    expect(tracks[0]).toMatchObject({
      artist: "Four Tet",
      name: "Baby Again - VIP Mix",
    })
  })

  it("strips numbering prefixes with dot and parenthesis", () => {
    const { tracks } = parseTracklist(
      "01. Bicep - Glue\n2) Overmono - So U Kno",
      "artist-track"
    )

    expect(tracks[0]).toMatchObject({ artist: "Bicep", name: "Glue" })
    expect(tracks[1]).toMatchObject({ artist: "Overmono", name: "So U Kno" })
  })

  it("strips dash-style numbering only when a separator remains", () => {
    const { tracks } = parseTracklist(
      "1 - Bicep - Glue\n22 - Bad Romance",
      "artist-track"
    )

    expect(tracks[0]).toMatchObject({ artist: "Bicep", name: "Glue" })
    // "22 - Bad Romance" has no second separator, so 22 is the artist.
    expect(tracks[1]).toMatchObject({ artist: "22", name: "Bad Romance" })
  })

  it("extracts trailing BPM suffixes in several shapes", () => {
    const { tracks } = parseTracklist(
      [
        "Bicep - Glue 128 bpm",
        "Overmono - So U Kno (132.5 BPM)",
        "Fred again.. - Delilah [126,25bpm]",
      ].join("\n"),
      "artist-track"
    )

    expect(tracks[0]).toMatchObject({ name: "Glue", bpm: 128 })
    expect(tracks[1]).toMatchObject({ name: "So U Kno", bpm: 132.5 })
    expect(tracks[2]).toMatchObject({ name: "Delilah", bpm: 126.25 })
  })

  it("does not treat bare trailing numbers as BPM", () => {
    const { tracks } = parseTracklist("Underworld - Rez 88", "artist-track")

    expect(tracks[0]).toMatchObject({ name: "Rez 88", bpm: null })
  })

  it("skips blank lines and collapses whitespace", () => {
    const { tracks, errors } = parseTracklist(
      "\n  Bicep   -   Glue  \n\n\t\n",
      "artist-track"
    )

    expect(errors).toHaveLength(0)
    expect(tracks).toEqual([
      { artist: "Bicep", name: "Glue", bpm: null, sourceLine: 2 },
    ])
  })

  it("reports lines without a separator with their line number", () => {
    const { tracks, errors } = parseTracklist(
      "Bicep - Glue\njust some words\nOvermono - So U Kno",
      "artist-track"
    )

    expect(tracks).toHaveLength(2)
    expect(errors).toEqual([
      {
        line: 2,
        content: "just some words",
        reason: "missing_separator",
      },
    ])
  })

  it("reports lines with an empty side of the separator", () => {
    const { errors } = parseTracklist("Bicep - Glue - ", "artist-track")

    // "Bicep - Glue - " → first split leaves "Glue -" as second field, still
    // non-empty; a truly empty side like " - Glue" is the error case.
    const result = parseTracklist(" - Glue", "artist-track")
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].reason).toBe("missing_separator")
    expect(errors).toHaveLength(0)
  })

  it("returns empty results for empty input", () => {
    const { tracks, errors } = parseTracklist("", "artist-track")

    expect(tracks).toHaveLength(0)
    expect(errors).toHaveLength(0)
  })
})
