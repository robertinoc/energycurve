import { describe, expect, it } from "vitest"

import {
  detectGenres,
  mapGenreTag,
  parseImport,
  UnsupportedImportError,
} from "@/lib/playlists/parse-import"
import type { ImportedTrack } from "@/lib/playlists/imported-track"

function track(genre: string | null, bpm: number | null = 120): ImportedTrack {
  return {
    artist: "A",
    name: "N",
    bpm,
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

  it("routes an M3U8 playlist to the m3u8 parser", () => {
    const result = parseImport("#EXTM3U\n#EXTINF:200,Y - X\n/Music/x.mp3\n")
    expect(result.source).toBe("m3u8")
    expect(result.tracks).toHaveLength(1)
  })

  it("routes a Rekordbox tab-separated txt to the txt parser", () => {
    const result = parseImport("#\tTrack Title\tArtist\tBPM\n1\tX\tY\t120\n")
    expect(result.source).toBe("text")
    expect(result.tracks).toHaveLength(1)
  })

  it("throws UnsupportedImportError for unknown formats", () => {
    // A plain "artist - track" paste has no tab header and no EXTM3U marker.
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

  it("maps compound tags by containment, longest token first (B15)", () => {
    expect(mapGenreTag("Techno (Peak Time / Driving)")).toBe("techno")
    expect(mapGenreTag("Techno (Raw / Deep / Hypnotic)")).toBe("techno")
    expect(mapGenreTag("Hard Techno Industrial")).toBe("hard-techno")
    expect(mapGenreTag("Progressive Psy-Trance")).toBe("psy-trance")
    expect(mapGenreTag("Uplifting Trance 138")).toBe("trance")
  })

  it("returns null for unknown or empty tags", () => {
    expect(mapGenreTag("Reggaeton")).toBeNull()
    expect(mapGenreTag(null)).toBeNull()
    expect(mapGenreTag("")).toBeNull()
  })
})

describe("detectGenres", () => {
  it("returns the dominant genre and a vote/BPM breakdown", () => {
    const { dominant, breakdown } = detectGenres([
      track("Deep House", 120),
      track("Deep House", 122),
      track("Techno", 121),
      track("Reggaeton", 120), // unmapped → ignored for votes
    ])

    expect(dominant).toBe("deep-house")

    const deepHouse = breakdown.find((entry) => entry.genre === "deep-house")
    const techno = breakdown.find((entry) => entry.genre === "techno")

    // 2 deep-house + 1 techno = 3 mapped votes; reggaeton excluded.
    expect(deepHouse).toMatchObject({ count: 2, share: 67 })
    expect(techno).toMatchObject({ count: 1, share: 33 })
    expect(deepHouse!.score).toBeGreaterThan(techno!.score)
  })

  it("lets the BPM prior overrule mislabeled tags (B15)", () => {
    // Every track tagged plain "Techno", but the set lives at 155–160 BPM —
    // that's hard techno territory, and techno's band fits none of it.
    const tracks = [155, 156, 158, 160, 160, 157, 159, 160, 155, 158].map(
      (bpm) => track("Techno (Peak Time / Driving)", bpm)
    )

    const { dominant, breakdown } = detectGenres(tracks)

    expect(dominant).toBe("hard-techno")

    const hardTechno = breakdown.find((entry) => entry.genre === "hard-techno")
    expect(hardTechno?.bpmFit).toBe(1)
  })

  it("guesses from BPM alone when no tags map", () => {
    const { dominant } = detectGenres([
      track("Reggaeton", 157),
      track(null, 158),
      track(null, 160),
    ])

    expect(dominant).toBe("hard-techno")
  })

  it("returns null when there are neither mappable tags nor BPMs", () => {
    expect(detectGenres([track("Reggaeton", null), track(null, null)])).toEqual(
      {
        dominant: null,
        breakdown: [],
      }
    )
  })

  it("keeps trusting tags when the BPMs agree with them", () => {
    const { dominant } = detectGenres([
      track("Techno", 130),
      track("Techno", 133),
      track("Techno", 138),
    ])

    expect(dominant).toBe("techno")
  })
})
