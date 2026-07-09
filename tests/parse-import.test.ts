import { describe, expect, it } from "vitest"

import {
  detectGenres,
  mapGenreTag,
  parseImport,
  UnsupportedImportError,
} from "@/lib/playlists/parse-import"
import type { ImportedTrack } from "@/lib/playlists/imported-track"

function track(genre: string | null): ImportedTrack {
  return {
    artist: "A",
    name: "N",
    bpm: 120,
    key: null,
    genre,
    energy: null,
    sourceUri: null,
    comment: null,
    durationSeconds: null,
  }
}

describe("parseImport format detection", () => {
  it("routes Rekordbox XML to the Rekordbox parser", () => {
    const result = parseImport(
      '<DJ_PLAYLISTS><COLLECTION><TRACK TrackID="1" Name="X" Artist="Y" AverageBpm="120"/></COLLECTION></DJ_PLAYLISTS>'
    )
    expect(result.source).toBe("rekordbox")
    expect(result.tracks).toHaveLength(1)
  })

  it("routes Traktor NML to the Traktor parser", () => {
    const result = parseImport(
      '<NML><COLLECTION><ENTRY TITLE="X" ARTIST="Y"><TEMPO BPM="120"/></ENTRY></COLLECTION></NML>'
    )
    expect(result.source).toBe("traktor")
    expect(result.tracks).toHaveLength(1)
  })

  it("throws UnsupportedImportError for unknown formats", () => {
    expect(() => parseImport("artist - track\nanother - one")).toThrow(
      UnsupportedImportError
    )
  })
})

describe("mapGenreTag", () => {
  it("maps canonical names and labels (case/spacing insensitive)", () => {
    expect(mapGenreTag("Deep House")).toBe("deep-house")
    expect(mapGenreTag("deep house")).toBe("deep-house")
    expect(mapGenreTag("deep-house")).toBe("deep-house")
    expect(mapGenreTag("TECHNO")).toBe("techno")
  })

  it("maps common aliases", () => {
    expect(mapGenreTag("Progressive House")).toBe("progressive")
    expect(mapGenreTag("Psytrance")).toBe("psy-trance")
    expect(mapGenreTag("Afro House")).toBe("organic-house")
  })

  it("returns null for unknown or empty tags", () => {
    expect(mapGenreTag("Reggaeton")).toBeNull()
    expect(mapGenreTag(null)).toBeNull()
    expect(mapGenreTag("")).toBeNull()
  })
})

describe("detectGenres", () => {
  it("returns the dominant genre and a share breakdown", () => {
    const { dominant, breakdown } = detectGenres([
      track("Deep House"),
      track("Deep House"),
      track("Techno"),
      track("Reggaeton"), // unmapped → ignored
    ])

    expect(dominant).toBe("deep-house")
    // 2 deep-house + 1 techno = 3 mapped; reggaeton excluded from totals.
    expect(breakdown).toEqual([
      { genre: "deep-house", count: 2, share: 67 },
      { genre: "techno", count: 1, share: 33 },
    ])
  })

  it("returns null dominant when no tags map", () => {
    expect(detectGenres([track("Reggaeton"), track(null)])).toEqual({
      dominant: null,
      breakdown: [],
    })
  })
})
