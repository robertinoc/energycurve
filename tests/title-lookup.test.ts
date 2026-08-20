import { describe, expect, it } from "vitest"

import {
  buildLookupQuery,
  chooseLookupMatch,
  parseLookupSong,
  type LookupResult,
} from "@/lib/audio/title-lookup"
import { normalizeForMatch } from "@/lib/playlists/audio-match"

const result = (
  artist: string,
  title: string,
  bpm: number | null = 128
): LookupResult => ({
  bpm,
  musicalKey: "Am",
  matchedArtist: artist,
  matchedTitle: title,
})

describe("parseLookupSong", () => {
  it("reads a normal entry", () => {
    expect(
      parseLookupSong({
        title: "Emergency",
        artist: { name: "T78" },
        tempo: "128",
        key_of: "Am",
      })
    ).toEqual({
      bpm: 128,
      musicalKey: "Am",
      matchedArtist: "T78",
      matchedTitle: "Emergency",
    })
  })

  it("accepts a numeric tempo as well as a string one", () => {
    // Their responses use both, depending on the endpoint.
    expect(parseLookupSong({ title: "x", tempo: 140 })?.bpm).toBe(140)
  })

  it("drops a tempo that can't be a track", () => {
    // Their corpus is crowd-contributed: 0 and three-digit durations-in-seconds
    // both appear. A wrong BPM reshapes the curve and looks like data.
    for (const tempo of [0, 12, 400, "nonsense"]) {
      expect(parseLookupSong({ title: "x", tempo, key_of: "Am" })?.bpm).toBeNull()
    }
  })

  it("keeps the key when only the tempo is unusable", () => {
    // Half an answer is still an answer — the key is what harmonic mixing needs.
    const parsed = parseLookupSong({ title: "x", tempo: 0, key_of: "F#m" })

    expect(parsed?.bpm).toBeNull()
    expect(parsed?.musicalKey).toBe("F#m")
  })

  it("returns null when the entry carries neither", () => {
    // Same outcome as no match. Reporting it as a match would say we found
    // something useful when we didn't.
    expect(parseLookupSong({ title: "x", tempo: 0, key_of: "" })).toBeNull()
  })

  it("returns null with no title", () => {
    expect(parseLookupSong({ tempo: "128", key_of: "Am" })).toBeNull()
  })

  it("survives a malformed artist field", () => {
    // Seen in the wild as a bare string instead of an object.
    expect(
      parseLookupSong({ title: "x", artist: "T78", tempo: "128" })?.matchedArtist
    ).toBe("")
  })
})

describe("chooseLookupMatch", () => {
  const pick = (candidates: LookupResult[]) =>
    chooseLookupMatch("T78", "Emergency", candidates, normalizeForMatch)

  it("takes a single artist-and-title match", () => {
    expect(pick([result("T78", "Emergency")])?.matchedTitle).toBe("Emergency")
  })

  it("matches through the usual differences", () => {
    expect(pick([result("t78", "Emergency (Original Mix)")])).not.toBeNull()
  })

  it("falls back to title alone when only one entry has it", () => {
    // Their artist strings routinely credit collaborators the playlist doesn't.
    expect(pick([result("T78, Van Giessen", "Emergency")])).not.toBeNull()
  })

  it("refuses a tie rather than trusting their ranking", () => {
    // Two entries that both look right is exactly where guessing does damage, and
    // their result order is not ours to trust.
    expect(
      pick([result("T78", "Emergency", 128), result("T78", "Emergency", 140)])
    ).toBeNull()
  })

  it("refuses two entries sharing the title", () => {
    expect(
      pick([result("Someone", "Emergency"), result("Else", "Emergency")])
    ).toBeNull()
  })

  it("returns null when nothing matches", () => {
    expect(pick([result("Nobody", "Different")])).toBeNull()
    expect(pick([])).toBeNull()
  })
})

describe("buildLookupQuery", () => {
  it("builds their two-field query", () => {
    expect(buildLookupQuery("T78", "Emergency")).toBe(
      "artist:T78 track:Emergency"
    )
  })

  it("strips the characters that break their parser", () => {
    // A colon inside a field returns nothing at all, which reads as "not in their
    // database" when it isn't.
    expect(buildLookupQuery("A, B", "Title: Reprise")).toBe(
      "artist:A B track:Title Reprise"
    )
  })

  it("searches by title alone when there is no artist", () => {
    expect(buildLookupQuery("", "Emergency")).toBe("track:Emergency")
  })

  it("refuses to search with no title", () => {
    // A bare artist query returns their whole catalogue for that artist, and
    // picking from it would be guessing.
    expect(buildLookupQuery("T78", "  ")).toBeNull()
  })
})
