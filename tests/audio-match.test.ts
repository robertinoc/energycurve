import { describe, expect, it } from "vitest"

import {
  matchAudioToTracks,
  normalizeForMatch,
  type MatchCandidate,
  type MatchTarget,
} from "@/lib/playlists/audio-match"

const track = (
  position: number,
  artist: string,
  name: string,
  hasBpm = false
): MatchTarget => ({ id: `t${position}`, position, artist, name, hasBpm })

const file = (key: string, artist: string, title: string): MatchCandidate => ({
  key,
  artist,
  title,
})

describe("normalizeForMatch", () => {
  it("folds accents, because one person typed both sides", () => {
    expect(normalizeForMatch("Sué Aquí")).toBe(normalizeForMatch("Sue Aqui"))
  })

  it("ignores punctuation and casing", () => {
    expect(normalizeForMatch("Don't Stop!")).toBe(normalizeForMatch("dont stop"))
  })

  it("treats a curly apostrophe like a straight one", () => {
    // iTunes writes ’, most other things write '. Same track.
    expect(normalizeForMatch("Don’t Stop")).toBe(normalizeForMatch("Don't Stop"))
  })

  it("drops a leading track number", () => {
    // "03 - Artist - Title" is how half of all folders look.
    expect(normalizeForMatch("03 - Emergency")).toBe("emergency")
    expect(normalizeForMatch("7. Pressure")).toBe("pressure")
  })

  it("drops the noise that isn't part of a title", () => {
    expect(normalizeForMatch("Emergency (Original Mix)")).toBe("emergency")
    expect(normalizeForMatch("Pressure [Free Download]")).toBe("pressure")
  })

  it("keeps the words that change which recording this is", () => {
    // A remix is not the original, and a collaboration is not a solo track.
    // Folding these would match a track to the wrong version of itself.
    expect(normalizeForMatch("Emergency (Boris Brejcha Remix)")).not.toBe(
      normalizeForMatch("Emergency")
    )
    expect(normalizeForMatch("Pressure feat. LEGZDINA")).not.toBe(
      normalizeForMatch("Pressure")
    )
  })
})

describe("matchAudioToTracks", () => {
  it("matches on artist and title", () => {
    const result = matchAudioToTracks(
      [track(1, "T78", "Emergency")],
      [file("a.wav", "T78", "Emergency")]
    )

    expect(result.matched).toHaveLength(1)
    expect(result.matched[0].reason).toBe("artist_and_title")
    expect(result.unmatchedTracks).toEqual([])
  })

  it("matches through the usual tag differences", () => {
    const result = matchAudioToTracks(
      [track(1, "T78", "Emergency")],
      [file("a.wav", "t78", "03 - Emergency (Original Mix)")]
    )

    expect(result.matched).toHaveLength(1)
  })

  it("falls back to title alone when only one file has it", () => {
    // The very common case: the tag credits both artists, the playlist names one.
    const result = matchAudioToTracks(
      [track(1, "T78", "Emergency")],
      [file("a.wav", "T78, Van Giessen", "Emergency")]
    )

    expect(result.matched[0].reason).toBe("title_only")
  })

  it("refuses to guess when two files share a title", () => {
    // The case where guessing does the most damage, and the one a person can
    // resolve by looking.
    const result = matchAudioToTracks(
      [track(1, "Someone", "Pressure")],
      [file("a.wav", "Sara Landry", "Pressure"), file("b.wav", "Other", "Pressure")]
    )

    expect(result.matched).toEqual([])
    expect(result.ambiguous).toHaveLength(1)
    expect(result.ambiguous[0].candidates).toHaveLength(2)
  })

  it("leaves a track with no file untouched", () => {
    const result = matchAudioToTracks(
      [track(1, "T78", "Emergency"), track(2, "Nobody", "Missing")],
      [file("a.wav", "T78", "Emergency")]
    )

    expect(result.matched).toHaveLength(1)
    expect(result.unmatchedTracks.map((t) => t.name)).toEqual(["Missing"])
  })

  it("gives one file to at most one track", () => {
    // Two tracks that normalise the same can't both claim the same file; the
    // second becomes ambiguous rather than a silent duplicate write.
    const result = matchAudioToTracks(
      [track(1, "T78", "Emergency"), track(2, "T78", "Emergency (Original Mix)")],
      [file("a.wav", "T78", "Emergency")]
    )

    expect(result.matched).toHaveLength(1)
    expect(result.matched[0].target.position).toBe(1)
    expect(result.unmatchedTracks).toHaveLength(1)
  })

  it("reports the files it didn't use", () => {
    // So a DJ who picked the wrong folder sees that nothing landed, instead of a
    // silent no-op.
    const result = matchAudioToTracks(
      [track(1, "T78", "Emergency")],
      [file("a.wav", "T78", "Emergency"), file("b.wav", "Someone", "Else")]
    )

    expect(result.unusedFiles.map((f) => f.key)).toEqual(["b.wav"])
  })

  it("never matches a file whose title normalises to nothing", () => {
    // A file called "01 - .wav" would otherwise match every untitled track.
    const result = matchAudioToTracks(
      [track(1, "A", "B")],
      [file("junk.wav", "", "  ")]
    )

    expect(result.matched).toEqual([])
    expect(result.unmatchedTracks).toHaveLength(1)
  })

  it("degrades on empty input instead of throwing", () => {
    expect(matchAudioToTracks([], []).matched).toEqual([])
    expect(matchAudioToTracks([track(1, "A", "B")], []).unmatchedTracks).toHaveLength(1)
  })
})

/**
 * Enriching an M3U8 import.
 *
 * An M3U8 carries a path and a duration, so the artist and title on those
 * tracks were *guessed from the filename* — matching a guess against a real tag
 * is the weakest key there is, while the path the guess came from is the
 * strongest. This pass is what makes "import an m3u8, then add the files"
 * actually work.
 */
describe("matching by file path", () => {
  const target = (overrides: Partial<MatchTarget> = {}): MatchTarget => ({
    id: "t1",
    artist: "",
    name: "01 track",
    position: 1,
    hasBpm: false,
    ...overrides,
  })

  it("pairs a track to the file it was imported from, tags notwithstanding", () => {
    const result = matchAudioToTracks(
      [target({ sourceUri: "/Users/dj/Music/peak.mp3" })],
      [
        {
          key: "0-peak.mp3",
          artist: "Mira Phase",
          title: "Peak Freq",
          path: "peak.mp3",
        },
      ]
    )

    expect(result.matched).toHaveLength(1)
    expect(result.matched[0].reason).toBe("file_path")
    expect(result.unmatchedTracks).toHaveLength(0)
  })

  it("decodes percent-encoded paths and folds case", () => {
    const result = matchAudioToTracks(
      [target({ sourceUri: "file:///Users/dj/Music/Peak%20Freq.mp3" })],
      [{ key: "0", artist: "", title: "", path: "Sets/peak freq.MP3" }]
    )

    expect(result.matched[0]?.reason).toBe("file_path")
  })

  it("beats a competing artist+title match on a different file", () => {
    const result = matchAudioToTracks(
      [target({ artist: "Mira Phase", name: "Peak Freq", sourceUri: "/m/a.mp3" })],
      [
        { key: "0", artist: "Other", title: "Other", path: "a.mp3" },
        { key: "1", artist: "Mira Phase", title: "Peak Freq", path: "b.mp3" },
      ]
    )

    expect(result.matched[0].candidate.key).toBe("0")
    expect(result.matched[0].reason).toBe("file_path")
  })

  it("reports two same-named files in different folders as ambiguous", () => {
    const result = matchAudioToTracks(
      [target({ sourceUri: "/m/peak.mp3" })],
      [
        { key: "0", artist: "", title: "", path: "2023/peak.mp3" },
        { key: "1", artist: "", title: "", path: "2024/peak.mp3" },
      ]
    )

    expect(result.matched).toHaveLength(0)
    expect(result.ambiguous).toHaveLength(1)
    expect(result.ambiguous[0].candidates).toHaveLength(2)
  })

  it("falls back to the title passes when the paths don't line up", () => {
    const result = matchAudioToTracks(
      [target({ artist: "Mira Phase", name: "Peak Freq", sourceUri: "/m/gone.mp3" })],
      [{ key: "0", artist: "Mira Phase", title: "Peak Freq", path: "renamed.mp3" }]
    )

    expect(result.matched[0].reason).toBe("artist_and_title")
  })

  it("changes nothing for tracks with no imported path", () => {
    const result = matchAudioToTracks(
      [target({ artist: "Mira Phase", name: "Peak Freq" })],
      [{ key: "0", artist: "Mira Phase", title: "Peak Freq", path: "x.mp3" }]
    )

    expect(result.matched[0].reason).toBe("artist_and_title")
  })
})
